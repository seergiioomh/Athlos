import { supabase } from "@/lib/supabase";
import type { WeightPoint } from "./home";

export interface ProgressSummary {
  finishedSessions: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  lastSession: string | null;
}

export interface PeriodSummary {
  sessionsCurrent: number;
  sessionsPrevious: number;
  setsCurrent: number;
  setsPrevious: number;
  volumeCurrentKg: number;
  volumePreviousKg: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  bestWeightKg: number;
  bestReps: number;
  totalSets: number;
  lastPerformed: string | null;
}

export async function fetchProgressSummary(
  userId: string
): Promise<ProgressSummary> {
  const { data, error } = await supabase
    .rpc("progress_summary", { p_user_id: userId })
    .single();

  if (error) throw error;

  const row = data as {
    finished_sessions: number;
    total_sets: number;
    total_reps: number;
    total_volume_kg: number;
    last_session: string | null;
  };

  return {
    finishedSessions: Number(row.finished_sessions),
    totalSets: Number(row.total_sets),
    totalReps: Number(row.total_reps),
    totalVolumeKg: Number(row.total_volume_kg),
    lastSession: row.last_session,
  };
}

/** Totales del periodo seleccionado, contra el mismo número de días anterior. */
export async function fetchPeriodSummary(
  userId: string,
  days: number
): Promise<PeriodSummary> {
  const { data, error } = await supabase
    .rpc("progress_period_summary", { p_user_id: userId, p_days: days })
    .single();

  if (error) throw error;

  const row = data as {
    sessions_current: number;
    sessions_previous: number;
    sets_current: number;
    sets_previous: number;
    volume_current: number;
    volume_previous: number;
  };

  return {
    sessionsCurrent: Number(row.sessions_current),
    sessionsPrevious: Number(row.sessions_previous),
    setsCurrent: Number(row.sets_current),
    setsPrevious: Number(row.sets_previous),
    volumeCurrentKg: Number(row.volume_current),
    volumePreviousKg: Number(row.volume_previous),
  };
}

export async function fetchExerciseProgress(
  userId: string
): Promise<ExerciseProgress[]> {
  const { data, error } = await supabase.rpc("exercise_progress", {
    p_user_id: userId,
  });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    exerciseId: String(row.exercise_id),
    name: String(row.name),
    muscleGroup: String(row.muscle_group),
    bestWeightKg: Number(row.best_weight_kg),
    bestReps: Number(row.best_reps),
    totalSets: Number(row.total_sets),
    lastPerformed: (row.last_performed as string) ?? null,
  }));
}

/**
 * Entrenamientos completados seguidos. `maxGap` es el descanso máximo en
 * días que la racha tolera entre sesiones.
 */
export async function fetchStreak(
  userId: string,
  maxGap: number
): Promise<number> {
  const { data, error } = await supabase.rpc("workout_streak", {
    p_user_id: userId,
    p_max_gap: maxGap,
  });

  if (error) throw error;

  return Number(data ?? 0);
}

/** Pesos de los últimos `days` días, del más antiguo al más reciente. */
export async function fetchWeightRange(
  userId: string,
  days: number
): Promise<WeightPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("body_weight_entries")
    .select("measured_on, weight_kg")
    .eq("user_id", userId)
    .gte("measured_on", since.toISOString().slice(0, 10))
    .order("measured_on", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    measuredOn: row.measured_on,
    weightKg: Number(row.weight_kg),
  }));
}
