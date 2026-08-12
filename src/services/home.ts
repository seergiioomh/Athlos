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
  id: string;
  startedAt: string;
  finishedAt: string | null;
  /**
   * Null si el plan de esa sesión se borró (regenerarlo lo desengancha, no lo
   * borra a él). Sin plan no hay nada que enseñar al tocar el día.
   */
  planId: string | null;
}

/**
 * Sesiones recientes, para la tira de "Esta semana" en Inicio.
 *
 * La ventana es un poco más ancha que los días que la tira enseña hacia
 * atrás (`WorkoutHistory.DAYS_BACK`, hoy 7): así un ajuste pequeño de la tira
 * no deja el borde sin datos en silencio.
 */
const HISTORY_MARGIN_DAYS = 10;

export async function fetchRecentSessions(
  userId: string
): Promise<WeekSession[]> {
  const since = new Date();
  since.setDate(since.getDate() - HISTORY_MARGIN_DAYS);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, started_at, finished_at, plan_id")
    .eq("user_id", userId)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    planId: row.plan_id,
}));
}

export interface CompletedWorkoutExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: { number: number; weightKg: number; reps: number }[];
}

/** Las series que se registraron de verdad en una sesión ya terminada. */
export async function fetchCompletedWorkout(
  sessionId: string
): Promise<CompletedWorkoutExercise[]> {
  const { data, error } = await supabase
    .from("session_sets")
    .select("exercise_id, set_number, weight_kg, reps, exercises ( name, muscle_group )")
    .eq("session_id", sessionId)
    .order("completed_at", { ascending: true });

  if (error) throw error;

  const exercises = new Map<string, CompletedWorkoutExercise>();

  for (const row of data ?? []) {
    const exercise = row.exercises as unknown as {
      name: string;
      muscle_group: string;
    } | null;
    if (!exercise) continue;

    const existing = exercises.get(row.exercise_id);
    const set = {
      number: row.set_number,
      weightKg: Number(row.weight_kg),
      reps: row.reps,
    };

    if (existing) {
      existing.sets.push(set);
    } else {
      exercises.set(row.exercise_id, {
        exerciseId: row.exercise_id,
        name: exercise.name,
        muscleGroup: exercise.muscle_group,
        sets: [set],
      });
    }
  }

  return [...exercises.values()];
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
