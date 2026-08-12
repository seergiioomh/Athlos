-- Métrica de racha para los logros: la MEJOR de la historia, no la actual.
--
-- `workout_streak()` devuelve la racha viva, que baja a cero al fallar. Para un
-- logro eso no sirve: llegar a diez entrenamientos seguidos es algo que pasó, y
-- romper la racha después no lo deshace. Un logro que se pierde deja de ser un
-- logro.
--
-- Se calcula por islas: se listan los días con sesión terminada, se corta una
-- isla nueva cada vez que el hueco supera el descanso tolerado, y la mejor
-- racha es la isla más larga.
--
-- El descanso tolerado sale de los días por semana del usuario, igual que en la
-- app (`maxGapFor`): quien entrena tres días no puede tener el mismo margen que
-- quien entrena seis. Se calcula aquí dentro para que la función no dependa de
-- que quien la llame acierte con el parámetro.

create or replace function public.best_streak(p_user_id uuid)
returns int
language sql
stable
as $$
  with margen as (
    select greatest(
             2,
             ceil(7.0 / coalesce(nullif(days_per_week, 0), 3))
           )::int as max_gap
      from public.profiles
     where id = p_user_id
  ),
  dias as (
    select distinct finished_at::date as dia
      from public.workout_sessions
     where user_id = p_user_id
       and finished_at is not null
  ),
  cortes as (
    select
      dia,
      case
        when dia - lag(dia) over (order by dia)
             > (select max_gap from margen)
        then 1 else 0
      end as empieza_isla
    from dias
  ),
  islas as (
    select dia, sum(empieza_isla) over (order by dia) as isla
      from cortes
  )
  select coalesce(max(largo), 0)::int
    from (select count(*) as largo from islas group by isla) as tramos;
$$;

/**
 * `achievement_metrics` con la mejor racha añadida al final.
 *
 * Se reescribe entera porque Postgres no deja añadir una columna al `returns
 * table` de una función existente. El resto del cuerpo es el de `0041`, sin
 * tocar: si algo de ahí cambia, cambia aquí.
 */
drop function if exists public.achievement_metrics(uuid);

create function public.achievement_metrics(p_user_id uuid)
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
  cycle_laps bigint,
  battles_played bigint,
  battles_won bigint,
  best_streak bigint
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
    (select count(*) from sesiones where extract(hour from started_at) < 7),
    (select count(*) from sesiones where extract(hour from started_at) >= 22),
    (select count(*) from sesiones where extract(isodow from started_at) in (6, 7)),
    (select count(*) from sesiones
      where finished_at - started_at >= interval '90 minutes'),
    (select coalesce(sum(laps), 0)::bigint from vueltas),
    (select count(*) from public.battle_participants bp
       join public.battles b on b.id = bp.battle_id
      where bp.user_id = p_user_id and b.status in ('active', 'finished')),
    (select count(*) from public.battles
      where winner_id = p_user_id and status = 'finished'),
    (select public.best_streak(p_user_id))::bigint;
$$;
