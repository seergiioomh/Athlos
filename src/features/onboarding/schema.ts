import { z } from "zod";

import type {
  Cardio,
  DailyActivity,
  Equipment,
  Experience,
  FocusArea,
  Goal,
  Sex,
  Sport,
  TechniqueLevel,
  Weekday,
} from "@/types/database";

const currentYear = new Date().getFullYear();

/**
 * Los mensajes de error se enseñan tal cual bajo cada campo, así que están
 * escritos para el usuario, no para el que depura.
 */
export const onboardingSchema = z.object({
  // ------------------------------------------------------------ sobre ti
  displayName: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre")
    .max(40, "Demasiado largo"),

  // Se pregunta por partes porque escribir 12/05/1998 es más rápido que
  // recorrer un selector veintiocho años hacia atrás.
  birthDay: z.coerce
    .number({ error: "Completa tu fecha de nacimiento" })
    .int()
    .min(1, "Día inválido")
    .max(31, "Día inválido"),

  birthMonth: z.coerce
    .number({ error: "Completa tu fecha de nacimiento" })
    .int()
    .min(1, "Mes inválido")
    .max(12, "Mes inválido"),

  birthYear: z.coerce
    .number({ error: "Completa tu fecha de nacimiento" })
    .int()
    .min(1920, "Año inválido")
    .max(currentYear, "Año inválido"),

  sex: z.enum(["hombre", "mujer", "otro"], { error: "Elige una opción" }),

  heightCm: z.coerce
    .number({ error: "Escribe tu altura" })
    .int("Sin decimales")
    .min(100, "Revisa la altura")
    .max(250, "Revisa la altura"),

  weightKg: z.coerce
    .number({ error: "Escribe tu peso" })
    .min(30, "Revisa el peso")
    .max(300, "Revisa el peso"),

  // Opcional: no todo el mundo entrena con un número en la cabeza.
  targetWeightKg: z.coerce
    .number()
    .min(30, "Revisa el peso objetivo")
    .max(300, "Revisa el peso objetivo")
    .optional(),

  // ------------------------------------------------------------- objetivo
  // `mantener` sigue siendo válido en la base pero ya no se ofrece: lo cubren
  // mejor `condicion-fisica` y `recomposicion`.
  goal: z.enum(
    [
      "ganar-musculo",
      "perder-grasa",
      "fuerza",
      "rendimiento",
      "condicion-fisica",
      "recomposicion",
    ],
    { error: "Elige un objetivo" }
  ),

  /**
   * El campo libre. Opcional a propósito: obligar a escribir para poder pasar
   * de pantalla convierte una invitación en un peaje, y lo que se saca de
   * alguien con prisa por saltarse el formulario no vale nada.
   */
  goalNotes: z
    .string()
    .trim()
    .max(500, "Intenta resumirlo un poco más")
    .optional(),

  focusAreas: z
    .array(z.enum(["pecho", "espalda", "hombro", "brazo", "pierna", "gluteo", "core"]))
    .max(4, "Elige como máximo cuatro: si priorizas todo, no priorizas nada")
    .default([]),

  experience: z.enum(["principiante", "intermedio", "avanzado"], {
    error: "Elige tu nivel",
  }),

  techniqueLevel: z.enum(["sin-experiencia", "basica", "solida"], {
    error: "Elige una opción",
  }),

  // -------------------------------------------------------- disponibilidad
  trainingDays: z
    .array(z.enum(["lun", "mar", "mie", "jue", "vie", "sab", "dom"]))
    .min(1, "Elige al menos un día")
    .max(7),

  // 0 es el comodín de "me da igual": se guarda como null para que la IA
  // decida la duración en vez de forzarla.
  sessionMinutes: z.coerce
    .number({ error: "Elige cuánto tiempo tienes" })
    .int()
    .refine(
      (value) => value === 0 || (value >= 15 && value <= 180),
      "Elige una opción"
    ),

  equipment: z.enum(["gimnasio", "casa", "corporal"], {
    error: "Elige dónde entrenas",
  }),

  // ------------------------------------------------------------- deporte
  /**
   * Lo que hace fuera del gimnasio. Condiciona la recuperación tanto como el
   * sueño: quien juega al fútbol dos días ya mete carga de piernas que el plan
   * no debería duplicar.
   *
   * Obligatorio: 'ninguno' es una respuesta, no una ausencia. Distinguir "no
   * practica nada" de "no se le ha preguntado" importa para el prompt.
   */
  sport: z.enum(
    ["ninguno", "futbol", "running", "baloncesto", "ciclismo", "otro"],
    { error: "Elige una opción" }
  ),

  sportDays: z.coerce.number().int().min(1).max(7).optional(),

  // ------------------------------------------------- ya no se preguntan
  /**
   * Estos campos salen de la bienvenida en el rediseño, pero siguen en la
   * base. Opcionales para que los perfiles antiguos no se rompan.
   */
  cardio: z.enum(["ninguno", "poco", "moderado", "mucho"]).optional(),

  dailyActivity: z
    .enum(["sedentaria", "ligera", "activa", "muy-activa"])
    .optional(),

  limitations: z.string().trim().max(300, "Demasiado largo").optional(),
  avoidExercises: z.string().trim().max(300, "Demasiado largo").optional(),
}).superRefine((values, ctx) => {
  // Los días solo se piden a quien practica algo, así que solo se exigen ahí.
  if (values.sport && values.sport !== "ninguno" && !values.sportDays) {
    ctx.addIssue({
      code: "custom",
      message: "Elige cuántos días a la semana",
      path: ["sportDays"],
    });
  }
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

/** Lo que se guarda en `profiles`. La edad se convierte a año de nacimiento. */
export const toProfileUpdate = (values: OnboardingValues) => ({
  display_name: values.displayName,
  birth_date: [
    values.birthYear,
    String(values.birthMonth).padStart(2, "0"),
    String(values.birthDay).padStart(2, "0"),
  ].join("-"),
  sex: values.sex,
  height_cm: values.heightCm,
  weight_kg: values.weightKg,
  target_weight_kg: values.targetWeightKg ?? null,
  goal: values.goal,
  goal_notes: values.goalNotes || null,
  focus_areas: values.focusAreas.length > 0 ? values.focusAreas : null,
  experience: values.experience,
  technique_level: values.techniqueLevel,
  training_days: values.trainingDays,
  // Se deriva de los días elegidos para que no puedan contradecirse.
  days_per_week: values.trainingDays.length,
  session_minutes: sessionMinutesToDb(values.sessionMinutes),
  equipment: values.equipment,
  sport: values.sport ?? null,
  // Sin deporte no hay días que guardar, aunque hubieran quedado en el
  // borrador de una elección anterior.
  sport_days:
    values.sport && values.sport !== "ninguno"
      ? (values.sportDays ?? null)
      : null,
  cardio: values.cardio ?? null,
  daily_activity: values.dailyActivity ?? null,
  limitations: values.limitations || null,
  avoid_exercises: values.avoidExercises || null,
  onboarded_at: new Date().toISOString(),
});

// --------------------------------------------------------------- etiquetas

export const sexOptions: { value: Sex; label: string }[] = [
  { value: "hombre", label: "Hombre" },
  { value: "mujer", label: "Mujer" },
  { value: "otro", label: "Otro" },
];

/**
 * `mantener` no está: lo cubren mejor `condicion-fisica` y `recomposicion`.
 * Sigue siendo un valor válido en la base para los perfiles que ya lo tienen,
 * solo que no se puede volver a elegir.
 */
export const goalOptions: { value: Goal; label: string }[] = [
  { value: "ganar-musculo", label: "Ganar músculo" },
  { value: "perder-grasa", label: "Perder grasa" },
  { value: "fuerza", label: "Ganar fuerza" },
  { value: "rendimiento", label: "Mejorar rendimiento" },
  { value: "condicion-fisica", label: "Mejorar condición física" },
  { value: "recomposicion", label: "Recomposición corporal" },
];

export const sportOptions: { value: Sport; label: string }[] = [
  { value: "ninguno", label: "No" },
  { value: "futbol", label: "Fútbol" },
  { value: "running", label: "Running" },
  { value: "baloncesto", label: "Baloncesto" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "otro", label: "Otro" },
];

export const sportDaysOptions = [1, 2, 3, 4, 5, 6, 7].map((days) => ({
  value: days,
  label: days === 1 ? "1 día" : `${days} días`,
}));

export const focusAreaOptions: { value: FocusArea; label: string }[] = [
  { value: "pecho", label: "Pecho" },
  { value: "espalda", label: "Espalda" },
  { value: "hombro", label: "Hombro" },
  { value: "brazo", label: "Brazo" },
  { value: "pierna", label: "Pierna" },
  { value: "gluteo", label: "Glúteo" },
  { value: "core", label: "Core" },
];

export const experienceOptions: { value: Experience; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

export const techniqueOptions: { value: TechniqueLevel; label: string }[] = [
  { value: "sin-experiencia", label: "No los he hecho" },
  { value: "basica", label: "Más o menos" },
  { value: "solida", label: "Con soltura" },
];

export const weekdayOptions: { value: Weekday; label: string }[] = [
  { value: "lun", label: "L" },
  { value: "mar", label: "M" },
  { value: "mie", label: "X" },
  { value: "jue", label: "J" },
  { value: "vie", label: "V" },
  { value: "sab", label: "S" },
  { value: "dom", label: "D" },
];

export const sessionMinutesOptions = [
  ...[30, 45, 60, 75, 90].map((minutes) => ({
    value: minutes,
    label: `${minutes} min`,
  })),
  // 0 = sin límite declarado. Se guarda como null.
  { value: 0, label: "Me da igual" },
];

/**
 * La interfaz usa 0 para "me da igual"; la base guarda null.
 *
 * La columna tiene `check (session_minutes between 15 and 180)`. Un null pasa
 * la comprobación —los nulos siempre la pasan— pero un 0 no, así que mandar el
 * valor del chip sin traducir revienta al guardar.
 *
 * Están aquí, y no dentro de cada pantalla, porque el fallo vino justo de eso:
 * la bienvenida traducía y la hoja de edición del perfil no.
 */
export const sessionMinutesToDb = (value: number | null | undefined) =>
  value ? value : null;

export const sessionMinutesFromDb = (value: number | null | undefined) =>
  value ?? 0;

export const equipmentOptions: { value: Equipment; label: string }[] = [
  { value: "gimnasio", label: "Gimnasio" },
  { value: "casa", label: "Casa con material" },
  { value: "corporal", label: "Solo peso corporal" },
];

export const cardioOptions: { value: Cardio; label: string }[] = [
  { value: "ninguno", label: "Ninguno" },
  { value: "poco", label: "Algo" },
  { value: "moderado", label: "Moderado" },
  { value: "mucho", label: "Bastante" },
];

export const dailyActivityOptions: { value: DailyActivity; label: string }[] = [
  { value: "sedentaria", label: "Sentado casi todo el día" },
  { value: "ligera", label: "Algo de movimiento" },
  { value: "activa", label: "De pie o andando" },
  { value: "muy-activa", label: "Trabajo físico" },
];

/** Los días por semana ya no se preguntan: salen de `trainingDays`. */
export const daysOptions = [2, 3, 4, 5, 6].map((days) => ({
  value: days,
  label: `${days} días`,
}));
