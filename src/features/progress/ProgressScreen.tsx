import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { HomeColors } from "@/features/home/home-theme";
import { PastWorkoutSheet } from "@/features/home/components/PastWorkoutSheet";
import { useCompletedWorkout } from "@/features/home/queries";
import { useProfile } from "@/features/onboarding/queries";
import { errorMessage } from "@/utils/errors";
import { ExerciseMarks } from "./components/ExerciseMarks";
import { TrainingHeatmap } from "./components/TrainingHeatmap";
import { WeightChart } from "./components/WeightChart";
import { WeightLogModal } from "./components/WeightLogModal";
import {
  useExerciseProgress,
  useRecordWeight,
  useWeightRange,
  useWorkoutHistory,
} from "./queries";
import { goodWeightDirection } from "./weight-goal";

const ranges = [
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "3 meses" },
  { value: 365, label: "1 año" },
];

const kg = (value: number) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

// Verde si el cambio va hacia el objetivo, ámbar si se aleja, gris si el
// objetivo no dice nada sobre la báscula.
const DELTA_TONE_STYLES = {
  good: { backgroundColor: "rgba(48,209,88,0.14)" },
  bad: { backgroundColor: "rgba(255,159,10,0.14)" },
  neutral: { backgroundColor: HomeColors.surfaceElevated },
};

const DELTA_TEXT_TONE_STYLES = {
  good: { color: HomeColors.success },
  bad: { color: HomeColors.warning },
  neutral: { color: HomeColors.textSecondary },
};

export function ProgressScreen() {
  const [days, setDays] = useState(30);
  const [logging, setLogging] = useState(false);
  const [viewingDay, setViewingDay] = useState<{
    sessionId: string;
    date: Date;
  } | null>(null);

  const { data: weight, isPending: weightPending } = useWeightRange(days);
  const { data: exercises } = useExerciseProgress();
  const { data: profile } = useProfile();
  const { data: sessions } = useWorkoutHistory(28);
  const { data: viewingWorkout, isPending: viewingWorkoutPending } =
    useCompletedWorkout(viewingDay?.sessionId ?? null);
  const record = useRecordWeight();

  const history = weight ?? [];
  const current = history[history.length - 1]?.weightKg;
  const delta =
    history.length > 1 ? current - history[0].weightKg : 0;

  // Verde si el peso se mueve hacia el objetivo, ámbar si se aleja. Sin
  // objetivo claro (fuerza, rendimiento...) se queda neutro: no hay forma
  // honesta de decir si subir o bajar es lo bueno.
  const goodDirection = goodWeightDirection(
    profile?.goal ?? null,
    profile?.target_weight_kg ?? null,
    current
  );
  const deltaTone: "good" | "bad" | "neutral" =
    delta === 0 || goodDirection === "neutral"
      ? "neutral"
      : (delta > 0) === (goodDirection === "up")
        ? "good"
        : "bad";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Progreso</Text>

        {/* ---------------------------------------------------------- peso */}
        {/* El selector va fuera de la tarjeta: manda sobre la gráfica, y
            dentro competía con el peso por la misma línea de lectura. */}
        <View style={styles.ranges}>
          <SegmentedControl options={ranges} value={days} onChange={setDays} accent={HomeColors.pink} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              {current !== undefined ? (
                <View style={styles.currentRow}>
                  <Text style={styles.current}>{kg(current)}</Text>
                  <Text style={styles.currentUnit}>kg</Text>
                </View>
              ) : (
                <Text style={styles.current}>—</Text>
              )}
            </View>

            <View style={styles.headerRight}>
              {history.length > 1 && (
                <View style={[styles.delta, DELTA_TONE_STYLES[deltaTone]]}>
                  <Text
                    style={[styles.deltaText, DELTA_TEXT_TONE_STYLES[deltaTone]]}
                  >
                    {delta === 0
                      ? "sin cambios"
                      : `${delta < 0 ? "↓" : "↑"} ${kg(Math.abs(delta))} kg`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.chartArea}>
            {weightPending ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator color={HomeColors.pink} />
              </View>
            ) : history.length === 0 ? (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.emptyText}>
                  Sin registros en este periodo.
                </Text>
              </View>
            ) : (
              <WeightChart history={history} />
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLogging(true)}
            style={styles.logButton}
          >
            <Text style={styles.logButtonText}>Registrar peso de hoy</Text>
          </TouchableOpacity>
        </View>

        <TrainingHeatmap
          sessions={sessions ?? []}
          onSelectDay={(sessionId, date) =>
            setViewingDay({ sessionId, date })
          }
        />

        {/* ------------------------------------------------------- fuerza */}
        <Text style={styles.section}>Tus marcas</Text>

        <ExerciseMarks exercises={exercises ?? []} />
      </ScrollView>

      <WeightLogModal
        visible={logging}
        lastWeight={current}
        saving={record.isPending}
        error={
          record.error ? errorMessage(record.error) : undefined
        }
        onClose={() => setLogging(false)}
        onSave={(value) =>
          record.mutate(value, { onSuccess: () => setLogging(false) })
        }
      />

      <PastWorkoutSheet
        workout={viewingWorkout ?? null}
        date={viewingDay?.date ?? null}
        loading={viewingWorkoutPending}
        visible={Boolean(viewingDay)}
        onClose={() => setViewingDay(null)}
        accentColor={HomeColors.pink}
        accentSoftColor={HomeColors.pinkSoft}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 132 },

  screenTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  card: {
    // Poco: el selector manda sobre esta tarjeta, así que van juntos. El aire
    // se reparte por arriba, separándolos del título.
    marginTop: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    // Cede sitio al peso: con nombres largos, el título se parte antes que
    // empujar la cifra fuera de la tarjeta.
    flexShrink: 1,
  },

  headerRight: { alignItems: "flex-end", gap: 6 },

  currentRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },

  current: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1.6,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  currentUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  delta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  deltaText: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },

  ranges: { marginTop: 24 },

  chartArea: { marginTop: 12 },

  chartPlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },

  logButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.pinkSoft,
  },

  logButtonText: { fontSize: 15, fontWeight: "700", color: HomeColors.pink },

  section: {
    marginTop: 30,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: "700",
    color: HomeColors.text,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },
});
