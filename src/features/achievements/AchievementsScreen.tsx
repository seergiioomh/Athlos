import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { AchievementCard } from "./components/AchievementCard";
import {
  ACHIEVEMENTS,
  earnedSlugs,
  FAMILIES,
  type AchievementMetrics,
} from "./definitions";
import {
  useAchievementMetrics,
  useSyncAchievements,
  useUnlockedAchievements,
} from "./queries";

/** Métricas a cero, para pintar la rejilla mientras cargan. */
const SIN_DATOS: AchievementMetrics = {
  sessionsFinished: 0,
  totalSets: 0,
  totalVolumeKg: 0,
  distinctExercises: 0,
  distinctMuscleGroups: 0,
  maxWeightKg: 0,
  weightEntries: 0,
  sharedWorkouts: 0,
  earlySessions: 0,
  lateSessions: 0,
  weekendSessions: 0,
  longSessions: 0,
  cycleLaps: 0,
  battlesPlayed: 0,
  battlesWon: 0,
};

export function AchievementsScreen() {
  const router = useRouter();

  const { data: metrics, error } = useAchievementMetrics();
  const { data: unlocked } = useUnlockedAchievements();

  const { mutate: syncAchievements } = useSyncAchievements();

  /**
   * Guardar aquí también, no solo al terminar de entrenar: hay logros que se
   * ganan sin pisar esa pantalla —anotar el peso, aceptar un compartido— y el
   * historial anterior a que existieran los logros no tiene fila ninguna.
   *
   * Es barato: si no hay nada nuevo, el `on conflict do nothing` no escribe.
   */
  useEffect(() => {
    syncAchievements();
  }, [syncAchievements]);

  const dates = new Map((unlocked ?? []).map((item) => [item.slug, item.unlockedAt]));
  const total = ACHIEVEMENTS.length;
  // Cuenta por métricas, igual que las tarjetas, o el contador diría otra cosa
  // distinta de lo que se ve debajo.
  const conseguidos = metrics ? earnedSlugs(metrics).length : 0;

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

            <Text style={styles.title}>Logros</Text>
          </View>

          <View style={styles.counter}>
            <Text style={styles.counterValue}>
              {conseguidos}
              <Text style={styles.counterDivider}> / </Text>
              <Text style={styles.counterTotal}>{total}</Text>
            </Text>
          </View>
        </View>

        {error && (
          <Text style={styles.error}>
            No se pudieron calcular tus logros: {errorMessage(error)}
          </Text>
        )}

        {FAMILIES.map((family) => {
          const items = ACHIEVEMENTS.filter(
            (achievement) => achievement.family === family.key
          );

          if (items.length === 0) return null;

          return (
            <View key={family.key} style={styles.family}>
              <Text style={[styles.familyTitle, { color: family.color }]}>
                {family.label}
              </Text>

              <View style={styles.grid}>
                {items.map((achievement) => (
                  <AchievementCard
                    key={achievement.slug}
                    achievement={achievement}
                    metrics={metrics ?? SIN_DATOS}
                    unlockedAt={dates.get(achievement.slug) ?? null}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

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
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  counter: { alignItems: "flex-end", marginTop: 52 },

  counterValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  counterDivider: { fontSize: 20, fontWeight: "500", color: HomeColors.textSecondary },
  counterTotal: { fontSize: 17, fontWeight: "700", color: HomeColors.textSecondary },

  error: {
    marginTop: 20,
    fontSize: 13,
    color: HomeColors.errorText,
  },

  family: { marginTop: 28 },

  familyTitle: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
