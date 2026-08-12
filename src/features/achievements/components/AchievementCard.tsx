import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import {
  familyColor,
  progressOf,
  type Achievement,
  type AchievementMetrics,
} from "../definitions";
import { AchievementBadge } from "./AchievementBadge";

interface Props {
  achievement: Achievement;
  metrics: AchievementMetrics;
  /** Fecha de desbloqueo, o null si sigue bloqueado. */
  unlockedAt: string | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const formatNumber = (value: number) =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 0 });

export function AchievementCard({ achievement, metrics, unlockedAt }: Props) {
  const color = familyColor(achievement.family);

  const actual = metrics[achievement.metric];
  const progress = progressOf(achievement, metrics);

  /**
   * Manda la métrica, no la fila guardada. La tabla solo recuerda *cuándo* se
   * consiguió, y puede ir por detrás: el historial anterior a que existieran
   * los logros cumple umbrales sin tener fila, y hasta que se guarda no hay
   * fecha. Mirando la fila, esos salían bloqueados enseñando "1 / 1".
   */
  const unlocked = actual >= achievement.threshold;

  return (
    <View
      style={[
        styles.card,
        // Conseguido: borde del color de su familia y un fondo teñido apenas
        // perceptible. Basta para que la rejilla se lea de un vistazo sin
        // convertirla en un semáforo.
        unlocked && { borderColor: color, backgroundColor: `${color}0F` },
      ]}
    >
      <View style={styles.badgeRow}>
        <AchievementBadge
          icon={achievement.icon}
          color={color}
          unlocked={unlocked}
        />
      </View>

      <Text
        style={[styles.name, !unlocked && styles.nameLocked]}
        numberOfLines={2}
      >
        {achievement.name}
      </Text>

      {unlocked ? (
        // Sin fecha mientras no se haya guardado la fila. Se dice igual que
        // está conseguido: callar dejaría la tarjeta a medias.
        <Text style={styles.date}>
          {unlockedAt ? formatDate(unlockedAt) : "Conseguido"}
        </Text>
      ) : (
        <>
          <Text style={styles.hint} numberOfLines={3}>
            {achievement.hint}
          </Text>

          {/* Cuánto llevas, no solo un candado: "7 de 10" invita a volver.
              Va abajo del todo para que las barras de una misma fila queden
              a la misma altura por largo que sea el texto de arriba. */}
          <View style={styles.footer}>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: color },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {formatNumber(Math.min(actual, achievement.threshold))} /{" "}
              {formatNumber(achievement.threshold)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47.8%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },

  // Todo centrado bajo el emblema, como una medalla en su vitrina.
  badgeRow: { alignItems: "center", marginBottom: 12 },

  name: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    color: HomeColors.text,
    textAlign: "center",
    // Sitio para dos líneas siempre. Con nombres de una y de dos conviviendo
    // en la misma fila, todo lo que va debajo bailaba de una tarjeta a otra.
    minHeight: 38,
  },

  nameLocked: { color: HomeColors.textSecondary },

  date: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: HomeColors.textTertiary,
    textAlign: "center",
  },

  hint: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 15,
    color: HomeColors.textTertiary,
    textAlign: "center",
  },

  // `marginTop: auto` es lo que alinea las barras: la tarjeta se estira hasta
  // la más alta de su fila y el pie se queda pegado abajo en todas.
  footer: { marginTop: "auto" },

  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
    overflow: "hidden",
  },

  barFill: { height: "100%" },

  progressText: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "600",
    color: HomeColors.textTertiary,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});
