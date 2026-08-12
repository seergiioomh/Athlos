import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import type { BattleScore } from "@/services/battles";
import { initial, points } from "../format";

interface Props {
  score: BattleScore[];
  meId: string;
}

/** Oro, plata y bronce para el podio; el resto en gris. */
const POSITION_COLORS = ["#FFC24D", "#C8CBD0", "#CD7F32"];

export function BattleLeaderboard({ score, meId }: Props) {
  return (
    <View style={styles.card}>
      {score.map((row, index) => {
        const soyYo = row.userId === meId;
        const color = POSITION_COLORS[index] ?? HomeColors.textSecondary;
        const last = index === score.length - 1;

        return (
          <View
            key={row.userId}
            style={[
              styles.row,
              !last && styles.rowDivider,
              soyYo && styles.rowMine,
            ]}
          >
            <Text style={[styles.position, { color }]}>{index + 1}</Text>

            <View style={[styles.avatar, { borderColor: soyYo ? HomeColors.primary : color }]}>
              <Text
                style={[
                  styles.avatarText,
                  { color: soyYo ? HomeColors.primary : color },
                ]}
              >
                {initial(row.displayName)}
              </Text>
            </View>

            <View style={styles.copy}>
              <Text
                style={[styles.name, soyYo && styles.nameMine]}
                numberOfLines={1}
              >
                {soyYo ? "Tú" : row.displayName}
              </Text>
              <Text style={styles.detail}>
                {row.sessionsDone} de {row.targetSessions} sesiones
              </Text>
            </View>

            <Text style={[styles.points, soyYo && styles.pointsMine]}>
              {points(row.totalPoints)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    paddingHorizontal: 14,
    overflow: "hidden",
  },

  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: HomeColors.border },

  // Tu fila teñida: en una lista de ocho, encontrarte tiene que ser inmediato.
  rowMine: {
    backgroundColor: HomeColors.primarySoft,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },

  position: {
    width: 20,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: HomeColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: { fontSize: 13, fontWeight: "700" },

  copy: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: HomeColors.text },
  nameMine: { color: HomeColors.primary, fontWeight: "700" },
  detail: { marginTop: 1, fontSize: 11, color: HomeColors.textSecondary },

  points: {
    fontSize: 16,
    fontWeight: "800",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  pointsMine: { color: HomeColors.primary },
});
