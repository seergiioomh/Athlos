-- Reparto semanal: la estructura que ordena las sesiones.
--
-- Hasta ahora la IA generaba entrenamientos sueltos, cada uno decidiendo su
-- foco al vuelo. Con un reparto explícito (Push/Pull/Legs, torso-pierna, full
-- body...) cada sesión sabe qué le toca, y el usuario puede ver y discutir la
-- estructura en lugar de deducirla.

create table public.weekly_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  -- "Push / Pull / Legs", "Torso - Pierna", "Full body"...
  name text not null,
  -- Por qué este reparto para esta persona. Se le muestra tal cual.
  rationale text,

  -- [{ "day": "lun", "label": "Push", "focus": "Pecho, hombro y tríceps" }, ...]
  days jsonb not null,

  -- Solo uno vigente a la vez; los anteriores se conservan como historial.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index weekly_splits_active_idx
  on public.weekly_splits (user_id, created_at desc)
  where active;

alter table public.weekly_splits enable row level security;

create policy "reparto propio"
  on public.weekly_splits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Acceso de desarrollo, mismo criterio que 0003. Lo tira 0004.
create policy "dev reparto"
  on public.weekly_splits for all
  to anon
  using (user_id = public.dev_user_id())
  with check (user_id = public.dev_user_id());
