import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { SuggestedExercise } from "../types";

interface Props {
  exercise: SuggestedExercise;
}

export function NextExerciseCard({ exercise }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Siguiente</Text>

      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>

        <Text style={styles.detail}>
          {exercise.sets} × {exercise.targetReps}
          {exercise.targetWeightKg > 0
            ? ` · ${exercise.targetWeightKg} kg`
            : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: HomeColors.textSecondary,
  },

  row: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },

  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: HomeColors.text,
  },

  detail: {
    fontSize: 13,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
});
