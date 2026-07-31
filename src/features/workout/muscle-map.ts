import type { ExtendedBodyPart, Slug } from "react-native-body-highlighter";

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

/** Zonas que solo existen en la vista de espaldas. */
const BACK_ONLY: Slug[] = ["gluteal", "hamstring", "lower-back", "upper-back"];

/**
 * Cuántos ejercicios tocan cada zona, convertido a la intensidad que espera
 * la ilustración: 1 para una sola aparición, 2 a partir de dos.
 */
export function bodyPartsFor(
  exercises: Pick<SuggestedExercise, "muscleGroup">[]
): ExtendedBodyPart[] {
  const hits = new Map<Slug, number>();

  for (const exercise of exercises) {
    for (const slug of MUSCLE_SLUGS[exercise.muscleGroup] ?? []) {
      hits.set(slug, (hits.get(slug) ?? 0) + 1);
    }
  }

  return [...hits.entries()].map(([slug, count]) => ({
    slug,
    intensity: count > 1 ? 2 : 1,
  }));
}

/**
 * Qué cara enseñar. Un día de tirón ilumina espalda y glúteo, así que la
 * vista frontal saldría casi vacía: elegimos la que tiene más que contar.
 */
export function bestSideFor(parts: ExtendedBodyPart[]): "front" | "back" {
  const back = parts.filter(
    (part) => part.slug && BACK_ONLY.includes(part.slug)
  ).length;

  return back > parts.length - back ? "back" : "front";
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
export function regionFor(parts: ExtendedBodyPart[]): BodyRegion {
  const legs = parts.some((part) => part.slug && LEG_SLUGS.includes(part.slug));
  const torso = parts.some(
    (part) => part.slug && !LEG_SLUGS.includes(part.slug)
  );

  if (legs && torso) return "full";

  return legs ? "legs" : "torso";
}
