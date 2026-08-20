import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { levelName, type LevelProgress } from "@/features/home/level";
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

type Tone = "up" | "down" | "neutral";

/**
 * El cambio, en las menos palabras posibles: "+3", "−12 %".
 *
 * Antes ponía "+3 vs. periodo anterior" en cada métrica, y eso ya lo dice el
 * encabezado de la sección una sola vez. Repetirlo tres veces a 11 px llenaba
 * de letra la parte que tenía que leerse de un vistazo.
 */
function delta(
  current: number,
  previous: number,
  mode: "absolute" | "percent"
): { text: string; tone: Tone } {
  if (current === 0 && previous === 0) return { text: "sin datos", tone: "neutral" };
  if (previous === 0) return { text: "nuevo", tone: "up" };

  if (mode === "absolute") {
    const diff = current - previous;
    if (diff === 0) return { text: "igual", tone: "neutral" };

    return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`, tone: diff > 0 ? "up" : "down" };
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { text: "igual", tone: "neutral" };

  return {
    text: `${percent > 0 ? "+" : "−"}${Math.abs(percent)} %`,
    tone: percent > 0 ? "up" : "down",
  };
}

/**
 * Una métrica del periodo: cifra, cambio y **la forma del cambio**.
 *
 * La barra es lo que esta sección no tenía. La gráfica de peso funciona porque
 * dibuja algo; debajo eran cifras dentro de cajas, teniendo los dos números
 * —el de ahora y el de antes— sin usar ninguno para dibujar.
 *
 * Una sola barra y una marca, no dos barras: la barra es este periodo y la
 * marca dice dónde quedó el anterior. Se lee sin leyenda, porque pasarse de la
 * marca es ir a más y quedarse corto es ir a menos.
 */
function Metric({
  label,
  value,
  current,
  previous,
  mode,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  mode: "absolute" | "percent";
}) {
  const cambio = delta(current, previous, mode);

  const color =
    cambio.tone === "up"
      ? HomeColors.success
      : cambio.tone === "down"
        ? HomeColors.warning
        : HomeColors.textTertiary;

  // El mayor de los dos llega al final, así que siempre hay algo que ver
  // aunque las cifras sean pequeñas.
  const tope = Math.max(current, previous, 1);
  const anchoAhora = Math.round((current / tope) * 100);
  const anchoAntes = Math.round((previous / tope) * 100);

  return (
    <View style={styles.metric}>
      <View style={styles.metricHead}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.deltaRow}>
          {cambio.tone !== "neutral" && (
            <HugeiconsIcon
              icon={cambio.tone === "up" ? ArrowUpRight01Icon : ArrowDownRight01Icon}
              size={12}
              color={color}
              strokeWidth={2.5}
            />
          )}
          <Text style={[styles.deltaText, { color }]}>{cambio.text}</Text>
        </View>
      </View>

      <Text style={styles.value}>{value}</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${anchoAhora}%` }]} />

        {/* Solo cuando el periodo anterior tuvo algo: una marca en el cero no
            señala nada y se confunde con el borde de la barra. */}
        {previous > 0 && (
          <View style={[styles.tick, { left: `${anchoAntes}%` }]} />
        )}
      </View>
    </View>
  );
}

export function ActivityStats({ days, summary, level }: Props) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Tu actividad</Text>
        <Text style={styles.note}>vs. los {days} días anteriores</Text>
      </View>

      {/* Las tres del periodo van juntas en una tarjeta, porque las tres
          contestan a la misma pregunta. El nivel no, y por eso está fuera. */}
      <View style={styles.card}>
        <Metric
          label="Entrenamientos"
          value={String(summary?.sessionsCurrent ?? 0)}
          current={summary?.sessionsCurrent ?? 0}
          previous={summary?.sessionsPrevious ?? 0}
          mode="absolute"
        />

        <View style={styles.divider} />

        <Metric
          label="Series"
          value={String(summary?.setsCurrent ?? 0)}
          current={summary?.setsCurrent ?? 0}
          previous={summary?.setsPrevious ?? 0}
          mode="percent"
        />

        <View style={styles.divider} />

        <Metric
          label="Volumen"
          value={compact(summary?.volumeCurrentKg ?? 0)}
          current={summary?.volumeCurrentKg ?? 0}
          previous={summary?.volumePreviousKg ?? 0}
          mode="percent"
        />
      </View>

      {/* Fuera de la rejilla del periodo, y no por estética: el encabezado de
          arriba promete "vs. los N días anteriores" y el nivel no compara
          nada: es acumulado de toda la vida. Estaba de cuarta baldosa, con la
          misma pinta que las otras tres y jugando a otra cosa. */}
      <View style={styles.levelCard}>
        <View style={styles.levelHead}>
          <View>
            <Text style={styles.levelRank}>{levelName(level.level)}</Text>
            <Text style={styles.levelSub}>Nivel {level.level} · desde el primer día</Text>
          </View>

          <Text style={styles.levelPercent}>{level.percent}%</Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${level.percent}%` }]} />
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

  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  divider: {
    height: 1,
    marginVertical: 16,
    backgroundColor: HomeColors.border,
  },

  metric: { gap: 6 },

  metricHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: { fontSize: 13, color: HomeColors.textSecondary },

  deltaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  deltaText: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },

  value: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: HomeColors.border,
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: HomeColors.pink,
  },

  // Dónde quedó el periodo anterior. Va por encima del relleno, así que se ve
  // igual esté por delante o por detrás.
  tick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: HomeColors.text,
    opacity: 0.55,
  },

  levelCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
    gap: 12,
  },

  levelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  levelRank: { fontSize: 17, fontWeight: "700", color: HomeColors.text },
  levelSub: { marginTop: 2, fontSize: 12, color: HomeColors.textSecondary },

  levelPercent: {
    fontSize: 22,
    fontWeight: "800",
    color: HomeColors.pink,
    fontVariant: ["tabular-nums"],
  },
});
