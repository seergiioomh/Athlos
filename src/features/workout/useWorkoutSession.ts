import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  finishSession,
  removeSet,
  saveSessionDraft,
  saveSet,
} from "@/services/workout";
import {
  OpenWorkoutSession,
  SetEntry,
  SuggestedExercise,
  WorkoutPlan,
  WorkoutSessionDraft,
} from "./types";

const toNumber = (value: string) => Number(value.replace(",", ".").trim());

const restoredEntries = (
  plan: WorkoutPlan,
  session: OpenWorkoutSession
): Record<string, SetEntry[]> =>
  Object.fromEntries(
    plan.exercises.map((exercise) => {
      const draftSets = session.draft?.entries[exercise.id] ?? [];

      return [
        exercise.id,
        Array.from({ length: exercise.sets }, (_, index) => {
          const number = index + 1;
          const draft = draftSets.find((set) => set.number === number);
          const completed = session.completedSets.find(
            (set) =>
              set.number === number &&
              (set.planExerciseId === exercise.id ||
                (!set.planExerciseId && set.exerciseId === exercise.exerciseId))
          );

          if (completed) {
            return {
              number,
              weightKg: String(completed.weightKg).replace(".", ","),
              reps: String(completed.reps),
              done: true,
            };
          }

          return {
            number,
            weightKg: draft?.weightKg ?? "",
            reps: draft?.reps ?? "",
            done: false,
          };
        }),
      ];
    })
  );

/** Milisegundos que esperamos antes de guardar una serie ya cerrada que el
 *  usuario está reeditando. Sin esto guardaríamos en cada pulsación. */
const EDIT_DEBOUNCE = 800;

export function useWorkoutSession(
  plan: WorkoutPlan,
  openedSession: OpenWorkoutSession
) {
  const [exerciseIndex, setExerciseIndex] = useState(() =>
    Math.min(
      openedSession.draft?.exerciseIndex ?? 0,
      Math.max(plan.exercises.length - 1, 0)
    )
  );

  // Las series de todos los ejercicios viven a la vez: si el usuario vuelve
  // atrás, lo que ya había metido sigue ahí.
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>(() =>
    restoredEntries(plan, openedSession)
  );

  const [syncError, setSyncError] = useState<string | null>(null);

  const initialRestDeadline = Math.max(
    openedSession.draft?.restDeadline ?? 0,
    0
  );
  const [restLeft, setRestLeft] = useState(() =>
    Math.max(0, Math.ceil((initialRestDeadline - Date.now()) / 1000))
  );
  const restDeadline = useRef(
    initialRestDeadline > Date.now() ? initialRestDeadline : 0
  );
  const resting = restLeft > 0;

  const exercise = plan.exercises[exerciseIndex];
  const sets = entries[exercise.id];

  const isLastExercise = exerciseIndex === plan.exercises.length - 1;
  const allSetsDone = sets.every((set) => set.done);

  // El contador se calcula contra una marca de tiempo, no restando 1 cada
  // segundo: así no se desfasa si el sistema estrangula el intervalo
  // mientras la app está en segundo plano.
  useEffect(() => {
    if (!resting) return;

    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((restDeadline.current - Date.now()) / 1000)
      );

      setRestLeft(left);

      if (left === 0) {
        // Lo paramos aquí y no en el cleanup: si esperamos al re-render,
        // el intervalo puede volver a entrar y vibrar dos veces.
        clearInterval(id);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 250);

    return () => clearInterval(id);
  }, [resting]);

  // Un temporizador por serie, para no guardar en cada tecla.
  const editTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const draftRef = useRef<WorkoutSessionDraft>({
    exerciseIndex,
    entries,
    restDeadline: restDeadline.current,
  });
  draftRef.current = {
    exerciseIndex,
    entries,
    restDeadline: restDeadline.current,
  };

  const persistDraft = useCallback(async () => {
    try {
      await saveSessionDraft(openedSession.id, draftRef.current);
      setSyncError(null);
    } catch {
      setSyncError("No se pudo guardar el progreso del entrenamiento.");
    }
  }, [openedSession.id]);

  // Los campos abiertos se guardan juntos tras una pausa breve. Las series
  // cerradas siguen guardándose al instante en `session_sets`.
  useEffect(() => {
    const timer = setTimeout(persistDraft, 400);
    return () => clearTimeout(timer);
  }, [entries, exerciseIndex, resting, persistDraft]);

  // iOS puede desmontar el proceso poco después de pasar a segundo plano: se
  // fuerza una última escritura en ese momento y también al salir de pantalla.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") persistDraft();
    });

    return () => {
      subscription.remove();
      persistDraft();
    };
  }, [persistDraft]);

  useEffect(
    () => () => {
      editTimers.current.forEach(clearTimeout);
      editTimers.current.clear();
    },
    []
  );

  const persistSet = useCallback(
    async (item: SuggestedExercise, set: SetEntry) => {
      try {
        await saveSet(openedSession.id, {
          planExerciseId: item.id,
          exerciseId: item.exerciseId,
          number: set.number,
          weightKg: toNumber(set.weightKg),
          reps: toNumber(set.reps),
        });

        setSyncError(null);
      } catch {
        setSyncError("No se pudo guardar la serie. Lo reintentamos al cerrarla de nuevo.");
      }
    },
    [openedSession.id]
  );

  const startRest = useCallback((seconds: number) => {
    restDeadline.current = Date.now() + seconds * 1000;
    setRestLeft(seconds);
  }, []);

  const addRest = useCallback((seconds: number) => {
    restDeadline.current += seconds * 1000;
    setRestLeft(
      Math.max(0, Math.ceil((restDeadline.current - Date.now()) / 1000))
    );
  }, []);

  const skipRest = useCallback(() => {
    restDeadline.current = 0;
    setRestLeft(0);
  }, []);

  const updateSet = useCallback(
    (number: number, field: "weightKg" | "reps", value: string) => {
      setEntries((current) => {
        const updated = current[exercise.id].map((set) =>
          set.number === number ? { ...set, [field]: value } : set
        );

        // Editar una serie ya cerrada tiene que llegar a la base de datos;
        // si no, el cambio se pierde sin avisar.
        const edited = updated.find((set) => set.number === number);

        if (edited?.done) {
          const key = `${exercise.id}-${number}`;
          const pending = editTimers.current.get(key);

          if (pending) clearTimeout(pending);

          editTimers.current.set(
            key,
            setTimeout(() => {
              editTimers.current.delete(key);
              persistSet(exercise, edited);
            }, EDIT_DEBOUNCE)
          );
        }

        return { ...current, [exercise.id]: updated };
      });
    },
    [exercise, persistSet]
  );

  const toggleSet = useCallback(
    (number: number) => {
      const set = entries[exercise.id].find((item) => item.number === number);

      if (!set) return;

      const done = !set.done;

      // Si cierra la serie sin tocar nada, damos por hecho que hizo justo
      // lo que la IA propuso.
      const closed: SetEntry = {
        ...set,
        done,
        weightKg: set.weightKg || String(exercise.targetWeightKg),
        reps: set.reps || String(exercise.targetReps),
      };

      setEntries((current) => ({
        ...current,
        [exercise.id]: current[exercise.id].map((item) =>
          item.number === number ? closed : item
        ),
      }));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (done) {
        persistSet(exercise, closed);

        // No tiene sentido descansar tras la última serie del ejercicio.
        if (number < exercise.sets) startRest(exercise.restSeconds);
      } else {
        skipRest();

        removeSet(openedSession.id, exercise.exerciseId, number).catch(() =>
          setSyncError("No se pudo borrar la serie.")
        );
      }
    },
    [entries, exercise, openedSession.id, persistSet, startRest, skipRest]
  );

  const goToExercise = useCallback(
    (index: number) => {
      skipRest();
      setExerciseIndex(index);
    },
    [skipRest]
  );

  const nextExercise = useCallback(() => {
    if (isLastExercise) return;
    goToExercise(exerciseIndex + 1);
  }, [exerciseIndex, goToExercise, isLastExercise]);

  const previousExercise = useCallback(() => {
    if (exerciseIndex === 0) return;
    goToExercise(exerciseIndex - 1);
  }, [exerciseIndex, goToExercise]);

  const finish = useCallback(async () => {
    try {
      await finishSession(openedSession.id, plan.id);
      return true;
    } catch {
      setSyncError("No se pudo cerrar el entrenamiento.");
      return false;
    }
  }, [openedSession.id, plan.id]);

  return {
    exercise,
    exerciseIndex,
    exerciseCount: plan.exercises.length,
    nextUp: isLastExercise ? null : plan.exercises[exerciseIndex + 1],
    sets,
    allSetsDone,
    isLastExercise,
    restLeft,
    resting,
    syncError,
    updateSet,
    toggleSet,
    addRest,
    skipRest,
    nextExercise,
    previousExercise,
    finish,
  };
}
