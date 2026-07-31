-- Conversación con el coach.
--
-- Se guarda entera y no solo en memoria del móvil: el historial es lo que
-- le da continuidad al entrenador entre sesiones, y lo que permite que
-- recuerde lo que le contaste la semana pasada.

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index coach_messages_user_created_idx
  on public.coach_messages (user_id, created_at desc);

alter table public.coach_messages enable row level security;

create policy "conversacion propia"
  on public.coach_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Acceso de desarrollo, mismo criterio que 0003. Lo tira 0004.
create policy "dev coach"
  on public.coach_messages for all
  to anon
  using (user_id = public.dev_user_id())
  with check (user_id = public.dev_user_id());
