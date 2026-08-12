-- Avisa a los participantes cuando el creador arranca la batalla.
--
-- Va aquí dentro y no en una Edge Function nueva. La regla del proyecto es que
-- el push lo mandan las funciones, y esto la rompe a conciencia por dos
-- motivos concretos:
--
--   1. El aviso es una consecuencia inmediata de `start_battle`, que ya
--      comprueba que quien arranca es el creador. Sacarlo fuera obligaría a
--      volver a validar lo mismo desde otro sitio, y a que la app llamara dos
--      veces seguidas con el riesgo de que la segunda no llegue.
--   2. Lo único que aporta una Edge Function aquí es limpiar los tokens
--      caducados, y de eso ya se encarga `send-reminders` cada hora.
--
-- Si algún día el aviso necesita texto generado o lógica de reintento, esto
-- tiene que mudarse a una función. Mientras sea un texto fijo, no compensa.

create or replace function public.start_battle(p_battle uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_days int;
  v_name text;
  v_mensajes jsonb;
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  select duration_days, name into v_days, v_name
    from public.battles
   where id = p_battle and created_by = v_user and status = 'lobby';

  if not found then
    raise exception 'Esa batalla no existe, no es tuya o ya ha empezado';
  end if;

  update public.battle_participants
     set target_sessions = public.battle_target(user_id, v_days)
   where battle_id = p_battle;

  update public.battles
     set status = 'active',
         started_at = now(),
         ends_at = now() + (v_days || ' days')::interval
   where id = p_battle;

  -- A todos menos a quien acaba de pulsar el botón: ya sabe que ha empezado.
  select jsonb_agg(
           jsonb_build_object(
             'to', pt.token,
             'sound', 'default',
             'title', '¡Empieza la batalla!',
             'body', v_name || ' ya está en marcha. Que gane el más constante.',
             'data', jsonb_build_object('screen', 'battles')
           )
         )
    into v_mensajes
    from public.push_tokens pt
    join public.battle_participants bp on bp.user_id = pt.user_id
   where bp.battle_id = p_battle
     and pt.user_id <> v_user;

  -- Sin nadie a quien avisar no se llama a nadie: `jsonb_agg` devuelve null
  -- cuando no hay filas, y mandar eso a Expo sería una petición vacía.
  if v_mensajes is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := v_mensajes
    );
  end if;
end;
$$;
