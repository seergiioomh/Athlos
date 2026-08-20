/**
 * Lo que la IA propone. Es de solo lectura para el usuario: define el
 * objetivo contra el que se compara lo que realmente levanta.
 */
export interface SuggestedExercise {
  /** id de la fila en plan_exercises. */
  id: string;
  /** id del ejercicio en el catálogo, que es lo que se guarda en cada serie. */
  exerciseId: string;
  /**
   * Identificador estable del ejercicio, el mismo en todas las cuentas.
   *
   * Es lo que viaja al compartir un entrenamiento: los ids son filas de una
   * base concreta, pero el slug identifica el ejercicio en sí, así que el
   * móvil que lo recibe puede resolverlo contra su propio catálogo.
   */
  slug: string;
  name: string;
  muscleGroup: string;
  sets: number;
  targetReps: number;
  targetWeightKg: number;
  /**
   * Objetivo de cada serie cuando no todas son iguales: ascendentes, back-off
   * o descendentes.
   *
   * Nulo es lo normal y significa que todas las series van a `targetReps` y
   * `targetWeightKg`. Nunca leas esto directamente: usa `targetsOf()`, que
   * resuelve los dos casos y evita que cada pantalla se invente el suyo.
   */
  setTargets: SetTarget[] | null;
  restSeconds: number;
  /** Por qué la IA propone esta carga. Se muestra tal cual al usuario. */
  aiNote?: string;
}

export interface SetTarget {
  reps: number;
  weightKg: number;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  focus: string;
  /** Null mientras el entrenamiento siga pendiente de hacerse. */
  completedAt: string | null;
  /**
   * El día para el que se preparó, en formato AAAA-MM-DD y en la zona del
   * usuario. Sirve para saber si un plan pendiente se quedó de otro día.
   */
  scheduledFor: string;
  /** Ver `WorkoutPlanRow.source`. */
  source: "ai" | "manual" | "shared";
  /** Nombre de quien lo compartió, si vino por enlace. */
  sharedBy: string | null;
  exercises: SuggestedExercise[];
}

/**
 * Una serie tal y como la está rellenando el usuario. `weightKg` y `reps`
 * son el texto crudo del input: se guardan sin parsear para no pelearse con
 * el usuario mientras escribe (un "22," a medias sigue siendo válido).
 */
export interface SetEntry {
  number: number;
  weightKg: string;
  reps: string;
  done: boolean;
}

/** Estado editable de una sesión abierta. Se guarda aparte de las series
 * completadas para no convertir un campo a medio escribir en trabajo hecho. */
export interface WorkoutSessionDraft {
  exerciseIndex: number;
  entries: Record<string, SetEntry[]>;
  /** Marca absoluta para que el descanso continúe tras cerrar la app. */
  restDeadline: number;
}

export interface SavedSessionSet extends CompletedSet {
  planExerciseId: string | null;
}

export interface OpenWorkoutSession {
  id: string;
  draft: WorkoutSessionDraft | null;
  completedSets: SavedSessionSet[];
}

/** Una serie ya cerrada, con números, lista para persistir. */
export interface CompletedSet {
  exerciseId: string;
  number: number;
  weightKg: number;
  reps: number;
}
