import { ArrowUpRight01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HomeColors } from "../home-theme";

type Props = {
  onPress: () => void;
  sessionsThisWeek: number;
  targetDays: number | null;
};

/**
 * Mensaje derivado de los datos, no generado por la IA todavía. Cuando el
 * chat del coach exista, este texto debería venir de ahí.
 */
const buildMessage = (done: number, target: number | null) => {
  if (done === 0) {
    return {
      title: "Empecemos la semana.",
      description: "Aún no has entrenado estos últimos siete días.",
    };
  }

  if (target && done >= target) {
    return {
      title: "Semana cumplida.",
      description: `Llevas ${done} ${done === 1 ? "sesión" : "sesiones"} y tu objetivo era ${target}. Lo que venga es extra.`,
    };
  }

  if (target) {
    const left = target - done;

    return {
      title: "Vas por buen camino.",
      description: `Llevas ${done} de ${target} ${target === 1 ? "sesión" : "sesiones"}. Te ${left === 1 ? "queda una" : `quedan ${left}`} para cerrar la semana.`,
    };
  }

  return {
    title: "Buen ritmo.",
    description: `Llevas ${done} ${done === 1 ? "sesión" : "sesiones"} estos últimos siete días.`,
  };
};

export function CoachInsightCard({
  onPress,
  sessionsThisWeek,
  targetDays,
}: Props) {
  const message = buildMessage(sessionsThisWeek, targetDays);

  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.icon}><HugeiconsIcon icon={SparklesIcon} color={HomeColors.purple} size={21} strokeWidth={2.2} /></View>
    <View style={styles.copy}><Text style={styles.eyebrow}>COACH ATHLOS</Text><Text style={styles.title}>{message.title}</Text><Text style={styles.description}>{message.description}</Text></View>
    <HugeiconsIcon icon={ArrowUpRight01Icon} color={HomeColors.text} size={22} strokeWidth={2} />
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, minHeight: 128, padding: 20, borderRadius: 24, backgroundColor: HomeColors.purpleSoft, flexDirection: "row", alignItems: "flex-start", gap: 14 }, pressed: { opacity: 0.78 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: HomeColors.surfaceElevated, justifyContent: "center", alignItems: "center" }, copy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: HomeColors.purple }, title: { fontSize: 17, fontWeight: "700", color: HomeColors.text }, description: { fontSize: 14, lineHeight: 20, color: HomeColors.textSecondary },
});
