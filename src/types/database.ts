/**
 * Tipos de la base de datos, escritos a mano para que coincidan con
 * supabase/migrations/0001_workout_schema.sql.
 *
 * Cuando el proyecto exista se pueden regenerar solos y sustituir este
 * archivo entero:
 *   npx supabase gen types typescript --project-id TU-PROYECTO > src/types/database.ts
 */

export type Sex = "hombre" | "mujer" | "otro";
export type Goal = "perder-grasa" | "ganar-musculo" | "fuerza" | "mantener";
export type Experience = "principiante" | "intermedio" | "avanzado";
export type Equipment = "gimnasio" | "casa" | "corporal";
export type Weekday = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
export type TechniqueLevel = "sin-experiencia" | "basica" | "solida";
export type FocusArea =
  | "pecho"
  | "espalda"
  | "hombro"
  | "brazo"
  | "pierna"
  | "gluteo"
  | "core";
export type DailyActivity = "sedentaria" | "ligera" | "activa" | "muy-activa";
export type Cardio = "ninguno" | "poco" | "moderado" | "mucho";

export interface WeeklySplitDay {
  day: Weekday;
  label: string;
  focus: string;
}

export interface WeeklySplitRow {
  id: string;
  user_id: string;
  name: string;
  rationale: string | null;
  days: WeeklySplitDay[];
  active: boolean;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  goal: Goal | null;
  focus_areas: FocusArea[] | null;
  experience: Experience | null;
  technique_level: TechniqueLevel | null;
  days_per_week: number | null;
  training_days: Weekday[] | null;
  session_minutes: number | null;
  equipment: Equipment | null;
  daily_activity: DailyActivity | null;
  sleep_hours: number | null;
  cardio: Cardio | null;
  limitations: string | null;
  avoid_exercises: string | null;
  onboarded_at: string | null;
  created_at: string;
}

export interface ExerciseRow {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  is_bodyweight: boolean;
}

export interface WorkoutPlanRow {
  id: string;
  user_id: string;
  title: string;
  focus: string | null;
  scheduled_for: string;
  source: "ai" | "manual";
  ai_model: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PlanExerciseRow {
  id: string;
  plan_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  target_reps: number;
  target_weight_kg: number;
  rest_seconds: number;
  ai_note: string | null;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  plan_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface SessionSetRow {
  id: string;
  session_id: string;
  plan_exercise_id: string | null;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed_at: string;
}

/** Fila de plan_exercises con su ejercicio ya resuelto por el join. */
export type PlanExerciseWithExercise = PlanExerciseRow & {
  exercises: ExerciseRow;
};
