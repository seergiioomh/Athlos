import {
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  visible: boolean;
  trainingDates: string[];
  loading: boolean;
  error?: string;
  onClose: () => void;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const monthLabel = (date: Date) =>
  new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })
    .format(date)
    .toLocaleUpperCase("es-ES");

const monthRange = (trainingDates: string[]) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), 1);
  const minimumStart = new Date(current.getFullYear(), current.getMonth() - 11, 1);
  const firstDate = trainingDates.reduce<Date | null>((earliest, value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return !earliest || date < earliest ? date : earliest;
  }, null);
  const historyStart = firstDate
    ? new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
    : minimumStart;
  const first = historyStart < minimumStart ? historyStart : minimumStart;
  const months: Date[] = [];

  for (let date = first; date <= current; date = new Date(date.getFullYear(), date.getMonth() + 1, 1)) {
    months.push(date);
  }

  return months;
};

/** Calendario compacto de constancia: una casilla se enciende o se queda oscura. */
export function TrainingHistoryModal({
  visible,
  trainingDates,
  loading,
  error,
  onClose,
}: Props) {
  const historyRef = useRef<ScrollView>(null);
  const shouldScrollToCurrent = useRef(true);
  const trainedDays = useMemo(() => new Set(trainingDates), [trainingDates]);
  const months = useMemo(() => monthRange(trainingDates), [trainingDates]);

  useEffect(() => {
    if (visible) shouldScrollToCurrent.current = true;
  }, [visible]);

  const scrollToCurrentMonth = () => {
    if (!shouldScrollToCurrent.current) return;

    historyRef.current?.scrollToEnd({ animated: false });
    shouldScrollToCurrent.current = false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.modalWrap} pointerEvents="box-none">
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Historia</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              hitSlop={10}
              style={styles.close}
              accessibilityLabel="Cerrar historia"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={18}
                color={HomeColors.text}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={HomeColors.primary} />
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <ScrollView
              ref={historyRef}
              style={styles.history}
              contentContainerStyle={styles.historyContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToCurrentMonth}
            >
              {months.map((month) => (
                <HeatmapMonth key={month.toISOString()} month={month} trainedDays={trainedDays} />
              ))}
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

function HeatmapMonth({ month, trainedDays }: { month: Date; trainedDays: Set<string> }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 ? day : null;
  });

  return (
    <View style={styles.month}>
      <Text style={styles.monthTitle}>{monthLabel(month)}</Text>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.daySlot} />;

          const trained = trainedDays.has(dateKey(year, monthIndex, day));
          return (
            <View key={day} style={styles.daySlot}>
              <View style={[styles.day, trained && styles.dayTrained]}>
                <Text style={[styles.dayText, trained && styles.dayTextTrained]}>{day}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)" },
  modalWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 12 },
  modal: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
    height: "86%",
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 23, fontWeight: "800", letterSpacing: -0.4, color: HomeColors.text },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surfaceElevated,
  },
  history: { flex: 1, marginTop: 22 },
  historyContent: { gap: 28, paddingBottom: 4 },
  month: {},
  monthTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: HomeColors.textSecondary,
  },
  weekdays: { marginTop: 14, flexDirection: "row" },
  weekday: {
    width: "14.2857%",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    color: HomeColors.textTertiary,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  daySlot: { width: "14.2857%", alignItems: "center", marginBottom: 12 },
  day: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surfaceElevated,
  },
  dayTrained: { backgroundColor: HomeColors.primary },
  dayText: { fontSize: 13, fontWeight: "700", color: HomeColors.textSecondary },
  dayTextTrained: { color: HomeColors.onPrimary },
  state: { height: 225, alignItems: "center", justifyContent: "center" },
  error: { marginTop: 34, marginBottom: 34, textAlign: "center", fontSize: 13, color: HomeColors.errorText },
});
