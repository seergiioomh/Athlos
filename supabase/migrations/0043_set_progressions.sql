-- Objetivos por serie, para que la IA pueda proponer progresiones.
--
-- Hasta ahora `plan_exercises` guardaba un solo objetivo por ejercicio —4
-- series de 10 a 60 kg— y eso impedía expresar lo más común en fuerza: series
-- ascendentes (60×12, 70×10, 80×8), back-off o descendentes. El modelo no
-- podía sugerirlo aunque quisiera.
--
-- Se añade una columna en vez de una tabla nueva, y las escalares se quedan:
--
--   * `set_targets` NULO  → todas las series van al objetivo de siempre. Es lo
--     que tienen los planes anteriores, así que no hay que migrar nada, y lo
--     que se sigue usando cuando la progresión no aporta.
--   * `set_targets` con valor → manda él, una entrada por serie.
--
-- Las columnas escalares siguen siendo la fuente del caso uniforme, no una
-- copia: no hay dos verdades que puedan desincronizarse, hay dos formas y una
-- regla clara de cuál gana.

alter table public.plan_exercises
  add column if not exists set_targets jsonb;

/**
 * ¿Es válido este objetivo por serie para un ejercicio de `p_sets` series?
 *
 * Va en una función porque un `check` no admite subconsultas, y comprobar cada
 * entrada del array exige recorrerlo. Es `immutable` de verdad: solo mira sus
 * argumentos, así que vale dentro de una restricción.
 *
 * Sin esto, un plan mal generado dejaría la pantalla pidiendo la serie 4 de
 * una progresión que solo trae 3.
 */
create or replace function public.valid_set_targets(
  p_targets jsonb,
  p_sets int
)
returns boolean
language sql
immutable
as $$
  select p_targets is null
      or (
        jsonb_typeof(p_targets) = 'array'
        and jsonb_array_length(p_targets) = p_sets
        and coalesce(
          (
            select bool_and(
                     jsonb_typeof(entrada -> 'reps') = 'number'
                 and jsonb_typeof(entrada -> 'weight_kg') = 'number'
                 and (entrada ->> 'reps')::numeric between 1 and 100
                 and (entrada ->> 'weight_kg')::numeric between 0 and 9999
                   )
              from jsonb_array_elements(p_targets) as entrada
          ),
          false
        )
      );
$$;

alter table public.plan_exercises
  drop constraint if exists plan_exercises_set_targets_check;

alter table public.plan_exercises
  add constraint plan_exercises_set_targets_check
  check (public.valid_set_targets(set_targets, sets));

comment on column public.plan_exercises.set_targets is
  'Objetivo por serie: [{"reps": 12, "weight_kg": 60}, ...]. Nulo = todas las series usan target_reps y target_weight_kg.';
