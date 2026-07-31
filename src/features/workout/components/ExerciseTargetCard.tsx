import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { SuggestedExercise } from "../types";

interface Props {
  exercise: SuggestedExercise;
}

const formatWeight = (kg: number) =>
  kg === 0 ? "Corporal" : `${String(kg).replace(".", ",")} kg`;

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${seconds} s`;

export function ExerciseTargetCard({ exercise }: Props) {
  const metrics = [
    { label: "Series", value: String(exercise.sets) },
    { label: "Reps", value: String(exercise.targetReps) },
    { label: "Peso", value: formatWeight(exercise.targetWeightKg) },
    { label: "Descanso", value: formatRest(exercise.restSeconds) },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.muscle}>
        {exercise.muscleGroup.toUpperCase()}
      </Text>

      <Text style={styles.name}>{exercise.name}</Text>

      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text
              style={styles.value}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {metric.value}
            </Text>
            <Text style={styles.label}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {exercise.aiNote ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>{exercise.aiNote}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  muscle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: HomeColors.textSecondary,
  },

  name: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: HomeColors.text,
  },

  metrics: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  metric: {
    flex: 1,
    alignItems: "center",
  },

  value: {
    fontSize: 19,
    fontWeight: "700",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  label: {
    marginTop: 3,
    fontSize: 11,
    color: HomeColors.textSecondary,
  },

  note: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: HomeColors.primarySoft,
  },

  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: HomeColors.primary,
  },
});
