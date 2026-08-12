import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const [detailVisible, setDetailVisible] = useState(false);
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
    <>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setDetailVisible(true)}
        style={[
          styles.card,
          // Conseguido: borde del color de su familia y un fondo teñido apenas
          // perceptible. Basta para que la rejilla se lea de un vistazo sin
          // convertirla en un semáforo.
          unlocked && { borderColor: color, backgroundColor: `${color}0F` },
        ]}
        accessibilityLabel={`Ver logro: ${achievement.name}`}
      >
        <View style={styles.badgeRow}>
          <AchievementBadge
            icon={achievement.icon}
            color={color}
            unlocked={unlocked}
            size={48}
          />
        </View>

        <Text
          style={[styles.name, !unlocked && styles.nameLocked]}
          numberOfLines={2}
        >
          {achievement.name}
        </Text>

        {unlocked && unlockedAt && (
          <Text style={styles.date}>{formatDate(unlockedAt)}</Text>
        )}
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={detailVisible}
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setDetailVisible(false)}
            style={styles.modalBackdrop}
            accessibilityLabel="Cerrar detalle del logro"
          />

          <View style={styles.detailCard}>
            <AchievementBadge
              icon={achievement.icon}
              color={color}
              unlocked={unlocked}
              size={76}
            />

            <Text style={styles.detailName}>{achievement.name}</Text>
            <Text style={styles.detailHint}>{achievement.hint}</Text>

            {unlocked ? (
              <Text style={styles.detailDate}>
                {unlockedAt ? `Conseguido el ${formatDate(unlockedAt)}` : "Conseguido"}
              </Text>
            ) : (
              <View style={styles.detailProgress}>
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
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setDetailVisible(false)}
              style={styles.close}
            >
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47.8%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },

  // Todo centrado bajo el emblema, como una medalla en su vitrina.
  badgeRow: { alignItems: "center", marginBottom: 8 },

  name: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    color: HomeColors.text,
    textAlign: "center",
    // Sitio para dos líneas siempre. Con nombres de una y de dos conviviendo
    // en la misma fila, todo lo que va debajo bailaba de una tarjeta a otra.
    minHeight: 36,
  },

  nameLocked: { color: HomeColors.textSecondary },

  date: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: HomeColors.textTertiary,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  detailCard: {
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    padding: 24,
    borderRadius: 26,
    backgroundColor: HomeColors.surface,
  },
  detailName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: HomeColors.text,
    textAlign: "center",
  },
  detailHint: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },
  detailDate: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.textTertiary,
  },
  detailProgress: { width: "100%", marginTop: 18 },

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
  close: {
    width: "100%",
    height: 48,
    marginTop: 22,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },
  closeText: { fontSize: 15, fontWeight: "700", color: HomeColors.onPrimary },
});
