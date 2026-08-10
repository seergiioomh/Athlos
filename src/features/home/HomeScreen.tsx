import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LevelCard } from "@/components/cards/LevelCard";
import { WeightCard } from "@/components/cards/WeightCard";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { useProfile } from "@/features/onboarding/queries";
import { useStreak } from "@/features/progress/queries";
import { useLatestPlan } from "@/features/workout/queries";
import { CoachInsightCard } from "./components/CoachInsightCard";
import { PastWorkoutSheet } from "./components/PastWorkoutSheet";
import { TodayWorkoutCard } from "./components/TodayWorkoutCard";
import { WorkoutHistory } from "./components/WorkoutHistory";
import { HomeColors } from "./home-theme";
import { levelFromStats } from "./level";
import {
  useDayPlan,
  useRecentSessions,
  useTrainingStats,
  useWeightHistory,
} from "./queries";

const greetingFor = (hour: number) =>
  hour < 6 ? "Buenas noches" : hour < 13 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function HomeScreen() {
  const router = useRouter();

  const { data: profile } = useProfile();
  const { data: plan } = useLatestPlan();
  const { data: weight } = useWeightHistory();
  const { data: sessions } = useRecentSessions();
  const { data: stats } = useTrainingStats();
  const { data: streak } = useStreak();

  /** Día tocado en "Esta semana", si lo hay. */
  const [viewingDay, setViewingDay] = useState<{
    planId: string;
    date: Date;
  } | null>(null);

  const { data: viewingPlan, isPending: viewingPlanPending } = useDayPlan(
    viewingDay?.planId ?? null
  );

  const name = profile?.display_name ?? "";
  const progress = levelFromStats(
    stats ?? { finishedSessions: 0, completedSets: 0 }
  );

  return (
    // Igual que Progreso: el contenido se detiene bajo la barra de estado
    // en vez de pasar por debajo al scrollear.
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greetingFor(new Date().getHours())} 👋
          </Text>
          <Text style={styles.name}>{name || "Hola"}</Text>
        </View>

        <View style={styles.headerRight}>
          <StreakBadge
            streak={streak ?? 0}
            onPress={() => router.push("/rachas")}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel="Abrir perfil"
            onPress={() => router.push("/(tabs)/profile")}
          >
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initialsOf(name)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <TodayWorkoutCard
        // Un plan ya hecho no se ofrece: la tarjeta pasa a invitar a
        // preparar el siguiente.
        plan={plan && !plan.completedAt ? plan : null}
        onPress={() => router.push("/(tabs)/workout")}
      />

      <WorkoutHistory
        sessions={sessions ?? []}
        onPress={() => router.push("/(tabs)/progress")}
        onSelectDay={(planId, date) => setViewingDay({ planId, date })}
      />

      <View style={styles.metricsRow}>
        {weight && weight.length > 0 ? (
          <WeightCard
            history={weight}
            onPress={() => router.push("/(tabs)/progress")}
          />
        ) : (
          <EmptyMetric
            title="Evolución de peso"
            body="Registra tu peso para ver la tendencia."
          />
        )}

        <LevelCard
          progress={progress}
          onPress={() => router.push("/(tabs)/profile")}
        />
      </View>

        <CoachInsightCard
          sessionsThisWeek={sessions?.length ?? 0}
          targetDays={profile?.days_per_week ?? null}
          onPress={() => router.push("/(tabs)/coach")}
        />
      </ScrollView>

      <PastWorkoutSheet
        plan={viewingPlan ?? null}
        date={viewingDay?.date ?? null}
        loading={viewingPlanPending}
        visible={Boolean(viewingDay)}
        onClose={() => setViewingDay(null)}
      />
    </SafeAreaView>
  );
}

function EmptyMetric({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  container: { flex: 1, backgroundColor: HomeColors.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 132 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { fontSize: 18, color: HomeColors.textSecondary },
  name: { fontSize: 40, fontWeight: "600", color: HomeColors.text, marginTop: 2 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: HomeColors.surfaceElevated, justifyContent: "center", alignItems: "center" },
  initials: { fontSize: 22, fontWeight: "700", color: HomeColors.text },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  empty: { flexBasis: "48%", maxWidth: "48%", minHeight: 206, padding: 12, borderRadius: 18, backgroundColor: HomeColors.surface, justifyContent: "center", gap: 6 },
  emptyTitle: { fontSize: 13, fontWeight: "700", color: HomeColors.text },
  emptyBody: { fontSize: 11, lineHeight: 15, color: HomeColors.textSecondary },
});
