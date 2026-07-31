-- Un plan deja de estar vigente cuando el usuario lo termina, no cuando
-- cambia el día. Mientras `completed_at` sea null, ese entrenamiento sigue
-- siendo el pendiente aunque hayan pasado tres días.

alter table public.workout_plans
  add column completed_at timestamptz;

-- Consulta habitual: "el plan pendiente de este usuario".
create index workout_plans_pending_idx
  on public.workout_plans (user_id, created_at desc)
  where completed_at is null;
