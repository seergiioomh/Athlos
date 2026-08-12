-- Batallas: competición entre amigos por constancia.
--
-- El diseño completo, con el porqué de cada decisión, está en `BATALLAS.md`.
-- Léelo antes de tocar la fórmula.
--
-- Esto es el PASO 1: tablas, RLS y cálculo. Sin nada social todavía —unirse
-- con código llega en el paso 2—, para poder validar la fórmula en solitario
-- antes de abrir el acceso entre cuentas.
--
-- La regla que sostiene todo: NUNCA se puntúa el peso ni el volumen absoluto.
-- Comparar kilos entre personas compara biología, no esfuerzo.

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  -- Corto y dictable: los enlaces `athlos://` llegan a WhatsApp como texto
  -- plano, así que el código es la vía principal y el enlace un extra.
  code text not null unique,
  name text not null,
  created_by uuid not null references auth.users on delete cascade,

  status text not null default 'lobby'
    check (status in ('lobby', 'active', 'finished', 'cancelled')),

  duration_days int not null check (duration_days between 7 and 28),

  started_at timestamptz,
  ends_at timestamptz,
  winner_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_participants (
  battle_id uuid not null references public.battles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,

  -- Congelado al empezar. Sin congelarlo, bajarse los días en el perfil a
  -- mitad de batalla sería la jugada ganadora.
  target_sessions int not null default 0,
  joined_at timestamptz not null default now(),

  primary key (battle_id, user_id)
);

create index if not exists battle_participants_user_idx
  on public.battle_participants (user_id);

alter table public.battles enable row level security;
alter table public.battle_participants enable row level security;

/**
 * ¿Participa este usuario en esta batalla?
 *
 * `security definer` a propósito, y es importante: las políticas de
 * `battle_participants` necesitan preguntar por `battle_participants`, y una
 * subconsulta directa haría que Postgres entrara en recursión infinita al
 * evaluar la política contra sí misma. Al saltarse RLS, esta función corta el
 * ciclo.
 *
 * No la conviertas en invoker ni la sustituyas por un `exists` en la política.
 */
create or replace function public.is_battle_participant(
  p_battle uuid,
  p_user uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.battle_participants
    where battle_id = p_battle and user_id = p_user
  );
$$;

drop policy if exists "Ver las batallas en las que participas" on public.battles;
create policy "Ver las batallas en las que participas"
  on public.battles for select
  using (public.is_battle_participant(id, auth.uid()));

drop policy if exists "Ver a los rivales de tus batallas" on public.battle_participants;
create policy "Ver a los rivales de tus batallas"
  on public.battle_participants for select
  using (public.is_battle_participant(battle_id, auth.uid()));

-- Sin políticas de insert, update ni delete: crear, empezar y unirse pasan por
-- funciones que validan las reglas (aforo, una batalla activa a la vez). Una
-- política de insert abierta permitiría saltárselas escribiendo a mano.

/**
 * Cuántas sesiones se le piden a alguien en `p_days` días.
 *
 * Sale de su MEDIA REAL de las últimas 4 semanas, no de los días que declara
 * en el perfil: con lo declarado, bajarse a "1 día por semana" antes de retar
 * era la jugada ganadora. Sin historial suficiente se cae a `days_per_week`,
 * y en última instancia a 3.
 *
 * Mínimo 1: un objetivo de 0 daría una división por cero y adherencia infinita.
 */
create or replace function public.battle_target(
  p_user_id uuid,
  p_days int
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    1,
    round(
      coalesce(
        nullif(
          (select count(*)::numeric / 4
             from public.workout_sessions
            where user_id = p_user_id
              and finished_at is not null
              and finished_at >= now() - interval '28 days'),
          0
        ),
        (select coalesce(days_per_week, 3)::numeric
           from public.profiles where id = p_user_id),
        3
      ) * (p_days::numeric / 7)
    )
  )::int;
$$;

/** Código corto, sin caracteres que se confundan al dictarlo (0/O, 1/I). */
create or replace function public.battle_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
           floor(random() * 32)::int + 1, 1),
    ''
  )
  from generate_series(1, 6);
$$;

/**
 * Crea una batalla en sala de espera y mete dentro a quien la crea.
 *
 * El usuario sale de `auth.uid()`, nunca de un parámetro: aceptar un id
 * dejaría crear batallas en nombre de otro.
 */
create or replace function public.create_battle(
  p_name text,
  p_duration_days int default 7
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_code text;
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  if p_duration_days not in (7, 14, 28) then
    raise exception 'La duración tiene que ser de 7, 14 o 28 días';
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

  -- El código es único: si sale repetido, se reintenta.
  loop
    v_code := public.battle_code();
    exit when not exists (select 1 from public.battles where code = v_code);
  end loop;

  insert into public.battles (code, name, created_by, duration_days)
  values (v_code, trim(p_name), v_user, p_duration_days)
  returning id into v_id;

  insert into public.battle_participants (battle_id, user_id)
  values (v_id, v_user);

  return v_id;
end;
$$;

/**
 * Sala de espera → activa.
 *
 * Aquí se congelan los objetivos de todos y se fija el final. A partir de este
 * momento no entra nadie más: dejar entrar a mitad rompe la equidad, porque
 * quien llega el penúltimo día con un objetivo diminuto se cuela arriba.
 */
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
begin
  if v_user is null then
    raise exception 'Sesión no válida';
  end if;

  select duration_days into v_days
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
end;
$$;

/**
 * La clasificación, con el desglose de cada participante.
 *
 * `security definer` porque tiene que leer las sesiones de los demás, y por
 * eso lo primero que hace es comprobar que quien llama participa. Lo único que
 * sale de aquí son AGREGADOS: nadie ve los ejercicios, los pesos ni el peso
 * corporal de nadie.
 */
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
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_battle_participant(p_battle, auth.uid()) then
    raise exception 'No participas en esa batalla';
  end if;

  -- Hasta el final, o hasta ahora si sigue viva: así el marcador es el mismo
  -- durante la batalla y una vez cerrada.
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
  -- Marca personal: tu mejor peso en un ejercicio durante la batalla supera tu
  -- mejor peso ANTERIOR a ella. Se cuentan ejercicios distintos, no series.
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
    -- Adherencia: el término que manda, y el que hace justa la batalla. Va
    -- dividido entre el objetivo de CADA UNO, así que quien entrena 3 días y
    -- hace 3 gana a quien entrena 6 y hace 5.
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
  -- Empate a puntos: desempata quien haya hecho más sesiones.
  order by 9 desc, 3 desc;
end;
$$;
