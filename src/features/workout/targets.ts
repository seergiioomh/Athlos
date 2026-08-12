import type { SetTarget, SuggestedExercise } from "./types";

type ConObjetivo = Pick<
  SuggestedExercise,
  "sets" | "targetReps" | "targetWeightKg" | "setTargets"
>;

/**
 * El objetivo de cada serie, siempre con tantas entradas como series.
 *
 * Existe para que ningún sitio tenga que preguntarse si el ejercicio lleva
 * progresión: con o sin ella, aquí sale una lista y se recorre igual. Las
 * pantallas que resuelvan esto por su cuenta acabarán discrepando entre sí.
 */
export function targetsOf(exercise: ConObjetivo): SetTarget[] {
  if (exercise.setTargets && exercise.setTargets.length === exercise.sets) {
    return exercise.setTargets;
  }

  return Array.from({ length: exercise.sets }, () => ({
    reps: exercise.targetReps,
    weightKg: exercise.targetWeightKg,
  }));
}

/** ¿Cambia algo entre serie y serie? */
export const isProgressive = (exercise: ConObjetivo): boolean =>
  Boolean(exercise.setTargets && exercise.setTargets.length === exercise.sets);

const formatWeight = (kg: number) =>
  kg === 0 ? "corporal" : `${String(kg).replace(".", ",")} kg`;

/**
 * A partir de cuántas series se deja de enumerar la progresión.
 *
 * Con cuatro pares aún se lee de un vistazo; con seis es una parrafada que
 * nadie procesa antes de empezar a entrenar. Los números siguen estando en
 * cada fila, así que no se pierde nada por no repetirlos aquí.
 */
const MAX_PARES = 4;

/**
 * El objetivo en una línea.
 *
 * Con progresión se enumeran PARES —"60×12 · 70×10 · 80×8"—, que es como se
 * escribe en el gimnasio. La primera versión sacaba dos listas separadas,
 * "12 → 10 → 8 · 60 → 70 → 80 kg", y obligaba a emparejarlas mentalmente para
 * entender que el 12 iba con el 60. Nadie hace eso.
 */
export function targetSummary(exercise: ConObjetivo): string {
  if (!isProgressive(exercise)) {
    return [
      `${exercise.sets} × ${exercise.targetReps}`,
      formatWeight(exercise.targetWeightKg),
    ].join(" · ");
  }

  const targets = targetsOf(exercise);

  if (targets.length > MAX_PARES) {
    return `${exercise.sets} series · progresión`;
  }

  return targets
    .map((target) =>
      target.weightKg === 0
        ? `${target.reps} reps`
        : `${String(target.weightKg).replace(".", ",")}×${target.reps}`
    )
    .join(" · ");
}
