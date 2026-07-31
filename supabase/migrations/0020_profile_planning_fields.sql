-- Datos que faltaban para que la IA pueda programar de verdad.
--
-- Los tres primeros son los que más cambian un plan: sin saber cuántos
-- minutos tiene por sesión, qué días concretos puede entrenar y si domina la
-- técnica de los básicos, cualquier rutina es una suposición.

alter table public.profiles
  -- Días concretos, no solo cuántos: permite repartir la semana de verdad.
  -- `days_per_week` se mantiene sincronizado con la longitud de este array.
  add column training_days text[]
    check (
      training_days is null
      or training_days <@ array['lun','mar','mie','jue','vie','sab','dom']
    ),

  add column session_minutes int
    check (session_minutes between 15 and 180),

  -- Si sabe ejecutar los compuestos con barra o hay que empezar por versiones
  -- más seguras. Es una cuestión de lesiones, no de rendimiento.
  add column technique_level text
    check (technique_level in ('sin-experiencia', 'basica', 'solida')),

  add column target_weight_kg numeric(5, 2)
    check (target_weight_kg between 30 and 300),

  -- Grupos que quiere destacar. Sesga el volumen, no lo monopoliza.
  add column focus_areas text[]
    check (
      focus_areas is null
      or focus_areas <@ array['pecho','espalda','hombro','brazo','pierna','gluteo','core']
    ),

  -- Cuánto se mueve fuera del gimnasio: condiciona la recuperación.
  add column daily_activity text
    check (daily_activity in ('sedentaria', 'ligera', 'activa', 'muy-activa')),

  add column sleep_hours numeric(3, 1)
    check (sleep_hours between 3 and 14),

  add column cardio text
    check (cardio in ('ninguno', 'poco', 'moderado', 'mucho')),

  -- Ejercicios que no quiere hacer, por gusto o por historial.
  add column avoid_exercises text;
