import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { Card } from "@/components/ui/Card";
import { HomeColors } from "@/features/home/home-theme";
import type { WeightPoint } from "@/services/home";
import { smoothPath } from "@/utils/chart";

type Props = { onPress: () => void; history: WeightPoint[] };

// Coordenadas propias: el SVG se estira al ancho de la tarjeta.
const WIDTH = 160;
const HEIGHT = 100;
const TOP = 10;
const BOTTOM = 88;

const format = (value: number) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/**
 * Con qué peso comparamos. Se busca el último registro de hace una semana o
 * más; si no hay ninguno, se compara con el más antiguo disponible y se dice
 * que el periodo es otro. Restar contra el primer punto de la lista sin más
 * llamaría "esta semana" a una diferencia de un mes.
 */
function reference(history: WeightPoint[]) {
  const limit = new Date();
  limit.setDate(limit.getDate() - 7);
  const iso = limit.toISOString().slice(0, 10);

  const older = [...history]
    .reverse()
    .find((point) => point.measuredOn <= iso);

  return older
    ? { point: older, period: "esta semana" }
    : { point: history[0], period: "en total" };
}

export function WeightCard({ onPress, history }: Props) {
  const values = history.map((point) => point.weightKg);

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Sin margen, una semana de pesos casi iguales daría una línea pegada al
  // borde superior o inferior.
  const padding = (max - min) * 0.3 || 0.5;
  const low = min - padding;
  const range = max + padding - low;

  const points = history.map((point, index) => {
    const x =
      history.length > 1
        ? (index / (history.length - 1)) * WIDTH
        : WIDTH / 2;

    const y = BOTTOM - ((point.weightKg - low) / range) * (BOTTOM - TOP);

    return [x, y] as const;
  });

  const line = smoothPath(points);
  const area = `${line} L${points[points.length - 1][0]} ${HEIGHT} L${points[0][0]} ${HEIGHT} Z`;

  const current = values[values.length - 1];
  const { point, period } = reference(history);
  const delta = current - point.weightKg;

  return <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Evolución de peso</Text>
        <View style={styles.action}><HugeiconsIcon icon={ArrowUpRight01Icon} color={HomeColors.primary} size={17} strokeWidth={2.2} /></View>
      </View>

      <Text selectable style={styles.weight}>
        {format(current)}<Text style={styles.unit}> kg</Text>
      </Text>

      {/* La cifra destaca en lima y el periodo se queda en gris: es contexto,
          no el dato. */}
      <Text style={styles.delta}>
        <Text style={styles.deltaValue}>
          {delta === 0
            ? "Sin cambios"
            : `${delta > 0 ? "+" : "−"}${format(Math.abs(delta))} kg`}
        </Text>
        {` ${period}`}
      </Text>

      <View style={styles.chart}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="cardArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={HomeColors.primary} stopOpacity="0.3" />
              <Stop offset="1" stopColor={HomeColors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {history.length > 1 && <Path d={area} fill="url(#cardArea)" />}

          <Path d={line} fill="none" stroke={HomeColors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </Svg>
      </View>
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { flexBasis: "48%", maxWidth: "48%", minWidth: 0 }, pressed: { opacity: 0.78 },
  card: { minHeight: 206, padding: 12, marginBottom: 0, borderRadius: 18, backgroundColor: HomeColors.surface, borderWidth: 0, boxShadow: "none", shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  title: { flex: 1, fontSize: 13, lineHeight: 16, fontWeight: "700", color: HomeColors.text },
  action: { width: 24, height: 24, borderRadius: 7, backgroundColor: HomeColors.primarySoft, alignItems: "center", justifyContent: "center" },
  weight: { marginTop: 10, color: HomeColors.text, fontSize: 28, fontWeight: "700", letterSpacing: -1.2, fontVariant: ["tabular-nums"] },
  unit: { color: HomeColors.textSecondary, fontSize: 13, fontWeight: "600", letterSpacing: 0 },
  delta: { marginTop: 2, fontSize: 12, fontWeight: "600", color: HomeColors.textSecondary, fontVariant: ["tabular-nums"] },
  // El signo ya dice si sube o baja; teñirlo de verde o rojo daría por hecho
  // que bajar es bueno, y eso depende del objetivo de cada uno.
  deltaValue: { color: HomeColors.primary },
  chart: { flex: 1, marginTop: 10, marginHorizontal: -12, marginBottom: -12, overflow: "hidden", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
});
