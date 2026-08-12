-- Batallas, PASO 3 (parte SQL): cerrar las vencidas y proclamar ganador.
--
-- El problema a resolver: `battle_score` comprueba que quien llama participa
-- en la batalla, y el cron no es nadie —no hay `auth.uid()`—, así que no puede
-- usarla para saber quién ha ganado.
--
-- En vez de duplicar la fórmula (que acabaría divergiendo a la primera de
-- cambio), se parte en dos: `battle_ranking` tiene el cálculo y no pregunta
-- quién llama, y `battle_score` se queda como la puerta que sí lo pregunta.
-- Una sola fórmula, dos maneras de entrar.

/**
 * La clasificación, sin comprobar quién pregunta.
 *
 * Uso interno: la llaman `battle_score` (que ya ha validado) y el cierre por
 * cron. Se le revoca el permiso a los roles del cliente, porque tal cual
 * dejaría a cualquiera leer el marcador de una batalla ajena sabiendo su id.
 */
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

/** La puerta para la app: comprueba que participas y delega el cálculo. */
create or replace function public.battle_score(p_battle uuid)
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
begin
  if not public.is_battle_participant(p_battle, auth.uid()) then
    raise exception 'No participas en esa batalla';
  end if;

  return query select * from public.battle_ranking(p_battle);
end;
$$;

/**
 * Cierra las batallas cuyo plazo ha vencido y proclama ganador.
 *
 * Devuelve las que ha cerrado para que quien la llame pueda avisar a la gente.
 *
 * `skip locked` para que dos pasadas solapadas del cron no se peleen por la
 * misma fila: la segunda se salta lo que la primera esté cerrando en vez de
 * quedarse esperando.
 *
 * El ganador es el primero de la clasificación, que ya viene ordenada por
 * puntos y, a igualdad, por sesiones hechas.
 */
create or replace function public.close_due_battles()
returns table (battle uuid, winner uuid)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r record;
  v_winner uuid;
begin
  for r in
    select id from public.battles
     where status = 'active' and ends_at <= now()
     for update skip locked
  loop
    select rk.user_id into v_winner
      from public.battle_ranking(r.id) rk
     limit 1;

    update public.battles
       set status = 'finished', winner_id = v_winner
     where id = r.id;

    battle := r.id;
    winner := v_winner;
    return next;
  end loop;
end;
$$;

revoke execute on function public.close_due_battles() from public, anon, authenticated;
