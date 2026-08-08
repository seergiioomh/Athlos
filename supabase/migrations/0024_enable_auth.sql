-- Cierre del acceso anónimo. Ejecutar cuando la app con login esté instalada.
--
-- A partir de aquí solo se puede leer y escribir con sesión iniciada, y cada
-- usuario únicamente sus propias filas. Las políticas por `auth.uid()` ya
-- estaban puestas desde 0001; lo que faltaba era retirar el atajo.
--
-- ⚠️ Con la app antigua instalada, esto la deja sin datos. Instala primero la
-- versión con pantalla de acceso.

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

-- El catálogo lo lee cualquiera con sesión: es común a todos y no contiene
-- nada personal.
--
-- El `drop` previo es lo que hace este archivo reejecutable: `create policy`
-- no admite `if not exists`, así que sin él un segundo intento falla en seco.
drop policy if exists "catalogo legible autenticado" on public.exercises;

create policy "catalogo legible autenticado"
  on public.exercises for select
  to authenticated
  using (true);

/**
 * El perfil se crea solo al registrarse.
 *
 * Sin esto, la bienvenida tendría que insertarlo, y un fallo ahí dejaría
 * cuentas sin fila de perfil, que es un estado del que cuesta salir.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
