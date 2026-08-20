-- Recupera un entrenamiento abierto después de cerrar la app.
--
-- Las series cerradas siguen viviendo en `session_sets`: son lo que el
-- usuario hizo de verdad. Este JSON guarda únicamente el estado de edición
-- necesario para reconstruir la pantalla (campos aún abiertos, ejercicio
-- actual y fin del descanso).

alter table public.workout_sessions
  add column if not exists draft_state jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_sessions_draft_state_object'
      and conrelid = 'public.workout_sessions'::regclass
  ) then
    alter table public.workout_sessions
      add constraint workout_sessions_draft_state_object
      check (
        draft_state is null
        or jsonb_typeof(draft_state) = 'object'
      );
  end if;
end
$$;

comment on column public.workout_sessions.draft_state is
  'Estado recuperable de una sesión abierta; las series completadas viven en session_sets.';
