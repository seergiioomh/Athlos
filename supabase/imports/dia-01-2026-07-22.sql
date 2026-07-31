-- Día 1 · 22/07/26 · Pull
--
-- Plantilla de importación. Para los días siguientes: copia este archivo,
-- cambia la fecha, el foco, los ejercicios y las valoraciones.
--
-- Notas sobre la conversión:
--   · Los ejercicios sin peso (dominadas) van con kg = 0.
--   · "10 x cada lado" se registra como 10 repeticiones, no 20: es lo que se
--     hizo por serie y por lado, y así el progreso es comparable.

select public.import_session(
  p_user_id       => public.dev_user_id(),
  p_date          => '2026-07-22',
  p_focus         => 'Pull',
  p_weight_kg     => 64.7,
  p_rating        => 8,
  p_energy_before => 8,
  p_energy_during => 7,
  p_ate_well      => true,
  p_discomfort    => null,
  p_comment       => 'Me he notado un poco pesado',
  p_exercises     => '[
    {
      "slug": "dominadas",
      "sets": [
        { "reps": 8, "kg": 0 },
        { "reps": 7, "kg": 0 },
        { "reps": 7, "kg": 0 }
      ]
    },
    {
      "slug": "remo-maquina",
      "sets": [
        { "reps": 10, "kg": 35 },
        { "reps": 10, "kg": 35 },
        { "reps": 9,  "kg": 35 }
      ]
    },
    {
      "slug": "jalon-pecho",
      "sets": [
        { "reps": 11, "kg": 40 },
        { "reps": 12, "kg": 40 },
        { "reps": 8,  "kg": 45 }
      ]
    },
    {
      "slug": "remo-unilateral",
      "sets": [
        { "reps": 10, "kg": 15 },
        { "reps": 10, "kg": 15 },
        { "reps": 10, "kg": 15 }
      ]
    },
    {
      "slug": "face-pull",
      "sets": [
        { "reps": 10, "kg": 10 },
        { "reps": 10, "kg": 10 },
        { "reps": 10, "kg": 10 }
      ]
    },
    {
      "slug": "curl-inclinado",
      "sets": [
        { "reps": 10, "kg": 10 },
        { "reps": 10, "kg": 10 },
        { "reps": 10, "kg": 10 }
      ]
    },
    {
      "slug": "curl-scott",
      "sets": [
        { "reps": 8, "kg": 15 },
        { "reps": 7, "kg": 15 },
        { "reps": 6, "kg": 15 }
      ]
    }
  ]'::jsonb
);
