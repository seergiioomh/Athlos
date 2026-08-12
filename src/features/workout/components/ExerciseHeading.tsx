import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { targetSummary } from "../targets";
import { SuggestedExercise } from "../types";

interface Props {
  exercise: SuggestedExercise;
}

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;

/**
 * El ejercicio y su objetivo, en dos líneas.
 *
 * Sustituye a la tarjeta de cuatro métricas. Antes el objetivo salía en la
 * tarjeta, otra vez en una columna de cada fila y una tercera dentro de los
 * campos; con tres repeticiones no cabían las cinco columnas en un móvil.
 *
 * Ahora se dice aquí. Si el ejercicio lleva progresión, el resumen enumera
 * los pesos y cada fila sugiere el suyo en su propio campo.
 */
export function ExerciseHeading({ exercise }: Props) {
  // Con progresión el resumen enumera los pesos en vez de dar uno solo, que
  // sería mentira. Lo resuelve `targetSummary`, compartido con las demás
  // pantallas para que todas digan lo mismo.
  const objetivo = [
    targetSummary(exercise),
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
