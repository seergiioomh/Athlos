import { supabase } from "@/lib/supabase";

export interface WeightPoint {
  measuredOn: string;
  weightKg: number;
}

/** Últimos pesos registrados, del más antiguo al más reciente. */
export async function fetchWeightHistory(
  userId: string,
  // Más de una semana de margen: la tarjeta compara con el peso de hace siete
  // días, y con solo siete registros esa referencia podía quedarse fuera.
  limit = 14
): Promise<WeightPoint[]> {
  const { data, error } = await supabase
    .from("body_weight_entries")
    .select("measured_on, weight_kg")
    .eq("user_id", userId)
    .order("measured_on", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Pedimos descendente para quedarnos con los últimos, pero la gráfica
  // avanza hacia la derecha en el tiempo.
  return (data ?? [])
    .map((row) => ({
      measuredOn: row.measured_on,
      weightKg: Number(row.weight_kg),
    }))
    .reverse();
}

export async function recordWeight(
  userId: string,
  weightKg: number
): Promise<void> {
  const { error } = await supabase
    .from("body_weight_entries")
    .upsert(
      { user_id: userId, weight_kg: weightKg },
      { onConflict: "user_id,measured_on" }
    );

  if (error) throw error;
}

export interface WeekSession {
  startedAt: string;
  finishedAt: string | null;
}

/** Sesiones de los últimos 7 días, para la tira de "Esta semana". */
export async function fetchRecentSessions(
  userId: string
): Promise<WeekSession[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at, finished_at")
    .eq("user_id", userId)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}

export interface TrainingStats {
  finishedSessions: number;
  completedSets: number;
}

/**
 * Totales acumulados. Se cuentan con `head: true`, así que Postgres devuelve
 * solo el número de filas y no los datos.
 */
export async function fetchStats(userId: string): Promise<TrainingStats> {
  const sessions = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finished_at", "is", null);

  if (sessions.error) throw sessions.error;

  const sets = await supabase
    .from("session_sets")
    .select("id, workout_sessions!inner(user_id)", {
      count: "exact",
      head: true,
    })
    .eq("workout_sessions.user_id", userId);

  if (sets.error) throw sets.error;

  return {
    finishedSessions: sessions.count ?? 0,
    completedSets: sets.count ?? 0,
  };
}
