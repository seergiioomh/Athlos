import { ArrowRight01Icon, Sword01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useUserId } from "@/features/auth/session";
import { daysLeftLabel, points } from "@/features/battles/format";
import { useBattleScore, useCurrentBattle } from "@/features/battles/queries";
import { HomeColors } from "../home-theme";

interface Props {
  onPress: () => void;
}

/**
 * La batalla en curso, en Inicio.
 *
 * Solo aparece mientras está activa: es información con fecha de caducidad, y
 * el sitio donde tiene sentido mirarla a diario es la pantalla que se abre
 * todos los días. La sala de espera y el resultado viven en su pantalla, que
 * no se consultan igual de a menudo.
 */
export function BattleCard({ onPress }: Props) {
  const meId = useUserId()!;

  const { data: battle } = useCurrentBattle();
  const activa = battle?.status === "active";

  const { data: score } = useBattleScore(activa ? battle?.id : undefined);

  if (!activa || !score || score.length === 0) return null;

  const posicion = score.findIndex((row) => row.userId === meId) + 1;
  const yo = score[posicion - 1];
  const lider = score[0];

  if (!yo) return null;

  const voyGanando = posicion === 1;
  const avance = lider.totalPoints > 0
    ? Math.max(8, Math.min(100, (yo.totalPoints / lider.totalPoints) * 100))
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          <HugeiconsIcon
            icon={Sword01Icon}
            size={17}
            color={HomeColors.primary}
            strokeWidth={2}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>BATALLA ACTIVA</Text>
          <Text style={styles.name} numberOfLines={1}>
            {battle.name}
          </Text>
        </View>

        <View style={styles.daysPill}>
          <Text style={styles.days}>{daysLeftLabel(battle.endsAt)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.position}>
          <Text style={[styles.positionValue, voyGanando && styles.positionWinning]}>
            {posicion}º
          </Text>
        </View>

        <View style={styles.pointsBox}>
          <View style={styles.pointsHeader}>
            <Text style={styles.pointsLabel}>TU PUNTUACIÓN</Text>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={17}
              color={HomeColors.textSecondary}
              strokeWidth={2}
            />
          </View>
          <Text style={styles.pointsValue}>{points(yo.totalPoints)} <Text style={styles.pointsUnit}>pts</Text></Text>
          {score.length > 1 && (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${avance}%` },
                  voyGanando && styles.fillWinning,
                ]}
              />
            </View>
          )}
        </View>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  header: { flexDirection: "row", alignItems: "center", gap: 10 },

  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0.7, color: HomeColors.primary },
  name: { marginTop: 2, fontSize: 16, fontWeight: "700", color: HomeColors.text },
  daysPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: HomeColors.surfaceElevated },
  days: { fontSize: 11, fontWeight: "600", color: HomeColors.textSecondary },

  body: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 18,
  },

  position: { width: 88, alignItems: "center" },

  positionValue: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },
  positionWinning: { color: HomeColors.primary },

  pointsBox: { flex: 1 },

  pointsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  pointsValue: {
    marginTop: 2,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  pointsUnit: { fontSize: 14, fontWeight: "700", color: HomeColors.textSecondary },
  pointsLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6, color: HomeColors.textTertiary },

  track: { height: 6, marginTop: 9, borderRadius: 3, overflow: "hidden", backgroundColor: HomeColors.border },
  fill: { height: "100%", borderRadius: 3, backgroundColor: HomeColors.purple },
  fillWinning: { backgroundColor: HomeColors.primary },

});
