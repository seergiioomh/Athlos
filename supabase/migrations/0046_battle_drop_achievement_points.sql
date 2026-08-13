-- Los logros dejan de puntuar en las batallas.
--
-- `0045` evitó que contaran logros sincronizados tarde, pero el problema de
-- fondo seguía: un logro se gana UNA VEZ en la vida de la cuenta, no por
-- batalla.
--
-- Eso hace que el término dependa de tu historial FUERA de la ventana, que es
-- justo lo que la fórmula promete no hacer. Quien lleva tiempo en la app puede
-- tenerlo casi todo desbloqueado y sacar 0 por mucha constancia que demuestre,
-- mientras alguien recién llegado suma 75 por cada umbral que le quedaba a
-- mano, aunque entrene menos. No se puede parchear sin chocar con que un logro
-- ni se retira ni se vuelve a conseguir.
--
-- Adherencia, marcas y días activos ya miden constancia real dentro de la
-- batalla y no dependen de nada anterior. Se quita la columna entera en vez de
-- dejarla a cero: ninguna pantalla la usaba, y un campo muerto invita a
-- volver a contarlo.

drop function if exists public.battle_score(uuid);
drop function if exists public.battle_ranking(uuid);

/**
 * La clasificación, sin comprobar quién pregunta.
 *
 * Uso interno: la llaman `battle_score` (que ya ha validado) y el cierre por
 * cron. Se le revoca el permiso a los roles del cliente, porque tal cual
 * dejaría a cualquiera leer el marcador de una batalla ajena sabiendo su id.
 */
create function public.battle_ranking(p_battle uuid)
returns table (
  user_id uuid,
  display_name text,
  sessions_done bigint,
  target_sessions int,
  adherence_points int,
  pr_points int,
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
    (coalesce(d.n, 0) * 15)::int,
    (
      least(
        round(coalesce(h.n, 0)::numeric / greatest(bp.target_sessions, 1) * 1000),
        1000
      )
      + least(coalesce(mc.n, 0) * 50, 300)
      + coalesce(d.n, 0) * 15
    )::int
  from public.battle_participants bp
  left join public.profiles p on p.id = bp.user_id
  left join hechas h on h.uid = bp.user_id
  left join dias d on d.uid = bp.user_id
  left join marcas mc on mc.uid = bp.user_id
  where bp.battle_id = p_battle
  -- Posición 8 es `total_points` y la 3 `sessions_done`: al quitar una columna
  -- se corren, y `close_due_battles` se fía de este orden para el ganador.
  order by 8 desc, 3 desc;
end;
$$;

revoke execute on function public.battle_ranking(uuid) from public, anon, authenticated;

/** La puerta para la app: comprueba que participas y delega el cálculo. */
create function public.battle_score(p_battle uuid)
returns table (
  user_id uuid,
  display_name text,
  sessions_done bigint,
  target_sessions int,
  adherence_points int,
  pr_points int,
  active_day_points int,
  total_points int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_battle_participant(p_battle, auth.uid()) then
    raise exception 'No participas en esa batalla';
  end if;

  return query select * from public.battle_ranking(p_battle);
end;
$$;
