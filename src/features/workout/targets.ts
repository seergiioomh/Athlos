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
 * El objetivo en una línea.
 *
 * Con progresión no se puede resumir en "4 × 10 · 60 kg" sin mentir, así que
 * se enumeran los pesos: "12 → 10 → 8 reps · 60 → 70 → 80 kg". Si la lista se
 * hace larga, la pantalla enseña el objetivo serie a serie y esto no se usa.
 */
export function targetSummary(exercise: ConObjetivo): string {
  if (!isProgressive(exercise)) {
    return [
      `${exercise.sets} × ${exercise.targetReps}`,
      formatWeight(exercise.targetWeightKg),
    ].join(" · ");
  }

  const targets = targetsOf(exercise);
  const mismoPeso = targets.every(
    (target) => target.weightKg === targets[0].weightKg
  );
  const mismasReps = targets.every(
    (target) => target.reps === targets[0].reps
  );

  const reps = mismasReps
    ? `${exercise.sets} × ${targets[0].reps}`
    : targets.map((target) => target.reps).join(" → ");

  const peso = mismoPeso
    ? formatWeight(targets[0].weightKg)
    : `${targets.map((target) => target.weightKg).join(" → ")} kg`;

  return `${reps} · ${peso}`;
}
