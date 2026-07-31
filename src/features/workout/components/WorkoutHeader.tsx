import { ArrowLeft01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  title: string;
  focus: string;
  exerciseIndex: number;
  exerciseCount: number;
  onBack: () => void;
}

export function WorkoutHeader({
  title,
  focus,
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

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.focus}>{focus}</Text>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${progress * 100}%` }]}
          />
        </View>

        <Text style={styles.progressText}>
          {exerciseIndex + 1}/{exerciseCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 22,
  },

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
    marginTop: 18,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: HomeColors.text,
  },

  focus: {
    marginTop: 4,
    fontSize: 14,
    color: HomeColors.textSecondary,
  },

  progressRow: {
    marginTop: 16,
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
