import { StyleSheet, Text, View } from "react-native";

import type { SuggestedExercise } from "@/features/workout/types";
import { HomeColors } from "../home-theme";

interface Props {
  exercises: SuggestedExercise[];
}

const formatWeight = (kg: number) =>
  kg === 0 ? "Peso corporal" : `${String(kg).replace(".", ",")} kg`;

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${seconds} s`;

/**
 * La lista de ejercicios de un plan, con sus objetivos.
 *
 * Compartida entre la vista previa del entrenamiento por preparar
 * (`WorkoutPreviewSheet`) y la de un día ya hecho (`PastWorkoutSheet`): la
 * fila es idéntica en las dos, solo cambia lo que envuelve a la lista.
 */
export function PlanExerciseList({ exercises }: Props) {
  return (
    <>
      {exercises.map((exercise, index) => (
        <View key={exercise.id} style={styles.exercise}>
          <View style={styles.position}>
            <Text style={styles.positionText}>{index + 1}</Text>
          </View>

          <View style={styles.details}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.muscle}>{exercise.muscleGroup}</Text>

            <View style={styles.metrics}>
              <Text style={styles.metric}>
                {exercise.sets} × {exercise.targetReps}
              </Text>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.metric}>
                {formatWeight(exercise.targetWeightKg)}
              </Text>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.metric}>
                {formatRest(exercise.restSeconds)} descanso
              </Text>
            </View>

            {exercise.aiNote ? (
              <Text style={styles.note}>{exercise.aiNote}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  exercise: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: HomeColors.surface,
  },

  position: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: HomeColors.primary,
  },

  details: { flex: 1 },

  name: { fontSize: 16, fontWeight: "700", color: HomeColors.text },
  muscle: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  metrics: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  metric: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  separator: { fontSize: 13, color: HomeColors.textSecondary },

  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.primary,
  },
});
