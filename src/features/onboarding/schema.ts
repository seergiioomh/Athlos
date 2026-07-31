import { z } from "zod";

import type {
  Cardio,
  DailyActivity,
  Equipment,
  Experience,
  FocusArea,
  Goal,
  Sex,
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
  goal: z.enum(["perder-grasa", "ganar-musculo", "fuerza", "mantener"], {
    error: "Elige un objetivo",
  }),

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

  cardio: z.enum(["ninguno", "poco", "moderado", "mucho"], {
    error: "Elige una opción",
  }),

  // --------------------------------------------------------------- salud
  dailyActivity: z.enum(["sedentaria", "ligera", "activa", "muy-activa"], {
    error: "Elige una opción",
  }),

  sleepHours: z.coerce
    .number({ error: "Elige cuánto duermes" })
    .min(3)
    .max(14),

  limitations: z.string().trim().max(300, "Demasiado largo").optional(),
  avoidExercises: z.string().trim().max(300, "Demasiado largo").optional(),
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
  focus_areas: values.focusAreas.length > 0 ? values.focusAreas : null,
  experience: values.experience,
  technique_level: values.techniqueLevel,
  training_days: values.trainingDays,
  // Se deriva de los días elegidos para que no puedan contradecirse.
  days_per_week: values.trainingDays.length,
  session_minutes: values.sessionMinutes === 0 ? null : values.sessionMinutes,
  equipment: values.equipment,
  cardio: values.cardio,
  daily_activity: values.dailyActivity,
  sleep_hours: values.sleepHours,
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

export const goalOptions: { value: Goal; label: string }[] = [
  { value: "perder-grasa", label: "Perder grasa" },
  { value: "ganar-musculo", label: "Ganar músculo" },
  { value: "fuerza", label: "Ganar fuerza" },
  { value: "mantener", label: "Mantenerme" },
];

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

export const sleepOptions = [5, 6, 7, 8, 9].map((hours) => ({
  value: hours,
  label: `${hours} h`,
}));

/** Los días por semana ya no se preguntan: salen de `trainingDays`. */
export const daysOptions = [2, 3, 4, 5, 6].map((days) => ({
  value: days,
  label: `${days} días`,
}));
