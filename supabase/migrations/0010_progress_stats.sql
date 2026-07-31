-- Cálculos de la pantalla de Progreso.
--
-- Van en la base de datos y no en el móvil por dos motivos: sumar volumen
-- exige traerse todas las series del historial, que crece sin techo; y el
-- máximo por ejercicio es una consulta que Postgres resuelve de una pasada.
--
-- Ambas son SECURITY INVOKER (el modo por defecto), así que respetan RLS:
-- cada usuario solo agrega sus propias filas.

-- Totales acumulados.
create or replace function public.progress_summary(p_user_id uuid)
returns table (
  finished_sessions bigint,
  total_sets bigint,
  total_reps bigint,
  total_volume_kg numeric,
  last_session timestamptz
)
language sql
stable
as $$
  select
    count(distinct s.id) filter (where s.finished_at is not null),
    count(ss.id),
    coalesce(sum(ss.reps), 0),
    -- Volumen = peso × repeticiones. Es la medida honesta de cuánto trabajo
    -- se ha hecho: subir de 60×8 a 60×10 también es progresar.
    coalesce(sum(ss.weight_kg * ss.reps), 0),
    max(s.finished_at)
  from public.workout_sessions s
  left join public.session_sets ss on ss.session_id = s.id
  where s.user_id = p_user_id;
$$;

-- Mejor serie por ejercicio, para ver la fuerza de un vistazo.
create or replace function public.exercise_progress(p_user_id uuid)
returns table (
  exercise_id uuid,
  name text,
  muscle_group text,
  best_weight_kg numeric,
  best_reps int,
  total_sets bigint,
  last_performed timestamptz
)
language sql
stable
as $$
  with series as (
    select
      ss.exercise_id,
      ss.weight_kg,
      ss.reps,
      ss.completed_at,
      -- A igual peso manda el que hizo más repeticiones.
      row_number() over (
        partition by ss.exercise_id
        order by ss.weight_kg desc, ss.reps desc
      ) as rank
    from public.session_sets ss
    join public.workout_sessions s on s.id = ss.session_id
    where s.user_id = p_user_id
  )
  select
    e.id,
    e.name,
    e.muscle_group,
    mejor.weight_kg,
    mejor.reps,
    (select count(*) from series where series.exercise_id = e.id),
    (select max(completed_at) from series where series.exercise_id = e.id)
  from series as mejor
  join public.exercises e on e.id = mejor.exercise_id
  where mejor.rank = 1
  order by (select max(completed_at) from series where series.exercise_id = e.id) desc;
$$;
