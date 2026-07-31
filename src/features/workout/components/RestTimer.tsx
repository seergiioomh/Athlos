import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  secondsLeft: number;
  totalSeconds: number;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}

const format = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

export function RestTimer({
  secondsLeft,
  totalSeconds,
  onAdd,
  onSkip,
}: Props) {
  const progress =
    totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Descanso</Text>
          <Text style={styles.time}>{format(secondsLeft)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onAdd(15)}
            style={styles.action}
          >
            <Text style={styles.actionText}>+15 s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSkip}
            style={[styles.action, styles.skip]}
          >
            <Text style={[styles.actionText, styles.skipText]}>
              Saltar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.primarySoft,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: HomeColors.primary,
  },

  time: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  actions: {
    flexDirection: "row",
    gap: 8,
  },

  action: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: HomeColors.surfaceElevated,
  },

  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: HomeColors.text,
  },

  skip: {
    backgroundColor: HomeColors.primary,
  },

  skipText: {
    color: HomeColors.onPrimary,
  },

  track: {
    marginTop: 14,
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
});
