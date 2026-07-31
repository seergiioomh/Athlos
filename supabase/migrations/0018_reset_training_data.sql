-- ⚠️  BORRA TODOS LOS DATOS DE ENTRENAMIENTO DEL USUARIO DE DESARROLLO  ⚠️
--
-- Se ejecuta a mano y a conciencia. No hay vuelta atrás: si quieres
-- conservar algo, expórtalo antes.
--
-- Qué se borra:
--   · sesiones y sus series (las series caen en cascada)
--   · planes y sus ejercicios (en cascada)
--   · registros de peso corporal
--
-- Qué NO se borra:
--   · tu perfil, con objetivo, nivel, días y limitaciones
--   · la conversación con el coach
--   · el catálogo de ejercicios

delete from public.workout_sessions
where user_id = public.dev_user_id();

delete from public.workout_plans
where user_id = public.dev_user_id();

delete from public.body_weight_entries
where user_id = public.dev_user_id();

-- Descomenta si también quieres empezar de cero la conversación:
-- delete from public.coach_messages where user_id = public.dev_user_id();
