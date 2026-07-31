-- Histórico de peso corporal.
--
-- `profiles.weight_kg` guarda el peso actual (lo que se pregunta en la
-- bienvenida); esta tabla guarda la serie temporal, que es lo que pinta la
-- gráfica de Home y lo que necesita la IA para ver la tendencia.

create table public.body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  weight_kg numeric(5, 2) not null check (weight_kg between 30 and 300),
  -- Un peso por día: pesarse dos veces el mismo día sobrescribe, no duplica.
  measured_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index body_weight_user_date_idx
  on public.body_weight_entries (user_id, measured_on desc);

alter table public.body_weight_entries enable row level security;

create policy "peso propio"
  on public.body_weight_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Acceso de desarrollo, mismo criterio que 0003. Lo tira 0004.
create policy "dev peso"
  on public.body_weight_entries for all
  to anon
  using (user_id = public.dev_user_id())
  with check (user_id = public.dev_user_id());
