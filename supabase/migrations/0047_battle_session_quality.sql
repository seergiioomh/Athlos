-- La adherencia pesa por CUMPLIMIENTO, no solo por asistencia.
--
-- Hasta ahora una sesión contaba entera con solo pulsar "Terminar
-- entrenamiento", sin exigir ni una serie registrada: el botón se queda
-- activo aunque no hayas marcado nada (es intencional para poder saltarte un
-- ejercicio), pero eso significa que dos sesiones puntuaban igual aunque una
-- cumpliera el plan entero y la otra estuviera vacía.
--
-- Ahora cada sesión aporta una fracción, no un 1 fijo: series cumplidas
-- (marcada, con reps y peso iguales o por encima del objetivo de ESA serie)
-- entre series previstas en el plan. Cumplir las 4 de 4 vale como una sesión
-- entera; cumplir 2 de 4, media.
--
-- El objetivo por serie es el que ya usa la app (`targetsOf` en
-- `features/workout/targets.ts`): si el ejercicio lleva progresión
-- (`set_targets`), cada serie tiene el suyo; si no, todas comparten
-- `target_reps` y `target_weight_kg`.
--
-- `sessions_done` se queda como el conteo literal de sesiones terminadas —
-- sigue siendo cierto y es lo que se lee en el desglose ("3 de 4 sesiones")—;
-- solo cambia de qué número sale `adherence_points`. Ninguna columna del
-- resultado cambia, así que no hace falta tocar la app.

create or replace function public.battle_ranking(p_battle uuid)
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
    select s.user_id as uid, s.id, s.plan_id, s.finished_at
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
  -- Cada serie que el plan prescribe, con su objetivo. Una fila por serie:
  -- (sesión, ejercicio del plan, número de serie, objetivo de esa serie).
  prescrito as (
    select
      se.id as session_id,
      se.uid,
      pe.id as plan_exercise_id,
      gs.n as set_number,
      case
        when pe.set_targets is not null
         and jsonb_array_length(pe.set_targets) = pe.sets
        then (pe.set_targets -> (gs.n - 1) ->> 'reps')::numeric
        else pe.target_reps::numeric
      end as target_reps,
      case
        when pe.set_targets is not null
         and jsonb_array_length(pe.set_targets) = pe.sets
        then (pe.set_targets -> (gs.n - 1) ->> 'weight_kg')::numeric
        else pe.target_weight_kg
      end as target_weight_kg
    from sesiones se
    join public.plan_exercises pe on pe.plan_id = se.plan_id
    cross join lateral generate_series(1, pe.sets) as gs(n)
  ),
  -- Por sesión: cuántas series se preveían y cuántas se cumplieron de verdad.
  -- "Cumplida" es una serie MARCADA con reps y peso iguales o por encima del
  -- objetivo de esa serie concreta; sin fila en `session_sets`, no cuenta.
  cumplimiento as (
    select
      p.session_id,
      p.uid,
      count(*) as previstas,
      count(*) filter (
        where ss.id is not null
          and ss.reps >= p.target_reps
          and ss.weight_kg >= p.target_weight_kg
      ) as cumplidas
    from prescrito p
    left join public.session_sets ss
      on ss.session_id = p.session_id
     and ss.plan_exercise_id = p.plan_exercise_id
     and ss.set_number = p.set_number
    group by p.session_id, p.uid
  ),
  -- Suma de fracciones, no de sesiones enteras: una sesión al 100% aporta 1,
  -- una al 50% aporta 0,5. Una sesión sin plan verificable (el plan se borró
  -- después) no aparece aquí y aporta 0: sin objetivo no hay forma honesta de
  -- puntuar cumplimiento.
  calidad as (
    select
      uid,
      sum(cumplidas::numeric / nullif(previstas, 0)) as sesiones_ponderadas
    from cumplimiento
    group by uid
  )
  select
    bp.user_id,
    coalesce(p.display_name, 'Alguien'),
    coalesce(h.n, 0),
    bp.target_sessions,
    least(
      round(coalesce(cal.sesiones_ponderadas, 0) / greatest(bp.target_sessions, 1) * 1000),
      1000
    )::int,
    least(coalesce(mc.n, 0) * 50, 300)::int,
    (coalesce(d.n, 0) * 15)::int,
    (
      least(
        round(coalesce(cal.sesiones_ponderadas, 0) / greatest(bp.target_sessions, 1) * 1000),
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
  left join calidad cal on cal.uid = bp.user_id
  where bp.battle_id = p_battle
  order by 8 desc, 3 desc;
end;
$$;

revoke execute on function public.battle_ranking(uuid) from public, anon, authenticated;
