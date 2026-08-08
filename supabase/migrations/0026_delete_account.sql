-- Borrado de cuenta desde la app.
--
-- Apple lo exige (directriz 5.1.1 v) a toda app que permita crear una cuenta:
-- sin esto no se puede publicar en la App Store.
--
-- Va como función y no como Edge Function porque no hace falta nada de lo que
-- una Edge Function aporta: no habla con ningún servicio externo y el usuario
-- ya viene resuelto en `auth.uid()`. Borrar desde el cliente es imposible
-- —`auth.users` no está expuesta por la API—, así que `security definer` es lo
-- que da los permisos justos.
--
-- El usuario a borrar NO se recibe como parámetro. Sale de `auth.uid()`, es
-- decir del token: es el mismo motivo por el que las Edge Functions no aceptan
-- un `user_id` en el cuerpo. Aceptarlo aquí dejaría a cualquiera borrar la
-- cuenta de cualquiera.
--
-- Todo lo del usuario cuelga de `auth.users` con `on delete cascade`, así que
-- este único delete se lleva perfil, planes, ejercicios del plan, sesiones,
-- series, pesajes, conversación con el coach y reparto semanal.

create or replace function public.delete_account()
returns void
language sql
security definer
-- Sin search_path vacío, cualquiera podría crear una tabla `users` en un
-- esquema suyo y colarla delante de `auth.users`. Obliga a cualificar.
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

-- Solo con sesión iniciada. Sin ella `auth.uid()` es null y el delete no
-- tocaría ninguna fila, pero es mejor que ni siquiera se pueda llamar.
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
