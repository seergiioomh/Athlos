import { ArrowLeft01Icon, FireIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StreakRing } from "@/components/ui/StreakRing";
import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { useStreak } from "./queries";
import {
  nextTier,
  rangeLabel,
  streakTier,
  tiersAscending,
} from "./streak-tiers";

export function StreakScreen() {
  const router = useRouter();
  const { data, error } = useStreak();

  const streak = data ?? 0;
  const current = streakTier(streak);
  const upcoming = nextTier(streak);
  const tiers = tiersAscending();

  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={back}
              hitSlop={10}
              style={styles.back}
              accessibilityLabel="Volver"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={20}
                color={HomeColors.text}
                strokeWidth={2}
              />
            </TouchableOpacity>

            <Text style={styles.title}>Rachas</Text>
            <Text style={styles.subtitle}>
              Cada entrenamiento cuenta. Mantén la constancia y sube de rango.
            </Text>
          </View>

          <View style={styles.counter}>
            <View style={styles.counterRow}>
              <HugeiconsIcon
                icon={FireIcon}
                size={22}
                color={current.flame}
                strokeWidth={2}
              />
              <Text style={styles.counterValue}>{streak}</Text>
            </View>
            <Text style={styles.counterLabel}>
              {streak === 1 ? "entreno seguido" : "entrenos seguidos"}
            </Text>
          </View>
        </View>

        {error && (
          <Text style={styles.error}>
            No se pudo calcular la racha: {errorMessage(error)}
          </Text>
        )}

        <Text style={styles.section}>Tu insignia</Text>

        <View style={styles.currentCard}>
          <StreakRing tier={current} size={78} />

          <View style={styles.currentText}>
            <View style={[styles.badge, { backgroundColor: HomeColors.surfaceElevated }]}>
              <Text style={[styles.badgeText, { color: current.flame }]}>
                Actual
              </Text>
            </View>

            <Text style={styles.currentName}>{current.name}</Text>
            <Text style={[styles.currentRange, { color: current.flame }]}>
              {rangeLabel({
                from: current.from,
                to: tiers.find((tier) => tier.from === current.from)?.to ?? null,
              })}
            </Text>
            <Text style={styles.currentHint}>{current.hint}</Text>
          </View>
        </View>

        {upcoming && (
          <Text style={styles.next}>
            Te {upcoming.from - streak === 1 ? "queda" : "quedan"}{" "}
            <Text style={{ color: upcoming.flame }}>
              {upcoming.from - streak}
            </Text>{" "}
            para {upcoming.name}.
          </Text>
        )}

        <Text style={styles.section}>Todos los rangos</Text>

        <View style={styles.grid}>
          {tiers.map((tier) => {
            const active = tier.from === current.from;

            return (
              <View
                key={tier.name}
                style={[
                  styles.tile,
                  active && { borderColor: tier.flame },
                ]}
              >
                <Text
                  style={[
                    styles.tileRange,
                    active && { color: tier.flame },
                  ]}
                >
                  {rangeLabel(tier)}
                </Text>

                <StreakRing tier={tier} size={46} locked={streak < tier.from} />

                <Text
                  style={[styles.tileName, active && { color: tier.flame }]}
                  numberOfLines={1}
                >
                  {tier.name}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footnote}>
          La racha aguanta tus días de descanso: solo se rompe si dejas pasar
          más días seguidos de los que tu plan contempla.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  content: { paddingHorizontal: 20, paddingBottom: 132 },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerText: { flex: 1 },

  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
  },

  counter: {
    marginTop: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  counterValue: {
    fontSize: 26,
    fontWeight: "800",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  counterLabel: { marginTop: 2, fontSize: 11, color: HomeColors.textSecondary },

  error: { marginTop: 16, fontSize: 12, color: HomeColors.errorText },

  section: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "700",
    color: HomeColors.text,
  },

  currentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  currentText: { flex: 1 },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  badgeText: { fontSize: 10, fontWeight: "700" },

  currentName: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "700",
    color: HomeColors.text,
  },

  currentRange: { marginTop: 2, fontSize: 13, fontWeight: "600" },

  currentHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
  },

  next: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  tile: {
    width: "31.5%",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },

  tileRange: { fontSize: 10, color: HomeColors.textSecondary },

  tileName: {
    fontSize: 11,
    fontWeight: "600",
    color: HomeColors.text,
    textAlign: "center",
  },

  footnote: {
    marginTop: 22,
    fontSize: 12,
    lineHeight: 18,
    color: HomeColors.textTertiary,
  },
});
