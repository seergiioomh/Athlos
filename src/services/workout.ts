import { supabase } from "@/lib/supabase";
import type { PlanExerciseWithExercise, WorkoutPlanRow } from "@/types/database";
import type { SharedWorkout } from "@/features/workout/share";
import type {
  CompletedSet,
  SetTarget,
  WorkoutPlan,
} from "@/features/workout/types";

export interface SessionFeedback {
  energyDuring: number | null;
  rating: number | null;
  notes: string | null;
}

const PLAN_SELECT = `
  id, user_id, title, focus, scheduled_for, source, ai_model, shared_by,
  completed_at, created_at,
  plan_exercises (
    id, plan_id, exercise_id, position, sets, target_reps,
    target_weight_kg, set_targets, rest_seconds, ai_note,
    exercises ( id, slug, name, muscle_group, is_bodyweight )
  )
`;

type PlanWithExercises = WorkoutPlanRow & {
  plan_exercises: PlanExerciseWithExercise[];
};

/**
 * `set_targets` es jsonb: la base comprueba su forma al escribir, pero una fila
 * anterior a esa restricción, o escrita a mano, puede traer cualquier cosa. Se
 * valida aquí y, si no cuadra, se devuelve null: el ejercicio se queda con su
 * objetivo uniforme en vez de romper la pantalla.
 */
function sanearSetTargets(value: unknown): SetTarget[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const targets = value.map((entry) => ({
    reps: Number((entry as { reps?: unknown })?.reps),
    weightKg: Number((entry as { weight_kg?: unknown })?.weight_kg),
  }));

  const valido = targets.every(
    (target) =>
      Number.isFinite(target.reps) &&
      Number.isFinite(target.weightKg) &&
      target.reps > 0 &&
      target.weightKg >= 0
  );

  return valido ? targets : null;
}

const toDomain = (row: PlanWithExercises): WorkoutPlan => ({
  id: row.id,
  title: row.title,
  focus: row.focus ?? "",
  completedAt: row.completed_at,
  scheduledFor: row.scheduled_for,
  source: row.source,
  sharedBy: row.shared_by,
  exercises: [...row.plan_exercises]
    // El orden lo manda `position`; PostgREST no garantiza el de la relación.
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      exerciseId: item.exercise_id,
      slug: item.exercises.slug,
      name: item.exercises.name,
      muscleGroup: item.exercises.muscle_group,
      sets: item.sets,
      targetReps: item.target_reps,
      targetWeightKg: Number(item.target_weight_kg),
      // Viene de una columna jsonb, así que puede traer cualquier cosa: se
      // sanea aquí, en el borde, y el resto de la app ya la trata como tipada.
      setTargets: sanearSetTargets(item.set_targets),
      restSeconds: item.rest_seconds,
      aiNote: item.ai_note ?? undefined,
    })),
});

/**
 * El último plan del usuario, esté hecho o no. Quien decide qué hacer con él
 * es la pantalla, mirando `completedAt`: si sigue pendiente es el
 * entrenamiento vigente por muchos días que hayan pasado; si está terminado,
 * toca preparar el siguiente.
 *
 * Los compartidos quedan fuera. Son sesiones ocasionales que no pertenecen al
 * ciclo, y si contaran como "el último plan" bastaría con aceptar el de un
 * amigo para que el tuyo desapareciera de Inicio: al terminar el suyo, la
 * pantalla diría "prepara el siguiente" y tu entrenamiento real quedaría
 * escondido detrás, sin hacer y sin que se note.
 */
export async function fetchLatestPlan(
  userId: string
): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(PLAN_SELECT)
    .eq("user_id", userId)
    .neq("source", "shared")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toDomain(data as unknown as PlanWithExercises);
}

/**
 * Un plan concreto, por id. Para revisar un día pasado desde "Esta semana",
 * no solo el vigente.
 */
export async function fetchPlanById(
  planId: string
): Promise<WorkoutPlan | null> {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
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
/**
 * El mensaje que mandó la Edge Function, no el genérico de supabase-js.
 *
 * Ante un código distinto de 2xx, `functions.invoke` devuelve un
 * `FunctionsHttpError` cuyo `message` es siempre el mismo texto en inglés
 * ("Edge Function returned a non-2xx status code"): el cuerpo con la
 * explicación viaja en `context`, que es la `Response` sin leer. Sin esto, al
 * usuario le llegaba esa frase en lugar de "Ya has entrenado hoy" o "Has
 * alcanzado el límite de 3 entrenamientos generados hoy".
 */
async function mensajeDeFuncion(error: unknown): Promise<string> {
  const respuesta = (error as { context?: unknown })?.context;

  if (respuesta instanceof Response) {
    try {
      const cuerpo = await respuesta.clone().json();
      const mensaje = (cuerpo as { error?: unknown })?.error;

      if (typeof mensaje === "string" && mensaje) return mensaje;
    } catch {
      // Sin cuerpo, o con un cuerpo que no es JSON. Se cae al genérico.
    }
  }

  return error instanceof Error ? error.message : "No se pudo generar el plan";
}

export async function generatePlan(
  userId: string,
  focus?: string
): Promise<WorkoutPlan> {
  // El ciclo decide la sesión, no la fecha: aquí ya no hace falta contarle
  // nada al servidor sobre qué día es.
  const { data, error } = await supabase.functions.invoke("generate-workout", {
    body: { focus },
  });

  if (error) throw new Error(await mensajeDeFuncion(error));

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
 * Guarda como plan propio un entrenamiento que llegó por enlace.
 *
 * Sin `cycle_id` ni `cycle_position` a propósito: es una sesión ocasional, no
 * la siguiente de la rotación. Así hacerlo no adelanta el ciclo de quien lo
 * recibe ni descoloca lo que le tocaba.
 */
export async function importSharedWorkout(
  userId: string,
  shared: SharedWorkout
): Promise<WorkoutPlan> {
  // Los slugs vienen del catálogo del otro móvil. Es el mismo catálogo, pero
  // una versión más nueva podría traer ejercicios que aquí no existen.
  const { data: catalog, error: catalogError } = await supabase
    .from("exercises")
    .select("id, slug")
    .in(
      "slug",
      shared.exercises.map((exercise) => exercise.slug)
    );

  if (catalogError) throw catalogError;

  const idBySlug = new Map(
    (catalog ?? []).map((row) => [row.slug as string, row.id as string])
  );

  const resolved = shared.exercises.filter((exercise) =>
    idBySlug.has(exercise.slug)
  );

  if (resolved.length === 0) {
    throw new Error(
      "Ninguno de esos ejercicios está en tu catálogo. Puede que la app de quien te lo pasó esté más actualizada."
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      title: shared.title,
      focus: shared.focus || null,
      source: "shared",
      shared_by: shared.sharedBy || null,
    })
    .select("id")
    .single();

  if (planError) throw planError;

  const { error: exercisesError } = await supabase
    .from("plan_exercises")
    .insert(
      resolved.map((exercise, index) => ({
        plan_id: plan.id,
        exercise_id: idBySlug.get(exercise.slug)!,
        position: index + 1,
        sets: exercise.sets,
        target_reps: exercise.targetReps,
        target_weight_kg: exercise.targetWeightKg,
        // De vuelta al formato de la base: el enlace usa `weightKg` y la
        // columna `weight_kg`.
        set_targets:
          exercise.setTargets?.map((target) => ({
            reps: target.reps,
            weight_kg: target.weightKg,
          })) ?? null,
        rest_seconds: exercise.restSeconds,
      }))
    );

  if (exercisesError) {
    // El plan sin ejercicios no le sirve a nadie y ensuciaría el historial.
    await supabase.from("workout_plans").delete().eq("id", plan.id);
    throw exercisesError;
  }

  const imported = await fetchPlanById(plan.id);
  if (!imported) throw new Error("No se pudo leer el entrenamiento importado");

  return imported;
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
  // La sesión se crea al abrir el entrenamiento para tener un id al registrar
  // la primera serie. Su hora real de inicio, sin embargo, es esta primera
  // serie, no el momento en que se curioseó la pantalla.
  const { count, error: countError } = await supabase
    .from("session_sets")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) throw countError;

  if (count === 0) {
    const { error: sessionError } = await supabase
      .from("workout_sessions")
      .update({ started_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (sessionError) throw sessionError;
  }

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

/** Guarda el cierre subjetivo de la sesión para que el coach pueda usarlo. */
export async function saveSessionFeedback(
  sessionId: string,
  feedback: SessionFeedback
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({
      energy_during: feedback.energyDuring,
      rating: feedback.rating,
      notes: feedback.notes,
    })
    .eq("id", sessionId);

  if (error) throw error;
}
