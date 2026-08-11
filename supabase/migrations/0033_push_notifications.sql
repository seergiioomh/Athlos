-- Avisos push: recordar el entrenamiento del día y salvar la racha.
--
-- Las rachas y los niveles solo funcionan si el usuario vuelve, y hasta ahora
-- volver dependía de que se acordara solo. Esto cierra ese hueco.

create table if not exists public.push_tokens (
  -- El token de Expo es la identidad real aquí: un mismo usuario puede tener
  -- el móvil y el iPad, y reinstalar la app genera uno nuevo.
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens propios" on public.push_tokens;
create policy "push_tokens propios" on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.profiles
  -- Por defecto encendido: quien no quiera avisos los apaga desde el perfil,
  -- pero el permiso del sistema manda igualmente, así que esto no envía nada
  -- a quien no lo haya concedido en el móvil.
  add column if not exists notifications_enabled boolean not null default true,

  -- Hora local a la que avisar, 0-23. La zona horaria va aparte porque el
  -- servidor no puede deducirla del perfil.
  add column if not exists reminder_hour int not null default 18
    check (reminder_hour between 0 and 23),

  -- IANA ("Europe/Madrid"). La manda el móvil al registrar el token.
  add column if not exists timezone text;

/**
 * A quién toca avisar en esta pasada.
 *
 * Devuelve solo a quien: tiene los avisos encendidos, tiene algún token, hoy
 * es uno de sus días de entrenamiento, en su hora local es la que pidió, y
 * todavía no ha terminado ninguna sesión hoy. Lo de "todavía no ha entrenado"
 * es lo que evita el aviso más molesto de todos: recordarte que entrenes
 * justo después de haber entrenado.
 *
 * SECURITY DEFINER porque la llama la función de envío con la clave de
 * servicio, para leer perfiles de todos los usuarios a la vez.
 */
create or replace function public.users_to_remind()
returns table (
  user_id uuid,
  display_name text,
  tokens text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with candidatos as (
    select
      p.id,
      p.display_name,
      -- Sin zona horaria no hay forma de saber qué hora es para esa persona,
      -- así que se asume la de la mayoría de los usuarios actuales.
      coalesce(p.timezone, 'Europe/Madrid') as tz,
      timezone(coalesce(p.timezone, 'Europe/Madrid'), now()) as ahora_local,
      p.training_days,
      p.reminder_hour
    from public.profiles p
    where p.notifications_enabled
      and exists (select 1 from public.push_tokens t where t.user_id = p.id)
  )
  select
    c.id,
    c.display_name,
    array_agg(t.token)
  from candidatos c
  join public.push_tokens t on t.user_id = c.id
  where extract(hour from c.ahora_local)::int = c.reminder_hour
    -- Los días se guardan como 'lun', 'mar'... y Postgres numera el día de la
    -- semana con domingo = 0.
    and (array['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'])[
          extract(dow from c.ahora_local)::int + 1
        ] = any (c.training_days)
    and not exists (
      select 1
      from public.workout_sessions s
      where s.user_id = c.id
        and s.finished_at is not null
        -- Comparado en la fecha local del usuario, no en UTC: a las 23:30 en
        -- Madrid ya es "mañana" en UTC, y el aviso saldría igual.
        and timezone(c.tz, s.finished_at)::date = c.ahora_local::date
    )
  group by c.id, c.display_name;
$$;

revoke all on function public.users_to_remind() from public, anon, authenticated;
