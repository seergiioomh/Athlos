import { StyleSheet, TouchableOpacity, View } from "react-native";

import type { WeekSession } from "@/services/home";
import { Colors } from "@/theme/colors";

interface Props {
  sessions: WeekSession[];
  onSelectDay: (sessionId: string, date: Date) => void;
}

// Cuatro semanas exactas: el heatmap siempre cierra el rectángulo y nunca
// deja dos casillas sueltas al final.
const DAYS = 28;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Las últimas cuatro semanas con la misma lectura visual que «Historia»: una
 * casilla encendida significa entrenamiento terminado. */
export function TrainingHeatmap({ sessions, onSelectDay }: Props) {
  const today = new Date();
  const first = new Date(today);
  first.setDate(today.getDate() - (DAYS - 1));

  const days = Array.from({ length: DAYS }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);

    const session = [...sessions]
      .reverse()
      .find(
        (item) =>
          item.finishedAt && isSameDay(new Date(item.finishedAt), date)
      );

    return { date, sessionId: session?.id ?? null };
  });

  return (
    <View style={styles.container}>
      {days.map(({ date, sessionId }) => {
        const trained = Boolean(sessionId);
        return (
          <View key={date.toISOString()} style={styles.slot}>
            <TouchableOpacity
              activeOpacity={trained ? 0.78 : 1}
              disabled={!trained}
              accessibilityLabel={`${date.toLocaleDateString("es-ES")}${
                trained ? ", entrenamiento realizado" : ", sin entrenamiento"
              }`}
              onPress={() => sessionId && onSelectDay(sessionId, date)}
              style={[styles.day, trained && styles.dayTrained]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  slot: { width: "14.2857%", padding: 2 },
  day: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  dayTrained: { backgroundColor: Colors.pink },
});
