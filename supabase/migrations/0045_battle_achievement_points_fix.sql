-- Arregla los puntos de logro en batallas: contaban trabajo de antes de
-- empezar.
--
-- `logros` daba puntos si `unlocked_at` caía dentro de la ventana de la
-- batalla. El fallo es que `unlocked_at` no es cuándo se cumplió el umbral,
-- es cuándo la app se ENTERÓ y lo guardó, que puede ser mucho después: los
-- logros solo se sincronizan al terminar un entrenamiento o al abrir la
-- pantalla de Logros.
--
-- Con las familias de Rachas y Batallas recién añadidas, cualquier cuenta con
-- historial puede tener logros ya cumplidos que nunca se habían guardado. En
-- cuanto esa cuenta abre la pantalla de Logros durante una batalla, se
-- guardan todos de golpe con fecha de ahora mismo, y contaban como ganados
-- EN la batalla aunque el trabajo real fuera de hace semanas y esa sesión no
-- hubiera entrenado ni un día. Caso real que lo destapó: una cuenta con 0
-- sesiones ganando a otra con 1.
--
-- El resto de términos no tiene este problema porque salen de `sesiones`,
-- que ya está acotada a la ventana; solo a los logros les faltaba exigir lo
-- mismo. El arreglo: solo puntúan si esa persona entrenó al menos una vez
-- durante la batalla.

create or replace function public.battle_ranking(p_battle uuid)
returns table (
  user_id uuid,
  display_name text,
  sessions_done bigint,
  target_sessions int,
  adherence_points int,
  pr_points int,
  achievement_points int,
  active_day_points int,
  total_points int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  select b.started_at, least(coalesce(b.ends_at, now()), now())
    into v_start, v_end
    from public.battles b where b.id = p_battle;

  if v_start is null then
    raise exception 'Esa batalla todavía no ha empezado';
  end if;

  return query
  with sesiones as (
    select s.user_id as uid, s.id, s.finished_at
      from public.workout_sessions s
      join public.battle_participants bp
        on bp.user_id = s.user_id and bp.battle_id = p_battle
     where s.finished_at between v_start and v_end
  ),
  hechas as (
    select uid, count(*) as n from sesiones group by uid
  ),
  dias as (
    select uid, count(distinct finished_at::date) as n from sesiones group by uid
  ),
  mejores as (
    select se.uid, ss.exercise_id, max(ss.weight_kg) as mejor
      from sesiones se
      join public.session_sets ss on ss.session_id = se.id
     group by se.uid, ss.exercise_id
  ),
  marcas as (
    select m.uid, count(*) as n
      from mejores m
     where m.mejor > coalesce((
             select max(ss2.weight_kg)
               from public.session_sets ss2
               join public.workout_sessions s2 on s2.id = ss2.session_id
              where s2.user_id = m.uid
                and ss2.exercise_id = m.exercise_id
                and s2.finished_at < v_start
           ), 0)
       and m.mejor > 0
     group by m.uid
  ),
  logros as (
    select ua.user_id as uid, count(*) as n
      from public.user_achievements ua
      join public.battle_participants bp
        on bp.user_id = ua.user_id and bp.battle_id = p_battle
      -- La condición nueva: sin esto, sincronizar logros atrasados durante la
      -- batalla puntuaba trabajo hecho antes de que empezara.
      join hechas h on h.uid = ua.user_id
     where ua.unlocked_at between v_start and v_end
     group by ua.user_id
  )
  select
    bp.user_id,
    coalesce(p.display_name, 'Alguien'),
    coalesce(h.n, 0),
    bp.target_sessions,
    least(
      round(coalesce(h.n, 0)::numeric / greatest(bp.target_sessions, 1) * 1000),
      1000
    )::int,
    least(coalesce(mc.n, 0) * 50, 300)::int,
    (coalesce(lg.n, 0) * 75)::int,
    (coalesce(d.n, 0) * 15)::int,
    (
      least(
        round(coalesce(h.n, 0)::numeric / greatest(bp.target_sessions, 1) * 1000),
        1000
      )
      + least(coalesce(mc.n, 0) * 50, 300)
      + coalesce(lg.n, 0) * 75
      + coalesce(d.n, 0) * 15
    )::int
  from public.battle_participants bp
  left join public.profiles p on p.id = bp.user_id
  left join hechas h on h.uid = bp.user_id
  left join dias d on d.uid = bp.user_id
  left join marcas mc on mc.uid = bp.user_id
  left join logros lg on lg.uid = bp.user_id
  where bp.battle_id = p_battle
  order by 9 desc, 3 desc;
end;
$$;

revoke execute on function public.battle_ranking(uuid) from public, anon, authenticated;
