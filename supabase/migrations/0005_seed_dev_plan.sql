-- OPCIONAL — solo para probar la pantalla sin desplegar la Edge Function.
--
-- Inserta un entrenamiento a mano para el usuario de desarrollo, con la misma
-- forma que devolvería la IA (`source` = 'manual' para distinguirlos).
-- Se puede ejecutar varias veces: cada una crea un plan nuevo, y la app
-- siempre carga el más reciente.
--
-- Requiere haber ejecutado antes 0003_dev_open_access.sql.

with nuevo_plan as (
  insert into public.workout_plans (user_id, title, focus, source)
  values (
    public.dev_user_id(),
    'Entrenamiento de hoy',
    'Empuje · Pecho y hombro',
    'manual'
  )
  returning id
)
insert into public.plan_exercises (
  plan_id, exercise_id, position, sets,
  target_reps, target_weight_kg, rest_seconds, ai_note
)
select
  nuevo_plan.id,
  ejercicio.id,
  datos.position,
  datos.sets,
  datos.target_reps,
  datos.target_weight_kg,
  datos.rest_seconds,
  datos.ai_note
from nuevo_plan
cross join (values
  (0, 'press-banca',           4,  8, 75.0, 90, 'Subimos 2,5 kg: cerraste las 4 series al objetivo la semana pasada.'),
  (1, 'press-inclinado',       3, 10, 22.0, 75, 'Mantenemos la carga hasta que las 3 series salgan limpias.'),
  (2, 'elevaciones-laterales', 3, 14, 10.0, 60, 'Serie larga: prioriza el control sobre el peso.'),
  (3, 'fondos',                3, 12,  0.0, 75, 'Peso corporal. Si pasas de 12, añadimos lastre el próximo día.')
) as datos (
  position, slug, sets, target_reps, target_weight_kg, rest_seconds, ai_note
)
join public.exercises ejercicio on ejercicio.slug = datos.slug;
