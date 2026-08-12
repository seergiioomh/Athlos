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
  const diferencia = voyGanando
    ? yo.totalPoints - (score[1]?.totalPoints ?? 0)
    : lider.totalPoints - yo.totalPoints;

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
          <Text style={styles.name} numberOfLines={1}>
            {battle.name}
          </Text>
          <Text style={styles.days}>{daysLeftLabel(battle.endsAt)}</Text>
        </View>

        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={18}
          color={HomeColors.textSecondary}
          strokeWidth={2}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.position}>
          <Text style={styles.positionValue}>{posicion}º</Text>
          <Text style={styles.positionLabel}>de {score.length}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.pointsBox}>
          <Text style={styles.pointsValue}>{points(yo.totalPoints)}</Text>
          <Text style={styles.pointsLabel}>puntos</Text>
        </View>
      </View>

      <Text style={[styles.gap, voyGanando && styles.gapWinning]}>
        {score.length === 1
          ? "Todavía no hay rivales"
          : diferencia === 0
            ? "Empatado con el primero"
            : voyGanando
              ? `Vas primero por ${points(diferencia)}`
              : `Te faltan ${points(diferencia)} para el primero`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: HomeColors.surface,
  },

  header: { flexDirection: "row", alignItems: "center", gap: 10 },

  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: HomeColors.text },
  days: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  body: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 16,
  },

  position: { alignItems: "center" },

  positionValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },

  positionLabel: { fontSize: 11, color: HomeColors.textSecondary },

  divider: { width: 1, height: 34, backgroundColor: HomeColors.border },

  pointsBox: { flex: 1 },

  pointsValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  pointsLabel: { fontSize: 11, color: HomeColors.textSecondary },

  gap: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  gapWinning: { color: HomeColors.primary },
});
