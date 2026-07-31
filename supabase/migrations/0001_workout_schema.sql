-- ATHLOS · esquema de entrenamiento
--
-- Separa lo que la IA propone (workout_plans + plan_exercises) de lo que el
-- usuario hace de verdad (workout_sessions + session_sets). Son tablas
-- distintas a propósito: el objetivo tiene que seguir siendo consultable
-- después, para comparar y para alimentar la siguiente sugerencia.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- perfiles

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- ejercicios

-- Catálogo global, no es de nadie. La IA solo puede elegir de aquí.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  muscle_group text not null,
  is_bodyweight boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------ planes sugeridos

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  focus text,
  scheduled_for date not null default current_date,
  -- 'ai' | 'manual'. Guardamos el modelo para poder auditar por qué se
  -- propuso algo cuando cambiemos de versión.
  source text not null default 'ai' check (source in ('ai', 'manual')),
  ai_model text,
  created_at timestamptz not null default now()
);

create index workout_plans_user_date_idx
  on public.workout_plans (user_id, scheduled_for desc);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans on delete cascade,
  exercise_id uuid not null references public.exercises on delete restrict,
  position int not null,
  sets int not null check (sets between 1 and 12),
  target_reps int not null check (target_reps between 1 and 100),
  target_weight_kg numeric(6, 2) not null default 0 check (target_weight_kg >= 0),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 600),
  ai_note text,
  unique (plan_id, position)
);

-- ------------------------------------------------------ sesiones reales

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- Si se borra el plan la sesión sobrevive: lo que el usuario levantó
  -- es el dato valioso.
  plan_id uuid references public.workout_plans on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions on delete cascade,
  plan_exercise_id uuid references public.plan_exercises on delete set null,
  exercise_id uuid not null references public.exercises on delete restrict,
  set_number int not null check (set_number between 1 and 12),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  reps int not null check (reps between 0 and 100),
  completed_at timestamptz not null default now(),
  -- Reabrir y volver a cerrar una serie no debe duplicar la fila.
  unique (session_id, exercise_id, set_number)
);

create index session_sets_session_idx on public.session_sets (session_id);

-- --------------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;

create policy "perfil propio"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- El catálogo lo lee cualquiera; escribirlo es tarea de migración.
create policy "catalogo legible"
  on public.exercises for select
  to authenticated
  using (true);

create policy "planes propios"
  on public.workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Las tablas hijas no llevan user_id: se cuelgan del padre para que no
-- pueda quedar una fila huérfana con dueño distinto al del plan.
create policy "ejercicios del plan propio"
  on public.plan_exercises for all
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create policy "sesiones propias"
  on public.workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "series de sesion propia"
  on public.session_sets for all
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
