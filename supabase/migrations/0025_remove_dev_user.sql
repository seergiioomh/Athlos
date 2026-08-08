-- Elimina el usuario de desarrollo y todo lo suyo.
--
-- Se ejecuta cuando la app con login ya funciona y no queda nada que
-- conservar de la etapa anterior.
--
-- Basta con borrar la cuenta: todas las tablas cuelgan de `auth.users` con
-- borrado en cascada, así que se van con ella el perfil, los planes, las
-- sesiones, las series, los pesos, la conversación y el reparto semanal.
--
-- Usa el UUID literal y no `dev_user_id()` a propósito: esa función la
-- elimina 0024, y así este archivo funciona se ejecute antes o después.
--
-- ⚠️ No hay vuelta atrás.

delete from auth.users
where id = 'f4707a48-313f-4fe6-9ee2-0a8d09973167';

-- Comprobación: debe devolver cero filas en todas.
-- select
--   (select count(*) from public.workout_sessions)  as sesiones,
--   (select count(*) from public.workout_plans)     as planes,
--   (select count(*) from public.body_weight_entries) as pesos,
--   (select count(*) from public.coach_messages)    as mensajes,
--   (select count(*) from public.weekly_splits)     as repartos;
