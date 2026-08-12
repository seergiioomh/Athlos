-- Participantes de una sala de espera.
--
-- PostgREST no puede enlazar `battle_participants.user_id` con `profiles.id`:
-- ambas apuntan a `auth.users`, pero no hay una clave foránea entre ellas.
-- Esta función resuelve el nombre en el servidor sin abrir la tabla de perfiles.

create or replace function public.battle_lobby_participants(p_battle uuid)
returns table (
  user_id uuid,
  display_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión no válida';
  end if;

  if not public.is_battle_participant(p_battle, auth.uid()) then
    raise exception 'No participas en esa batalla';
  end if;

  return query
  select
    bp.user_id,
    coalesce(p.display_name, 'Alguien')
  from public.battle_participants bp
  left join public.profiles p on p.id = bp.user_id
  where bp.battle_id = p_battle
  order by bp.joined_at asc;
end;
$$;

revoke execute on function public.battle_lobby_participants(uuid) from public, anon;
grant execute on function public.battle_lobby_participants(uuid) to authenticated;
