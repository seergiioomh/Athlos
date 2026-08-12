import { supabase } from "@/lib/supabase";
import type { AchievementMetrics } from "@/features/achievements/definitions";

export interface UnlockedAchievement {
  slug: string;
  unlockedAt: string;
}

export async function fetchAchievementMetrics(
  userId: string
): Promise<AchievementMetrics> {
  const { data, error } = await supabase
    .rpc("achievement_metrics", { p_user_id: userId })
    .single();

  if (error) throw error;

  const row = data as Record<string, number | string>;

  return {
    sessionsFinished: Number(row.sessions_finished),
    totalSets: Number(row.total_sets),
    totalVolumeKg: Number(row.total_volume_kg),
    distinctExercises: Number(row.distinct_exercises),
    distinctMuscleGroups: Number(row.distinct_muscle_groups),
    maxWeightKg: Number(row.max_weight_kg),
    weightEntries: Number(row.weight_entries),
    sharedWorkouts: Number(row.shared_workouts),
    earlySessions: Number(row.early_sessions),
    lateSessions: Number(row.late_sessions),
    weekendSessions: Number(row.weekend_sessions),
    longSessions: Number(row.long_sessions),
    cycleLaps: Number(row.cycle_laps),
    battlesPlayed: Number(row.battles_played),
    battlesWon: Number(row.battles_won),
    bestStreak: Number(row.best_streak),
  };
}

export async function fetchUnlocked(
  userId: string
): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("slug, unlocked_at")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    unlockedAt: row.unlocked_at as string,
  }));
}

/**
 * Guarda los logros recién conseguidos y devuelve solo esos.
 *
 * `ignoreDuplicates` hace el trabajo: se mandan todos los que las métricas dan
 * por ganados, y Postgres se queda con los que aún no estaban. Así no hace
 * falta leer primero para comparar, y dos llamadas a la vez —terminar un
 * entrenamiento y abrir la pantalla— no pueden insertar el mismo dos veces.
 *
 * Lo que vuelve es lo que se acaba de desbloquear, que es justo lo que la
 * pantalla de fin de entrenamiento necesita celebrar.
 */
export async function unlockAchievements(
  userId: string,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return [];

  const { data, error } = await supabase
    .from("user_achievements")
    .upsert(
      slugs.map((slug) => ({ user_id: userId, slug })),
      { onConflict: "user_id,slug", ignoreDuplicates: true }
    )
    .select("slug");

  if (error) throw error;

  return (data ?? []).map((row) => row.slug as string);
}
