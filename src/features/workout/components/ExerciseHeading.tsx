import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { SuggestedExercise } from "../types";

interface Props {
  exercise: SuggestedExercise;
}

const formatWeight = (kg: number) =>
  kg === 0 ? "corporal" : `${String(kg).replace(".", ",")} kg`;

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;

/**
 * El ejercicio y su objetivo, en dos líneas.
 *
 * Sustituye a la tarjeta de cuatro métricas. El objetivo es el mismo para
 * todas las series, así que decirlo una vez aquí basta: antes salía en la
 * tarjeta, otra vez en una columna de cada fila y una tercera dentro de los
 * campos. Con tres repeticiones no cabían las cinco columnas en un móvil.
 */
export function ExerciseHeading({ exercise }: Props) {
  const objetivo = [
    `${exercise.sets} × ${exercise.targetReps}`,
    formatWeight(exercise.targetWeightKg),
    `${formatRest(exercise.restSeconds)} descanso`,
  ].join(" · ");

  return (
    <View style={styles.container}>
      <Text style={styles.muscle}>{exercise.muscleGroup.toUpperCase()}</Text>
      <Text style={styles.name}>{exercise.name}</Text>
      <Text style={styles.target}>{objetivo}</Text>

      {exercise.aiNote ? (
        <Text style={styles.note}>{exercise.aiNote}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },

  muscle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: HomeColors.textTertiary,
  },

  name: {
    marginTop: 5,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: HomeColors.text,
  },

  // El único lima de la pantalla junto al botón: es lo que hay que cumplir.
  target: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "600",
    color: HomeColors.primary,
  },

  note: {
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: HomeColors.surface,
    fontSize: 12,
    lineHeight: 18,
    color: HomeColors.textSecondary,
  },
});
