import { StyleSheet, Text, View } from "react-native";

import { targetSummary } from "@/features/workout/targets";
import type { SuggestedExercise } from "@/features/workout/types";
import { HomeColors } from "../home-theme";

interface Props {
  exercises: SuggestedExercise[];
}

/**
 * La lista de ejercicios de un plan, con sus objetivos.
 *
 * Se usa en la vista previa del entrenamiento por preparar. Los días ya
 * terminados tienen su propia lista, porque muestran las series reales y no
 * estos objetivos.
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
              {/* Un solo texto para series, reps y peso: con progresión no se
                  puede partir en trozos sin mentir. Sin el descanso, que lo
                  lleva el cronómetro al entrenar. */}
              <Text style={styles.metric}>{targetSummary(exercise)}</Text>
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

  /**
   * La nota del entrenador iba en lima a plena saturación. Como distintivo
   * pequeño el lima funciona; como párrafo de varias líneas cansa la vista y
   * compite con el botón de empezar, que es lo único que debería destacar
   * tanto.
   *
   * Ahora se distingue por el fondo y no por el color de la letra.
   */
  note: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: HomeColors.surfaceElevated,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
  },
});
