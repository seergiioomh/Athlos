import { ArrowLeft01Icon, FireIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
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
  rangeLabel,
  streakTier,
  type StreakTier,
  tiersAscending,
} from "./streak-tiers";

export function StreakScreen() {
  const router = useRouter();
  const { data, error } = useStreak();

  const streak = data ?? 0;
  const current = streakTier(streak);
  const tiers = tiersAscending();
  const [preview, setPreview] = useState<StreakTier | null>(null);
  const displayed = preview ?? current;
  const previewing = preview !== null;

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

        <View
          style={[
            styles.currentCard,
            { backgroundColor: displayed.background, borderColor: displayed.border },
          ]}
        >
          <StreakRing tier={displayed} size={78} />

          <View style={styles.currentText}>
            <View style={[styles.badge, { backgroundColor: HomeColors.surfaceElevated }]}>
              <Text style={[styles.badgeText, { color: displayed.flame }]}>
                {previewing ? "Vista previa" : "Actual"}
              </Text>
            </View>

            <Text style={styles.currentName}>{displayed.name}</Text>
            <Text style={[styles.currentRange, { color: displayed.flame }]}>
              {rangeLabel({
                from: displayed.from,
                to: tiers.find((tier) => tier.from === displayed.from)?.to ?? null,
              })}
            </Text>
            <Text style={styles.currentHint}>{displayed.hint}</Text>
          </View>
        </View>

        <Text style={styles.section}>Todos los rangos</Text>

        <View style={styles.grid}>
          {tiers.map((tier) => {
            const active = tier.from === current.from;
            const achieved = streak >= tier.from;
            const previewed = tier.from === preview?.from;
            const highlighted = active || previewed;

            return (
              <TouchableOpacity
                key={tier.name}
                activeOpacity={0.78}
                onPress={() => setPreview(previewed || active ? null : tier)}
                style={[
                  styles.tile,
                  (achieved || previewed) && { backgroundColor: tier.background },
                  highlighted && { borderColor: tier.border },
                ]}
              >
                <Text
                  style={[
                    styles.tileRange,
                    (achieved || previewed) && { color: tier.text },
                  ]}
                >
                  {rangeLabel(tier)}
                </Text>

                <StreakRing tier={tier} size={46} locked={streak < tier.from && !previewed} />

                <Text
                  style={[styles.tileName, (achieved || previewed) && { color: tier.text }]}
                  numberOfLines={1}
                >
                  {tier.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.previewHint}>
          Toca una insignia bloqueada para verla activa. No cambia tu racha.
        </Text>

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
    borderWidth: 1,
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
    borderColor: HomeColors.border,
  },

  tileRange: { fontSize: 10, color: HomeColors.textSecondary },

  tileName: {
    fontSize: 11,
    fontWeight: "600",
    color: HomeColors.text,
    textAlign: "center",
  },

  previewHint: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: HomeColors.textTertiary,
  },

  footnote: {
    marginTop: 22,
    fontSize: 12,
    lineHeight: 18,
    color: HomeColors.textTertiary,
  },
});
