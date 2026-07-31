-- Importar un entrenamiento ya hecho, desde notas escritas a mano.
--
-- Registra la sesión como terminada, con sus series y, si se pasa, el peso
-- corporal de ese día. No crea ningún plan: un entrenamiento del pasado no
-- lo propuso nadie, y `workout_sessions.plan_id` admite null precisamente
-- para esto.
--
-- Es SECURITY INVOKER (el modo por defecto), así que respeta RLS: solo
-- escribe donde el usuario que la llama tenga permiso.

create or replace function public.import_session(
  p_user_id uuid,
  p_date date,
  p_focus text,
  -- [{ "slug": "dominadas", "sets": [{"reps": 8, "kg": 0}, ...] }, ...]
  p_exercises jsonb,
  p_weight_kg numeric default null,
  p_rating int default null,
  p_energy_before int default null,
  p_energy_during int default null,
  p_ate_well boolean default null,
  p_discomfort text default null,
  p_comment text default null
)
returns uuid
language plpgsql
as $$
declare
  v_session uuid;
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_id uuid;
  v_number int;
begin
  insert into public.workout_sessions (
    user_id, plan_id, started_at, finished_at, focus, notes,
    rating, energy_before, energy_during, ate_well, discomfort
  )
  values (
    p_user_id, null,
    p_date + interval '18 hours',
    p_date + interval '19 hours',
    p_focus, p_comment,
    p_rating, p_energy_before, p_energy_during, p_ate_well, p_discomfort
  )
  returning id into v_session;

  for v_exercise in select * from jsonb_array_elements(p_exercises)
  loop
    -- Reiniciar es obligatorio: si un SELECT ... INTO no encuentra fila,
    -- la variable conserva el valor de la vuelta anterior y las series se
    -- colgarían del ejercicio equivocado en silencio.
    v_exercise_id := null;

    select id into v_exercise_id
    from public.exercises
    where slug = v_exercise->>'slug';

    if v_exercise_id is null then
      raise exception 'El ejercicio "%" no está en el catálogo. Añádelo a la tabla exercises primero.',
        v_exercise->>'slug';
    end if;

    v_number := 0;

    for v_set in select * from jsonb_array_elements(v_exercise->'sets')
    loop
      v_number := v_number + 1;

      insert into public.session_sets (
        session_id, exercise_id, set_number, weight_kg, reps, completed_at
      )
      values (
        v_session,
        v_exercise_id,
        v_number,
        coalesce((v_set->>'kg')::numeric, 0),
        (v_set->>'reps')::int,
        p_date + interval '18 hours'
      );
    end loop;
  end loop;

  if p_weight_kg is not null then
    insert into public.body_weight_entries (user_id, weight_kg, measured_on)
    values (p_user_id, p_weight_kg, p_date)
    on conflict (user_id, measured_on)
      do update set weight_kg = excluded.weight_kg;
  end if;

  return v_session;
end;
$$;
