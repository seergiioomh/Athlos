import type { Slug } from "react-native-body-highlighter";

import type { SuggestedExercise } from "./types";

/**
 * Traducción de nuestros grupos musculares a las zonas que dibuja la figura.
 *
 * El catálogo usa nombres pensados para leerse ("Deltoides post.", "Cadena
 * posterior") y la ilustración usa slugs anatómicos, así que hace falta un
 * puente. Un grupo puede iluminar varias zonas: el peso muerto trabaja
 * isquios y glúteo, y enseñar solo uno mentiría.
 */
const MUSCLE_SLUGS: Record<string, Slug[]> = {
  Pecho: ["chest"],
  "Pecho superior": ["chest"],
  Hombro: ["deltoids"],
  Deltoides: ["deltoids"],
  "Deltoides post.": ["deltoids", "upper-back"],
  Tríceps: ["triceps"],
  Espalda: ["upper-back"],
  Dorsal: ["upper-back"],
  Lumbar: ["lower-back"],
  Trapecio: ["trapezius"],
  Bíceps: ["biceps"],
  Antebrazo: ["forearm"],
  Cuádriceps: ["quadriceps"],
  "Cadena posterior": ["hamstring", "gluteal", "lower-back"],
  Isquiotibiales: ["hamstring"],
  Glúteo: ["gluteal"],
  "Glúteo medio": ["gluteal"],
  Aductores: ["adductors"],
  Gemelos: ["calves"],
  Core: ["abs"],
  Oblicuos: ["obliques"],
  "Cuerpo completo": ["chest", "upper-back", "quadriceps", "abs"],
};

/**
 * Zonas que solo existen en una de las dos vistas de la ilustración —no es
 * una limitación nuestra, es anatomía: no se ve el bíceps de espaldas. Sirve
 * para decidir qué cara enseñar: la que tenga más que contar.
 */
const BACK_ONLY: Slug[] = ["gluteal", "hamstring", "lower-back", "upper-back"];

export interface MuscleHit {
  slug: Slug;
  /**
   * Principal si algún ejercicio lo pone como su primer grupo (el nombre por
   * el que se le conoce: "Bíceps" → biceps); secundario si solo aparece como
   * zona extra de otro grupo (el dorsal que también enciende el peso muerto).
   */
  role: "primary" | "secondary";
}

/**
 * Qué zonas tocan estos ejercicios, y si cada una es el objetivo del
 * ejercicio o algo que se lleva de paso. La primera zona de cada grupo en
 * `MUSCLE_SLUGS` es la que da nombre al grupo, así que manda como principal
 * en cuanto un ejercicio la nombra así, aunque otro la traiga solo de
 * refuerzo.
 */
export function bodyPartsFor(
  exercises: Pick<SuggestedExercise, "muscleGroup">[]
): MuscleHit[] {
  const roles = new Map<Slug, "primary" | "secondary">();

  for (const exercise of exercises) {
    const slugs = MUSCLE_SLUGS[exercise.muscleGroup] ?? [];

    slugs.forEach((slug, index) => {
      const role = index === 0 ? "primary" : "secondary";
      if (role === "primary" || roles.get(slug) !== "primary") {
        roles.set(slug, role);
      }
    });
  }

  return [...roles.entries()].map(([slug, role]) => ({ slug, role }));
}

/**
 * Qué cara enseñar. Un día de tirón ilumina espalda y glúteo, así que la
 * vista frontal saldría casi vacía: elegimos la que tiene más que contar.
 *
 * Pesa por EJERCICIO, no por zona distinta. Con zonas distintas, un día con
 * dos ejercicios de espalda (una sola zona: `upper-back`) más uno de bíceps y
 * uno de deltoides posterior (dos zonas de delante) contaba 1 zona detrás
 * contra 2 delante y elegía la vista frontal — donde `upper-back` no existe,
 * así que el trabajo de espalda, que era el grueso real del día, desaparecía
 * entero. Contando ejercicios en vez de zonas, esos mismos cuatro salen 3
 * detrás (los dos de espalda más el de deltoides posterior, que ilumina las
 * dos caras) contra 1 delante, y gana la vista que de verdad tiene más que
 * enseñar.
 */
export function bestSideFor(
  exercises: Pick<SuggestedExercise, "muscleGroup">[]
): "front" | "back" {
  let back = 0;
  let front = 0;

  for (const exercise of exercises) {
    for (const slug of MUSCLE_SLUGS[exercise.muscleGroup] ?? []) {
      if (BACK_ONLY.includes(slug)) back++;
      else front++;
    }
  }

  return back > front ? "back" : "front";
}

const LEG_SLUGS: Slug[] = [
  "quadriceps",
  "hamstring",
  "gluteal",
  "adductors",
  "calves",
  "tibialis",
  "knees",
];

export type BodyRegion = "torso" | "legs" | "full";

/**
 * Qué trozo del cuerpo merece la pena enseñar. Un día de empuje no necesita
 * las piernas en pantalla, y recortarlas deja la ilustración al doble de
 * tamaño en el mismo hueco.
 */
export function regionFor(parts: Pick<MuscleHit, "slug">[]): BodyRegion {
  const legs = parts.some((part) => LEG_SLUGS.includes(part.slug));
  const torso = parts.some((part) => !LEG_SLUGS.includes(part.slug));

  if (legs && torso) return "full";

  return legs ? "legs" : "torso";
}
