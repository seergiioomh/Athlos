import { CrownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";

import { Card } from "@/components/ui/Card";
import { HomeColors } from "@/features/home/home-theme";
import { EXP_PER_LEVEL, levelName, type LevelProgress } from "@/features/home/level";

type Props = {
  onPress: () => void;
  progress: LevelProgress;
};

const RING_SIZE = 118;
const RING_STROKE = 13;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * El anillo no cierra: deja un hueco abajo, como un cuentakilómetros. Con el
 * arco de 270° el número del centro respira y el hueco marca dónde empieza y
 * acaba la escala.
 */
const ARC = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC;
// Girar 135° coloca el arranque abajo a la izquierda, dejando el hueco
// centrado en la parte inferior.
const ARC_ROTATION = 135;

export function LevelCard({ onPress, progress }: Props) {
  const filled = Math.min(Math.max(progress.percent, 0), 100) / 100;
  const center = RING_SIZE / 2;

  return <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Nivel ATHLOS</Text>
        <View style={styles.action}><HugeiconsIcon icon={CrownIcon} color={HomeColors.purple} size={15} strokeWidth={2.2} /></View>
      </View>

      <View style={styles.ringRow}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgLinearGradient id="levelRing" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={HomeColors.purple} />
              <Stop offset="0.4" stopColor={HomeColors.pink} />
              <Stop offset="0.7" stopColor={HomeColors.orange} />
              <Stop offset="1" stopColor={HomeColors.primary} />
            </SvgLinearGradient>
          </Defs>

          {/* El arco completo, apagado: mantiene el degradado a la vista para
              que se entienda hasta dónde se puede llegar. */}
          <Circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="url(#levelRing)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            opacity={0.22}
            transform={`rotate(${ARC_ROTATION} ${center} ${center})`}
          />

          <Circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="url(#levelRing)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH * filled} ${CIRCUMFERENCE}`}
            transform={`rotate(${ARC_ROTATION} ${center} ${center})`}
          />
        </Svg>

        <View style={styles.ringCenter} pointerEvents="none">
          <Text selectable style={styles.level}>{progress.level}</Text>
          <Text style={styles.rank}>{levelName(progress.level)}</Text>
        </View>
      </View>

      <Text style={styles.exp}>
        <Text style={styles.expValue}>{progress.expIntoLevel}</Text>
        {` / ${EXP_PER_LEVEL} XP`}
      </Text>
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { flexBasis: "48%", maxWidth: "48%", minWidth: 0 }, pressed: { opacity: 0.78 },
  card: { minHeight: 206, padding: 12, marginBottom: 0, borderRadius: 18, backgroundColor: HomeColors.surface, borderWidth: 0, boxShadow: "none", shadowOpacity: 0, shadowRadius: 0, elevation: 0, alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", alignSelf: "stretch" },
  title: { flex: 1, fontSize: 13, lineHeight: 16, fontWeight: "700", color: HomeColors.text },
  action: { width: 24, height: 24, borderRadius: 7, backgroundColor: HomeColors.purpleSoft, alignItems: "center", justifyContent: "center" },
  ringRow: { height: RING_SIZE, marginTop: 10, alignItems: "center", justifyContent: "center" },
  // El arco abre por abajo, así que su centro óptico queda más alto que el
  // geométrico: sin subir el bloque, el número se ve caído hacia el hueco.
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", transform: [{ translateY: -7 }] },
  level: { color: HomeColors.text, fontSize: 34, fontWeight: "700", letterSpacing: -1.2, fontVariant: ["tabular-nums"] },
  rank: { marginTop: -2, fontSize: 11, color: HomeColors.textSecondary },
  // Pegada al anillo y no al fondo de la tarjeta: es la lectura del propio
  // anillo, no un pie de página.
  exp: { marginTop: 4, fontSize: 13, fontWeight: "600", color: HomeColors.textSecondary, fontVariant: ["tabular-nums"] },
  expValue: { color: HomeColors.purple, fontWeight: "800" },
});
