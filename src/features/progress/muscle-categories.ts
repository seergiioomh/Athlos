/**
 * Agrupación gruesa de "Tus marcas": el catálogo distingue veinte grupos
 * musculares para que la IA reparta bien la sesión, pero esa misma finura
 * como filtro da veinte chips — demasiados para elegir de un vistazo. Aquí
 * se juntan en las categorías con las que piensa cualquiera que entrena.
 *
 * Core y Cuerpo completo no las pidieron, pero sin ellas el press de
 * abdomen o los burpees desaparecerían de "Tus marcas" sin más: mejor dos
 * categorías de más que marcas que no aparecen en ningún sitio.
 */
const MUSCLE_CATEGORIES: Record<string, string> = {
  Pecho: "Pecho",
  "Pecho superior": "Pecho",

  Espalda: "Espalda",
  Dorsal: "Espalda",
  Lumbar: "Espalda",
  Trapecio: "Espalda",

  Hombro: "Hombro",
  Deltoides: "Hombro",
  "Deltoides post.": "Hombro",

  Bíceps: "Brazo",
  Tríceps: "Brazo",
  Antebrazo: "Brazo",

  Cuádriceps: "Pierna",
  "Cadena posterior": "Pierna",
  Isquiotibiales: "Pierna",
  Glúteo: "Pierna",
  "Glúteo medio": "Pierna",
  Aductores: "Pierna",
  Gemelos: "Pierna",

  Core: "Core",
  Oblicuos: "Core",

  "Cuerpo completo": "Cuerpo completo",
};

/**
 * Las cinco categorías que se muestran en "Tus marcas". Core y Cuerpo
 * completo se calculan (arriba) pero se quedan fuera a propósito: quien
 * entrena quiere ver pecho, espalda, hombro, brazo y pierna, no un cajón de
 * sastre con burpees y planchas.
 */
export const MUSCLE_CATEGORY_ORDER = ["Pecho", "Espalda", "Hombro", "Brazo", "Pierna"];

export function categoryFor(muscleGroup: string): string {
  return MUSCLE_CATEGORIES[muscleGroup] ?? muscleGroup;
}
