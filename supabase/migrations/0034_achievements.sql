-- Logros.
--
-- El catálogo (nombre, descripción, umbral) vive en TypeScript, igual que los
-- escalones de racha: añadir un logro tiene que ser editar un archivo, no
-- escribir una migración. Aquí va solo lo que la base de datos sabe hacer
-- mejor: contar sobre todo el historial, y recordar cuándo se desbloqueó cada
-- uno.

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users on delete cascade,
  -- El slug lo define la app. Sin clave foránea a propósito: si algún día se
  -- retira un logro del catálogo, la fila se queda como recuerdo en vez de
  -- impedir el borrado o desaparecer sin avisar.
  slug text not null,
  unlocked_at timestamptz not null default now(),

  primary key (user_id, slug)
);

alter table public.user_achievements enable row level security;

drop policy if exists "Cada usuario ve sus logros" on public.user_achievements;
create policy "Cada usuario ve sus logros"
  on public.user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists "Cada usuario desbloquea los suyos" on public.user_achievements;
create policy "Cada usuario desbloquea los suyos"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- Sin update ni delete: un logro conseguido no se edita ni se retira. Que no
-- exista la política es la forma de decirlo.

/**
 * Todas las métricas de un usuario en una sola fila.
 *
 * Una función y no doce porque la pantalla las necesita todas a la vez: doce
 * consultas para pintar una rejilla sería absurdo. Es `stable`, así que
 * Postgres puede reutilizar el resultado dentro de la misma sentencia.
 */
create or replace function public.achievement_metrics(p_user_id uuid)
returns table (
  sessions_finished bigint,
  total_sets bigint,
  total_volume_kg numeric,
  distinct_exercises bigint,
  distinct_muscle_groups bigint,
  max_weight_kg numeric,
  weight_entries bigint,
  shared_workouts bigint,
  early_sessions bigint,
  late_sessions bigint,
  weekend_sessions bigint,
  long_sessions bigint,
  cycle_laps bigint
)
language sql
stable
as $$
  with sesiones as (
    select s.id, s.started_at, s.finished_at
    from public.workout_sessions s
    where s.user_id = p_user_id
      and s.finished_at is not null
  ),
  series as (
    select ss.exercise_id, ss.weight_kg, ss.reps
    from sesiones se
    join public.session_sets ss on ss.session_id = se.id
  ),
  -- Vueltas completas al ciclo: cuántos planes terminados tiene cada ciclo
  -- dividido entre sus sesiones. Con un ciclo de 4 y 9 planes hechos son dos
  -- vueltas, no nueve: lo que se premia es haber cerrado la rotación entera.
  vueltas as (
    select floor(count(p.id)::numeric / nullif(jsonb_array_length(w.cycle), 0)) as laps
    from public.weekly_splits w
    join public.workout_plans p
      on p.cycle_id = w.id and p.completed_at is not null
    where w.user_id = p_user_id
    group by w.id, w.cycle
  )
  select
    (select count(*) from sesiones),
    (select count(*) from series),
    (select coalesce(sum(weight_kg * reps), 0) from series),
    (select count(distinct exercise_id) from series),
    (select count(distinct e.muscle_group)
       from series sr join public.exercises e on e.id = sr.exercise_id),
    (select coalesce(max(weight_kg), 0) from series),
    (select count(*) from public.body_weight_entries
      where user_id = p_user_id),
    (select count(*) from public.workout_plans
      where user_id = p_user_id and source = 'shared' and completed_at is not null),
    -- La hora se mira en la zona del servidor. Para "antes de las 7" da igual
    -- afinar más: quien madruga lo hace en su franja, no en la del servidor.
    (select count(*) from sesiones where extract(hour from started_at) < 7),
    (select count(*) from sesiones where extract(hour from started_at) >= 22),
    (select count(*) from sesiones where extract(isodow from started_at) in (6, 7)),
    (select count(*) from sesiones
      where finished_at - started_at >= interval '90 minutes'),
    (select coalesce(sum(laps), 0)::bigint from vueltas);
$$;
