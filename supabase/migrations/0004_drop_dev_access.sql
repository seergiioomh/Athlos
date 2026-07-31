-- Ejecutar este archivo el día que entre Supabase Auth. Cierra el acceso
-- anónimo que abrió 0003 y deja solo las políticas por `auth.uid()`.
--
-- No está pensado para correr ahora: mientras la app no inicie sesión,
-- ejecutarlo la deja sin poder leer nada.

drop policy if exists "dev catalogo legible"    on public.exercises;
drop policy if exists "dev perfil"              on public.profiles;
drop policy if exists "dev planes"              on public.workout_plans;
drop policy if exists "dev ejercicios del plan" on public.plan_exercises;
drop policy if exists "dev sesiones"            on public.workout_sessions;
drop policy if exists "dev series"              on public.session_sets;
drop policy if exists "dev peso"                on public.body_weight_entries;
drop policy if exists "dev coach"               on public.coach_messages;
drop policy if exists "dev reparto"             on public.weekly_splits;

drop function if exists public.dev_user_id();
