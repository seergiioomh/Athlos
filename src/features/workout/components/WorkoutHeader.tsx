import { ArrowLeft01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  title: string;
  exerciseIndex: number;
  exerciseCount: number;
  onBack: () => void;
}

/**
 * Volver, el aviso de que los objetivos los pone la IA, y por dónde va la
 * sesión.
 *
 * El nombre del plan queda pequeño y el foco ya no se enseña: mientras
 * entrenas importa el ejercicio que tienes delante, no cómo se llama el
 * conjunto. Ese protagonismo se lo lleva `ExerciseHeading`.
 */
export function WorkoutHeader({
  title,
  exerciseIndex,
  exerciseCount,
  onBack,
}: Props) {
  const progress = (exerciseIndex + 1) / exerciseCount;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.back}
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={20}
            color={HomeColors.text}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <View style={styles.badge}>
          <HugeiconsIcon
            icon={SparklesIcon}
            size={13}
            color={HomeColors.primary}
            strokeWidth={2.2}
          />
          <Text style={styles.badgeText}>Sugerido por IA</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.progressText}>
          {exerciseIndex + 1}/{exerciseCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4, marginBottom: 20 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: HomeColors.primarySoft,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: HomeColors.primary,
  },

  title: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  progressRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.surfaceElevated,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: HomeColors.primary,
  },

  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
});
