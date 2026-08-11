import type { Goal } from "@/types/database";

export type WeightDirection = "up" | "down" | "neutral";

/**
 * Hacia dónde tiene que ir el peso para que sea buena noticia. No es lo
 * mismo para todo el mundo: subir 200 g es justo lo que persigue quien
 * quiere ganar músculo, y justo lo contrario de lo que quiere quien busca
 * perder grasa. Pintar siempre "sube = naranja, baja = verde" mentía a la
 * mitad de los usuarios.
 *
 * El peso objetivo manda si existe —es la señal más directa—, y si no hay
 * ninguno se cae al objetivo general. `fuerza`, `rendimiento`,
 * `condicion-fisica`, `recomposicion` y `mantener` no dicen nada sobre la
 * báscula, así que se quedan neutros.
 */
export function goodWeightDirection(
  goal: Goal | null,
  targetWeightKg: number | null,
  currentWeightKg: number | undefined
): WeightDirection {
  if (targetWeightKg != null && currentWeightKg != null) {
    if (targetWeightKg > currentWeightKg) return "up";
    if (targetWeightKg < currentWeightKg) return "down";
    return "neutral";
  }

  if (goal === "ganar-musculo") return "up";
  if (goal === "perder-grasa") return "down";

  return "neutral";
}
