-- Progreso comparado por periodo.
--
-- `progress_summary` da totales de toda la vida, que no dicen si vas a más o
-- a menos. Esta función sirve a "Tu actividad": compara el periodo que el
-- usuario tiene seleccionado (7/30/90/365 días) contra el mismo número de
-- días justo anterior.
--
-- SECURITY INVOKER (por defecto), respeta RLS igual que el resto de
-- `progress_stats`.

create or replace function public.progress_period_summary(
  p_user_id uuid,
  p_days int
)
returns table (
  sessions_current bigint,
  sessions_previous bigint,
  sets_current bigint,
  sets_previous bigint,
  volume_current numeric,
  volume_previous numeric
)
language sql
stable
as $$
  with sesiones as (
    select
      s.id,
      (s.finished_at >= now() - (p_days || ' days')::interval) as es_actual
    from public.workout_sessions s
    where s.user_id = p_user_id
      and s.finished_at is not null
      and s.finished_at >= now() - (p_days * 2 || ' days')::interval
  ),
  series as (
    select ss.weight_kg, ss.reps, se.es_actual
    from sesiones se
    join public.session_sets ss on ss.session_id = se.id
  )
  select
    (select count(*) from sesiones where es_actual),
    (select count(*) from sesiones where not es_actual),
    (select count(*) from series where es_actual),
    (select count(*) from series where not es_actual),
    (select coalesce(sum(weight_kg * reps), 0) from series where es_actual),
    (select coalesce(sum(weight_kg * reps), 0) from series where not es_actual);
$$;
