-- ⚠️  TEMPORAL — BORRAR ANTES DE PUBLICAR LA APP  ⚠️
--
-- Mientras no hay login, la app se conecta con la clave `anon` y sin sesión,
-- así que `auth.uid()` es null y las políticas de 0001 lo bloquean todo.
--
-- Este archivo abre un único agujero, explícito y acotado: el rol `anon`
-- puede leer y escribir SOLO las filas del usuario de desarrollo. Cualquiera
-- con la clave anon (que va dentro del bundle de la app, es pública por
-- diseño) puede tocar los datos de ESE usuario. Es aceptable para datos de
-- prueba y para nada más.
--
-- Cuando entre Supabase Auth: ejecutar 0004_drop_dev_access.sql.

-- 1. El UUID va DENTRO de las comillas de la última línea. `returns uuid`
--    es el tipo que devuelve la función, no se toca.
create or replace function public.dev_user_id()
returns uuid
language sql
immutable
as $$ select 'f4707a48-313f-4fe6-9ee2-0a8d09973167'::uuid $$;

-- 2. Políticas de desarrollo, todas con el prefijo "dev " para poder
--    encontrarlas y tirarlas de golpe.

create policy "dev catalogo legible"
  on public.exercises for select
  to anon
  using (true);

create policy "dev perfil"
  on public.profiles for all
  to anon
  using (id = public.dev_user_id())
  with check (id = public.dev_user_id());

create policy "dev planes"
  on public.workout_plans for all
  to anon
  using (user_id = public.dev_user_id())
  with check (user_id = public.dev_user_id());

create policy "dev ejercicios del plan"
  on public.plan_exercises for all
  to anon
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = public.dev_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = public.dev_user_id()
    )
  );

create policy "dev sesiones"
  on public.workout_sessions for all
  to anon
  using (user_id = public.dev_user_id())
  with check (user_id = public.dev_user_id());

create policy "dev series"
  on public.session_sets for all
  to anon
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = public.dev_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = public.dev_user_id()
    )
  );

-- 3. El perfil del usuario de desarrollo.
insert into public.profiles (id, display_name)
values (public.dev_user_id(), 'Sergio (dev)')
on conflict (id) do nothing;
