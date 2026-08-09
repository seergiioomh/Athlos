/**
 * Lo que la IA propone. Es de solo lectura para el usuario: define el
 * objetivo contra el que se compara lo que realmente levanta.
 */
export interface SuggestedExercise {
  /** id de la fila en plan_exercises. */
  id: string;
  /** id del ejercicio en el catálogo, que es lo que se guarda en cada serie. */
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  targetReps: number;
  targetWeightKg: number;
  restSeconds: number;
  /** Por qué la IA propone esta carga. Se muestra tal cual al usuario. */
  aiNote?: string;
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

/** Una serie ya cerrada, con números, lista para persistir. */
export interface CompletedSet {
  exerciseId: string;
  number: number;
  weightKg: number;
  reps: number;
}
