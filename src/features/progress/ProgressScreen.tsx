import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
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
import { levelFromStats } from "@/features/home/level";
import { errorMessage } from "@/utils/errors";
import { WeightChart } from "./components/WeightChart";
import { WeightLogModal } from "./components/WeightLogModal";
import {
  useExerciseProgress,
  useProgressSummary,
  useRecordWeight,
  useWeightRange,
} from "./queries";

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

const compact = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} t`
    : `${Math.round(value)} kg`;

export function ProgressScreen() {
  const [days, setDays] = useState(30);
  const [logging, setLogging] = useState(false);

  const { data: weight, isPending: weightPending } = useWeightRange(days);
  const { data: summary } = useProgressSummary();
  const { data: exercises } = useExerciseProgress();
  const record = useRecordWeight();

  const level = levelFromStats({
    finishedSessions: summary?.finishedSessions ?? 0,
    completedSets: summary?.totalSets ?? 0,
  });

  const history = weight ?? [];
  const current = history[history.length - 1]?.weightKg;
  const delta =
    history.length > 1 ? current - history[0].weightKg : 0;

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
          <SegmentedControl options={ranges} value={days} onChange={setDays} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <HugeiconsIcon
                  icon={AnalyticsUpIcon}
                  size={20}
                  color={HomeColors.primary}
                  strokeWidth={2}
                />
              </View>

              <View style={styles.headerTitles}>
                <Text style={styles.cardTitle}>Tu evolución</Text>
                <Text style={styles.cardLabel}>Peso corporal (kg)</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {current !== undefined ? (
                <View style={styles.currentRow}>
                  <Text style={styles.current}>{kg(current)}</Text>
                  <Text style={styles.currentUnit}>kg</Text>
                </View>
              ) : (
                <Text style={styles.current}>—</Text>
              )}

              {history.length > 1 && (
                <View
                  style={[
                    styles.delta,
                    delta <= 0 ? styles.deltaDown : styles.deltaUp,
                  ]}
                >
                  <Text
                    style={[
                      styles.deltaText,
                      delta <= 0 ? styles.deltaTextDown : styles.deltaTextUp,
                    ]}
                  >
                    {delta === 0
                      ? "sin cambios"
                      : `${delta < 0 ? "↓" : "↑"} ${kg(Math.abs(delta))} kg`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {weightPending ? (
            <View style={styles.chartPlaceholder}>
              <ActivityIndicator color={HomeColors.primary} />
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

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLogging(true)}
            style={styles.logButton}
          >
            <Text style={styles.logButtonText}>Registrar peso de hoy</Text>
          </TouchableOpacity>
        </View>

        {/* ------------------------------------------------------- resumen */}
        <Text style={styles.section}>Tu actividad</Text>

        <View style={styles.grid}>
          <Stat
            value={String(summary?.finishedSessions ?? 0)}
            label="Entrenamientos"
          />
          <Stat value={String(summary?.totalSets ?? 0)} label="Series" />
          <Stat
            value={compact(summary?.totalVolumeKg ?? 0)}
            label="Volumen total"
            hint="peso × repeticiones"
          />
          <Stat value={`Nivel ${level.level}`} label={`${level.percent}% al siguiente`} />
        </View>

        {/* ------------------------------------------------------- fuerza */}
        <Text style={styles.section}>Tus marcas</Text>

        {exercises && exercises.length > 0 ? (
          <View style={styles.marks}>
            {exercises.map((exercise) => (
              <View key={exercise.exerciseId} style={styles.mark}>
                <View style={styles.markText}>
                  <Text style={styles.markName}>{exercise.name}</Text>
                  <Text style={styles.markMuscle}>
                    {exercise.muscleGroup} · {exercise.totalSets} series
                  </Text>
                </View>

                <View style={styles.markBest}>
                  <Text style={styles.markWeight}>
                    {exercise.bestWeightKg === 0
                      ? "Corporal"
                      : `${kg(exercise.bestWeightKg)} kg`}
                  </Text>
                  <Text style={styles.markReps}>
                    × {exercise.bestReps} reps
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Cuando registres series aparecerán aquí tus mejores marcas de
              cada ejercicio.
            </Text>
          </View>
        )}
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
    </SafeAreaView>
  );
}

function Stat({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
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
    marginTop: 20,
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

  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primarySoft,
  },

  headerTitles: { flexShrink: 1 },

  headerRight: { alignItems: "flex-end", gap: 6 },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: HomeColors.text,
  },

  cardLabel: { fontSize: 13, color: HomeColors.textSecondary },

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

  deltaDown: { backgroundColor: "rgba(48,209,88,0.14)" },
  deltaUp: { backgroundColor: "rgba(255,159,10,0.14)" },

  deltaText: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
  deltaTextDown: { color: HomeColors.success },
  deltaTextUp: { color: HomeColors.warning },

  ranges: { marginBottom: 14 },

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
    backgroundColor: HomeColors.primarySoft,
  },

  logButtonText: { fontSize: 15, fontWeight: "700", color: HomeColors.primary },

  section: {
    marginTop: 30,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: "700",
    color: HomeColors.text,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  stat: {
    flexBasis: "47.8%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  statLabel: { marginTop: 4, fontSize: 13, color: HomeColors.textSecondary },
  statHint: { marginTop: 2, fontSize: 10, color: HomeColors.textTertiary },

  marks: { gap: 10 },

  mark: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  markText: { flex: 1 },
  markName: { fontSize: 16, fontWeight: "700", color: HomeColors.text },
  markMuscle: { marginTop: 2, fontSize: 12, color: HomeColors.textSecondary },

  markBest: { alignItems: "flex-end" },

  markWeight: {
    fontSize: 17,
    fontWeight: "800",
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },

  markReps: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  empty: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },
});
