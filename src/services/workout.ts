import { supabase } from "@/lib/supabase";
import type { PlanExerciseWithExercise, WorkoutPlanRow } from "@/types/database";
import type { CompletedSet, WorkoutPlan } from "@/features/workout/types";

const PLAN_SELECT = `
  id, user_id, title, focus, scheduled_for, source, ai_model,
  completed_at, created_at,
  plan_exercises (
    id, plan_id, exercise_id, position, sets, target_reps,
    target_weight_kg, rest_seconds, ai_note,
    exercises ( id, slug, name, muscle_group, is_bodyweight )
  )
`;

type PlanWithExercises = WorkoutPlanRow & {
  plan_exercises: PlanExerciseWithExercise[];
};

const toDomain = (row: PlanWithExercises): WorkoutPlan => ({
  id: row.id,
  title: row.title,
  focus: row.focus ?? "",
  completedAt: row.completed_at,
  exercises: [...row.plan_exercises]
    // El orden lo manda `position`; PostgREST no garantiza el de la relación.
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      exerciseId: item.exercise_id,
      name: item.exercises.name,
      muscleGroup: item.exercises.muscle_group,
      sets: item.sets,
      targetReps: item.target_reps,
      targetWeightKg: Number(item.target_weight_kg),
      restSeconds: item.rest_seconds,
      aiNote: item.ai_note ?? undefined,
    })),
});

/**
 * El último plan del usuario, esté hecho o no. Quien decide qué hacer con él
 * es la pantalla, mirando `completedAt`: si sigue pendiente es el
 * entrenamiento vigente por muchos días que hayan pasado; si está terminado,
 * toca preparar el siguiente.
 */
export async function fetchLatestPlan(
  userId: string
): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(PLAN_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toDomain(data as unknown as PlanWithExercises);
}

/**
 * ¿Se ha empezado ya este plan?
 *
 * "Empezado" es haber registrado al menos una serie. Abrir la pantalla crea
 * una sesión vacía, así que mirar si hay sesión no vale: diría que sí en cuanto
 * el usuario echa un vistazo.
 */
export async function planHasLoggedSets(planId: string): Promise<boolean> {
  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("plan_id", planId);

  if (error) throw error;
  if (!sessions?.length) return false;

  const { count, error: setsError } = await supabase
    .from("session_sets")
    .select("id", { count: "exact", head: true })
    .in(
      "session_id",
      sessions.map((session) => session.id)
    );

  if (setsError) throw setsError;

  return (count ?? 0) > 0;
}

/**
 * Tira un plan que ha quedado obsoleto antes de empezarlo.
 *
 * Comprueba otra vez que no tenga series aunque quien llama ya lo haya mirado:
 * entre la comprobación y el borrado el usuario puede haber registrado una en
 * otra pantalla, y esto borra de verdad.
 *
 * Los ejercicios del plan caen en cascada; las sesiones vacías se quedan con
 * `plan_id` a nulo, que es lo que define la columna.
 */
export async function discardPlan(
  userId: string,
  planId: string
): Promise<void> {
  if (await planHasLoggedSets(planId)) {
    throw new Error("Ese entrenamiento ya tiene series registradas");
  }

  const { error } = await supabase
    .from("workout_plans")
    .delete()
    .eq("id", planId)
    // El id ya es único, pero acotar por usuario deja la intención escrita y
    // no depende solo de RLS.
    .eq("user_id", userId)
    .is("completed_at", null);

  if (error) throw error;
}

/** Pide un plan nuevo a la IA. La clave de Anthropic vive en la función. */
export async function generatePlan(
  userId: string,
  focus?: string
): Promise<WorkoutPlan> {
  const { data, error } = await supabase.functions.invoke("generate-workout", {
    body: { focus },
  });

  if (error) throw error;

  const planId = (data as { plan_id?: string })?.plan_id;
  if (!planId) throw new Error("La función no devolvió ningún plan");

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
    .single();

  if (planError) throw planError;

  return toDomain(plan as unknown as PlanWithExercises);
}

/**
 * Abre la sesión de hoy para ese plan, o devuelve la que ya estuviera
 * abierta: entrar y salir de la pantalla no debe crear sesiones sueltas.
 */
export async function openSession(
  userId: string,
  planId: string
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: userId, plan_id: planId })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function saveSet(
  sessionId: string,
  set: CompletedSet & { planExerciseId: string }
): Promise<void> {
  // Upsert sobre (session_id, exercise_id, set_number): corregir una serie ya
  // cerrada actualiza la fila en vez de duplicarla.
  const { error } = await supabase.from("session_sets").upsert(
    {
      session_id: sessionId,
      plan_exercise_id: set.planExerciseId,
      exercise_id: set.exerciseId,
      set_number: set.number,
      weight_kg: set.weightKg,
      reps: set.reps,
    },
    { onConflict: "session_id,exercise_id,set_number" }
  );

  if (error) throw error;
}

export async function removeSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number
): Promise<void> {
  const { error } = await supabase
    .from("session_sets")
    .delete()
    .eq("session_id", sessionId)
    .eq("exercise_id", exerciseId)
    .eq("set_number", setNumber);

  if (error) throw error;
}

/**
 * Cierra la sesión y da el plan por hecho. Las dos cosas van juntas: es
 * terminar el entrenamiento lo que agota el plan, no que pase el día.
 */
export async function finishSession(
  sessionId: string,
  planId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: now })
    .eq("id", sessionId);

  if (error) throw error;

  const { error: planError } = await supabase
    .from("workout_plans")
    .update({ completed_at: now })
    .eq("id", planId);

  if (planError) throw planError;
}
