import * as Linking from "expo-linking";

import { isProgressive, targetsOf } from "./targets";
import type { WorkoutPlan } from "./types";

/**
 * Un entrenamiento tal y como viaja de un móvil a otro.
 *
 * Los ejercicios se identifican por `slug` y no por id: los ids son filas de
 * una base concreta, mientras que el slug identifica el ejercicio en sí, así
 * que el móvil que lo recibe puede resolverlo contra su propio catálogo.
 */
export interface SharedWorkout {
  title: string;
  focus: string;
  sharedBy: string;
  exercises: {
    slug: string;
    sets: number;
    targetReps: number;
    targetWeightKg: number;
    /** Objetivo por serie si el ejercicio lleva progresión. */
    setTargets: { reps: number; weightKg: number }[] | null;
    restSeconds: number;
  }[];
}

/**
 * Formato del enlace, por si algún día cambia.
 *
 * Va dentro del propio enlace para que una versión futura pueda reconocer un
 * enlace viejo en vez de intentar leerlo y fallar a mitad.
 */
const VERSION = 1;

/**
 * Lo que viaja se acorta a mano: claves de una letra y cada ejercicio como
 * una lista posicional en vez de un objeto.
 *
 * No es microoptimización: el enlace se pega en WhatsApp, y un JSON con
 * nombres largos multiplica por tres su longitud sin aportar nada. Aquí el
 * formato lo leen dos funciones de este mismo archivo, no una persona.
 */
interface Packed {
  v: number;
  t: string;
  f: string;
  b: string;
  /**
   * [slug, series, repeticiones, kg, descanso, progresión?]
   *
   * La progresión solo viaja si el ejercicio la lleva. Va como pares
   * [repeticiones, kg] y va al final para que un enlace sin ella pese
   * exactamente lo mismo que antes: la mayoría de ejercicios no la tienen y no
   * hay motivo para alargarles el enlace.
   */
  e: [string, number, number, number, number, [number, number][]?][];
}

/** Límites de la base (ver 0001_workout_schema.sql). */
const LIMITS = {
  sets: { min: 1, max: 12 },
  reps: { min: 1, max: 100 },
  rest: { min: 0, max: 600 },
  weight: { min: 0, max: 999 },
};

const clamp = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(Math.max(value, min), max);

/** El enlace que se comparte. Contiene el entrenamiento entero. */
export function encodeWorkout(plan: WorkoutPlan, sharedBy: string): string {
  const packed: Packed = {
    v: VERSION,
    t: plan.title,
    f: plan.focus,
    b: sharedBy,
    e: plan.exercises.map((exercise) => {
      const base: [string, number, number, number, number] = [
        exercise.slug,
        exercise.sets,
        exercise.targetReps,
        exercise.targetWeightKg,
        exercise.restSeconds,
      ];

      // Sin progresión, el enlace queda igual de corto que antes.
      if (!isProgressive(exercise)) return base;

      return [
        ...base,
        targetsOf(exercise).map(
          (target) => [target.reps, target.weightKg] as [number, number]
        ),
      ];
    }),
  };

  // `createURL` se encarga de codificar el parámetro y de poner el esquema
  // que corresponda, igual que en la recuperación de contraseña.
  return Linking.createURL("shared-workout", {
    queryParams: { w: JSON.stringify(packed) },
  });
}

/**
 * Lee un entrenamiento de un enlace, o null si no hay nada utilizable.
 *
 * Trata el contenido como entrada externa, porque lo es: el enlace pasa por
 * WhatsApp y cualquiera puede editarlo antes de abrirlo. Los números se
 * recortan a los límites que acepta la base en vez de confiar en ellos; si no,
 * un enlace manipulado con 900 series fallaría al guardar con un error de
 * restricción que no dice nada.
 */
export function decodeWorkout(url: string): SharedWorkout | null {
  let raw: string | undefined;

  try {
    const parsed = Linking.parse(url);
    const value = parsed.queryParams?.w;
    raw = Array.isArray(value) ? value[0] : (value ?? undefined);
  } catch {
    return null;
  }

  if (!raw) return null;

  let packed: Partial<Packed>;

  try {
    packed = JSON.parse(raw) as Partial<Packed>;
  } catch {
    return null;
  }

  if (packed.v !== VERSION || !Array.isArray(packed.e)) return null;

  const exercises = packed.e.flatMap((entry) => {
    if (!Array.isArray(entry)) return [];

    const [slug, sets, reps, weight, rest, progresion] = entry;

    // Sin slug no hay forma de saber qué ejercicio es, y ese sí que no se
    // puede recortar a un valor razonable.
    if (typeof slug !== "string" || !slug) return [];

    const series = clamp(Math.round(Number(sets) || 1), LIMITS.sets);

    // Igual que el resto: viene de fuera, así que se recorta a los límites de
    // la base. Si no cuadra con el número de series se descarta entera y el
    // ejercicio se queda uniforme, que es peor que el original pero utilizable.
    const setTargets =
      Array.isArray(progresion) && progresion.length === series
        ? progresion.map((par) => ({
            reps: clamp(Math.round(Number(par?.[0]) || 1), LIMITS.reps),
            weightKg: clamp(Number(par?.[1]) || 0, LIMITS.weight),
          }))
        : null;

    return [
      {
        slug,
        sets: series,
        targetReps: clamp(Math.round(Number(reps) || 1), LIMITS.reps),
        targetWeightKg: clamp(Number(weight) || 0, LIMITS.weight),
        setTargets,
        restSeconds: clamp(Math.round(Number(rest) || 0), LIMITS.rest),
      },
    ];
  });

  if (exercises.length === 0) return null;

  return {
    title: typeof packed.t === "string" && packed.t ? packed.t : "Entrenamiento compartido",
    focus: typeof packed.f === "string" ? packed.f : "",
    // El nombre se recorta al mismo tope que la columna `shared_by`.
    sharedBy:
      typeof packed.b === "string" ? packed.b.trim().slice(0, 40) : "",
    exercises,
  };
}
