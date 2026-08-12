-- Corrige cómo se calcula el objetivo de una batalla.
--
-- `0035` lo sacaba SOLO de la media real de las últimas 4 semanas. La
-- intención era cerrar un agujero —bajarse los días declarados en el perfil
-- justo antes de retar—, pero abría uno peor: entrenar poco las semanas
-- previas te regalaba un objetivo ridículo.
--
-- Caso real que lo destapó: 3 sesiones en 28 días (media 0,75/semana) con 5
-- días declarados daba un objetivo de 1. Un solo entrenamiento y ya tenías los
-- 1000 puntos de adherencia al máximo.
--
-- Y el agujero que quedaba abierto era el barato de explotar: entrenar menos
-- no cuesta nada y no se ve. Bajarse los días declarados, en cambio, sí cuesta:
-- el coach te diseña el ciclo con ese número, así que te empeora los
-- entrenamientos de verdad. Los días declarados son la señal más robusta, y
-- además son TU PLAN, que es justo lo que la batalla mide si cumples.
--
-- Ahora pesan 2/3 lo declarado y 1/3 lo real: manda el plan, pero la realidad
-- reciente lo corrige un poco en ambos sentidos. Con el caso de arriba sale 4.

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
  with base as (
    select
      -- Sesiones por semana de las últimas 4 semanas.
      (select count(*)::numeric / 4
         from public.workout_sessions
        where user_id = p_user_id
          and finished_at is not null
          and finished_at >= now() - interval '28 days') as media_real,
      -- Lo que el usuario dice que entrena. Sin perfil, 3.
      (select coalesce(days_per_week, 3)::numeric
         from public.profiles where id = p_user_id) as declarados
  )
  select greatest(
    1,
    round(
      ((coalesce(declarados, 3) * 2 + coalesce(media_real, 0)) / 3)
      * (p_days::numeric / 7)
    )
  )::int
  from base;
$$;
