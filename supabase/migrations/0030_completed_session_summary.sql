-- Resumen que se enseña inmediatamente al cerrar una sesión.
--
-- No se agregan las series en el cliente: volumen, ejercicios y series
-- salen de Postgres para que todos los puntos de la app coincidan.

create or replace function public.completed_session_summary(p_session_id uuid)
returns table (
  duration_minutes int,
  total_volume_kg numeric,
  exercise_count bigint,
  set_count bigint
)
language sql
stable
as $$
  select
    greatest(
      0,
      floor(
        extract(
          epoch from (
            coalesce(ws.finished_at, now())
            - coalesce(min(ss.completed_at), ws.started_at)
          )
        ) / 60
      )
    )::int as duration_minutes,
    coalesce(sum(ss.weight_kg * ss.reps), 0)::numeric as total_volume_kg,
    count(distinct ss.exercise_id)::bigint as exercise_count,
    count(ss.id)::bigint as set_count
  from public.workout_sessions ws
  left join public.session_sets ss on ss.session_id = ws.id
  where ws.id = p_session_id
  group by ws.id, ws.started_at, ws.finished_at;
$$;
