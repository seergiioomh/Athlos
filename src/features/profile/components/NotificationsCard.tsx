import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Switch, Text, View } from "react-native";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { HomeColors } from "@/features/home/home-theme";

interface Props {
  enabled: boolean;
  hour: number;
  onToggle: (enabled: boolean) => void;
  onChangeHour: (hour: number) => void;
}

// Un puñado de horas razonables en vez de un selector de 24: nadie pide que
// le recuerden entrenar a las 4 de la mañana, y menos opciones se eligen antes.
const hours = [
  { value: 8, label: "8:00" },
  { value: 13, label: "13:00" },
  { value: 18, label: "18:00" },
  { value: 21, label: "21:00" },
];

export function NotificationsCard({
  enabled,
  hour,
  onToggle,
  onChangeHour,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <HugeiconsIcon
            icon={Notification03Icon}
            size={19}
            color={HomeColors.primary}
            strokeWidth={2}
          />
        </View>

        <View style={styles.text}>
          <Text style={styles.title}>Recordatorios</Text>
          <Text style={styles.subtitle}>
            Un aviso los días que te toca entrenar
          </Text>
        </View>

        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: HomeColors.border, true: HomeColors.primary }}
          thumbColor={HomeColors.text}
        />
      </View>

      {/* La hora solo importa si los avisos están encendidos. */}
      {enabled && (
        <View style={styles.hours}>
          <SegmentedControl
            options={hours}
            value={hour}
            onChange={onChangeHour}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 14 },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  text: { flex: 1 },

  title: { fontSize: 16, fontWeight: "700", color: HomeColors.text },

  subtitle: { marginTop: 2, fontSize: 13, color: HomeColors.textSecondary },

  hours: { marginTop: 14 },
});
