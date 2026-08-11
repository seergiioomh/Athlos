import { ArrowUpRight01Icon, ArrowDownRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import type { LevelProgress } from "@/features/home/level";
import type { PeriodSummary } from "@/services/progress";

interface Props {
  days: number;
  summary: PeriodSummary | undefined;
  level: LevelProgress;
}

const compact = (value: number) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} t`
    : `${Math.round(value)} kg`;

/**
 * Compara contra el periodo anterior en vez de enseñar un total de toda la
 * vida: un número acumulado no dice si vas a más o a menos, y eso es
 * justo lo que esta tarjeta tiene que responder.
 */
function absoluteDelta(current: number, previous: number): {
  text: string;
  tone: "up" | "down" | "neutral";
} {
  if (current === 0 && previous === 0) {
    return { text: "sin datos en el periodo", tone: "neutral" };
  }
  if (previous === 0) return { text: "nuevo este periodo", tone: "up" };

  const diff = current - previous;
  if (diff === 0) return { text: "igual que el periodo anterior", tone: "neutral" };

  return {
    text: `${diff > 0 ? "+" : ""}${diff} vs. periodo anterior`,
    tone: diff > 0 ? "up" : "down",
  };
}

function percentDelta(current: number, previous: number): {
  text: string;
  tone: "up" | "down" | "neutral";
} {
  if (current === 0 && previous === 0) {
    return { text: "sin datos en el periodo", tone: "neutral" };
  }
  if (previous === 0) return { text: "nuevo este periodo", tone: "up" };

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { text: "igual que el periodo anterior", tone: "neutral" };

  return {
    text: `${percent > 0 ? "+" : ""}${percent}% vs. anterior`,
    tone: percent > 0 ? "up" : "down",
  };
}

function Delta({ tone, text }: { tone: "up" | "down" | "neutral"; text: string }) {
  if (tone === "neutral") {
    return <Text style={styles.deltaNeutral}>{text}</Text>;
  }

  const color = tone === "up" ? HomeColors.success : HomeColors.warning;

  return (
    <View style={styles.deltaRow}>
      <HugeiconsIcon
        icon={tone === "up" ? ArrowUpRight01Icon : ArrowDownRight01Icon}
        size={12}
        color={color}
        strokeWidth={2.5}
      />
      <Text style={[styles.deltaText, { color }]}>{text}</Text>
    </View>
  );
}

export function ActivityStats({ days, summary, level }: Props) {
  const sessions = absoluteDelta(
    summary?.sessionsCurrent ?? 0,
    summary?.sessionsPrevious ?? 0
  );
  const sets = percentDelta(summary?.setsCurrent ?? 0, summary?.setsPrevious ?? 0);
  const volume = percentDelta(
    summary?.volumeCurrentKg ?? 0,
    summary?.volumePreviousKg ?? 0
  );

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Tu actividad</Text>
        <Text style={styles.note}>vs. los {days} días anteriores</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={styles.value}>{summary?.sessionsCurrent ?? 0}</Text>
          <Text style={styles.label}>entrenamientos</Text>
          <Delta tone={sessions.tone} text={sessions.text} />
        </View>

        <View style={styles.tile}>
          <Text style={styles.value}>{summary?.setsCurrent ?? 0}</Text>
          <Text style={styles.label}>series</Text>
          <Delta tone={sets.tone} text={sets.text} />
        </View>

        <View style={styles.tile}>
          <Text style={styles.value}>{compact(summary?.volumeCurrentKg ?? 0)}</Text>
          <Text style={styles.label}>volumen total</Text>
          <Delta tone={volume.tone} text={volume.text} />
        </View>

        <View style={styles.tile}>
          <Text style={styles.value}>Nivel {level.level}</Text>
          <Text style={styles.label}>{level.percent}% al siguiente</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${level.percent}%` }]} />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 30,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  title: { fontSize: 20, fontWeight: "700", color: HomeColors.text },
  note: { fontSize: 12, color: HomeColors.textTertiary },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  tile: {
    flexBasis: "47.8%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  label: { marginTop: 3, marginBottom: 8, fontSize: 12, color: HomeColors.textSecondary },

  deltaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  deltaText: { fontSize: 11, fontWeight: "700" },
  deltaNeutral: { fontSize: 11, fontWeight: "600", color: HomeColors.textTertiary },

  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
    overflow: "hidden",
  },

  barFill: { height: "100%", backgroundColor: HomeColors.pink },
});
