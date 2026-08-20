-- Permite abandonar una batalla ya empezada.
--
-- `leave_battle` exigía `status = 'lobby'`, así que una vez arrancada nadie
-- podía salir: ni quien se unió por error, ni quien se queda solo porque el
-- grupo abandonó, ni el propio creador. Con duraciones de hasta 4 semanas eso
-- es quedarse atrapado en algo que ya no le interesa a nadie.
--
-- El motivo original era proteger la clasificación de los demás, pero al
-- revisarlo no se sostiene: `battle_ranking` calcula la puntuación de cada
-- participante de forma independiente, así que irse no cambia los puntos de
-- nadie. Solo desaparece una fila de la tabla. Lo que sí evita es que alguien
-- que va perdiendo se borre para no salir último, y eso se acepta a cambio de
-- no encerrar a la gente.
--
-- El creador tampoco es especial una vez empezada: la batalla sigue para el
-- resto. En sala de espera sí lo es, porque ahí todavía puede cancelarla.

create or replace function public.leave_battle(p_battle uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_creador uuid;
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  select status, created_by into v_status, v_creador
    from public.battles
   where id = p_battle;

  if not found then
    raise exception 'Esa batalla no existe';
  end if;

  if v_status not in ('lobby', 'active') then
    raise exception 'Esa batalla ya ha terminado';
  end if;

  -- En sala de espera el creador cancela, no sale: si se fuera dejaría una
  -- sala huérfana con su código repartido.
  if v_status = 'lobby' and v_creador = v_user then
    raise exception 'La creaste tú: cancélala en vez de salir';
  end if;

  delete from public.battle_participants
   where battle_id = p_battle and user_id = v_user;

  if not found then
    raise exception 'No participas en esa batalla';
  end if;
end;
$$;
