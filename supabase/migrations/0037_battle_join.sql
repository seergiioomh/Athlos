-- Batallas, PASO 2: unirse con código, previsualizar, salir y caducar.
--
-- El diseño completo está en `BATALLAS.md`. Este es el paso que abre el acceso
-- entre cuentas, así que todo pasa por funciones `security definer` que
-- validan las reglas y devuelven lo mínimo. Sigue sin haber ninguna política
-- de insert ni update en las tablas: escribir a mano se saltaría el aforo, la
-- regla de una batalla a la vez y el estado de sala de espera.

/** Aforo máximo. Más no se lee en una pantalla de móvil. */
create or replace function public.battle_max_players()
returns int language sql immutable as $$ select 8 $$;

/**
 * Lo que ve alguien ANTES de entrar, con solo el código en la mano.
 *
 * Es la única función que puede llamar quien todavía no participa, así que
 * devuelve lo mínimo para decidir: nombre, quién la creó y cuántos van. Ni
 * ids, ni la lista de participantes, ni nada de sus datos.
 */
create or replace function public.battle_preview(p_code text)
returns table (
  name text,
  creator text,
  participants int,
  duration_days int,
  status text
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

  return query
  select
    b.name,
    coalesce(p.display_name, 'Alguien'),
    (select count(*)::int from public.battle_participants bp where bp.battle_id = b.id),
    b.duration_days,
    b.status
  from public.battles b
  left join public.profiles p on p.id = b.created_by
  where b.code = upper(trim(p_code));
end;
$$;

/**
 * Entrar en una batalla con su código.
 *
 * El `for update` sobre la fila de la batalla no es adorno: sin él, dos
 * personas entrando a la vez pueden pasar los dos la comprobación de aforo y
 * dejar la batalla con nueve participantes. Bloquear la fila serializa las
 * entradas de esa batalla concreta.
 */
create or replace function public.join_battle(p_code text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_battle uuid;
  v_status text;
  v_count int;
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  select id, status into v_battle, v_status
    from public.battles
   where code = upper(trim(p_code))
   for update;

  if not found then
    raise exception 'No hay ninguna batalla con ese código';
  end if;

  if v_status <> 'lobby' then
    raise exception 'Esa batalla ya ha empezado o ha terminado';
  end if;

  if exists (
    select 1 from public.battle_participants
     where battle_id = v_battle and user_id = v_user
  ) then
    raise exception 'Ya estás en esa batalla';
  end if;

  -- Una a la vez: dos batallas en paralelo diluyen el pique.
  if exists (
    select 1
      from public.battle_participants bp
      join public.battles b on b.id = bp.battle_id
     where bp.user_id = v_user
       and b.status in ('lobby', 'active')
  ) then
    raise exception 'Ya tienes una batalla en curso';
  end if;

  select count(*) into v_count
    from public.battle_participants where battle_id = v_battle;

  if v_count >= public.battle_max_players() then
    raise exception 'Esa batalla ya está llena';
  end if;

  insert into public.battle_participants (battle_id, user_id)
  values (v_battle, v_user);

  return v_battle;
end;
$$;

/**
 * Salir de una sala de espera.
 *
 * Solo mientras no haya empezado: irse a mitad rompería la clasificación de
 * los demás. Quien la creó no puede salir, tiene que cancelarla.
 *
 * Existe porque sin ella una sala que nunca arranca deja al usuario atrapado:
 * como solo se permite una batalla a la vez, no podría crear ninguna más.
 */
create or replace function public.leave_battle(p_battle uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  if not exists (
    select 1 from public.battles
     where id = p_battle and status = 'lobby'
  ) then
    raise exception 'Esa batalla ya ha empezado o no existe';
  end if;

  if exists (
    select 1 from public.battles
     where id = p_battle and created_by = v_user
  ) then
    raise exception 'La creaste tú: cancélala en vez de salir';
  end if;

  delete from public.battle_participants
   where battle_id = p_battle and user_id = v_user;
end;
$$;

/** Cancelar una sala de espera. Solo quien la creó, y solo antes de empezar. */
create or replace function public.cancel_battle(p_battle uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  update public.battles
     set status = 'cancelled'
   where id = p_battle and created_by = v_user and status = 'lobby';

  if not found then
    raise exception 'Esa batalla no existe, no es tuya o ya ha empezado';
  end if;
end;
$$;

/**
 * Cancela las salas de espera que llevan más de 7 días sin arrancar.
 *
 * Sin esto, una invitación que nadie acepta deja a su creador sin poder crear
 * otra para siempre.
 *
 * La llamará el cron en el paso 3. No la exponemos a la app: no la invoca
 * ningún usuario y no tiene comprobación de quién llama, así que se le quita
 * el permiso a los roles del cliente.
 */
create or replace function public.expire_stale_lobbies()
returns int
language sql
volatile
security definer
set search_path = public
as $$
  with caducadas as (
    update public.battles
       set status = 'cancelled'
     where status = 'lobby'
       and created_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::int from caducadas;
$$;

revoke execute on function public.expire_stale_lobbies() from public, anon, authenticated;
