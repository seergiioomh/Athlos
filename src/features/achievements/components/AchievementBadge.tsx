import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

import { Colors } from "@/theme/colors";
import { achievementIcon } from "../icons";

interface Props {
  icon: string;
  color: string;
  unlocked: boolean;
  /** Lado del cuadro que ocupa el emblema, halo incluido. */
  size?: number;
}

/**
 * Cuánto sobresale el halo respecto al hexágono. El emblema se dibuja más
 * pequeño para dejarle sitio dentro del mismo cuadro.
 */
const HALO_SCALE = 1.16;

/**
 * Los seis vértices de un hexágono con la punta arriba, que es la orientación
 * que se lee como medalla —de lado parece un panal—.
 *
 * Sale más alto que ancho (√3/2 de su altura), y así se queda: un emblema
 * apaisado no parece una insignia.
 */
function hexagon(size: number, radius: number): string {
  const center = size / 2;

  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 90) * Math.PI) / 180;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function AchievementBadge({
  icon,
  color,
  unlocked,
  size = 54,
}: Props) {
  const stroke = 2;

  // El halo llega al borde del cuadro y el hexágono se queda por dentro.
  const haloRadius = (size - stroke) / 2;
  const radius = haloRadius / HALO_SCALE;

  const points = hexagon(size, radius);
  const haloPoints = hexagon(size, haloRadius);
  const gradientId = `emblema-${icon}-${unlocked ? "on" : "off"}-${size}`;

  // Conseguido, un degradado del color de su familia: el metal de una medalla
  // nunca es plano. Pendiente, el gris de una superficie cualquiera.
  const stops = unlocked
    ? [
        { offset: "0%", color, opacity: "0.34" },
        { offset: "100%", color, opacity: "0.12" },
      ]
    : [
        { offset: "0%", color: Colors.surfaceElevated, opacity: "1" },
        { offset: "100%", color: Colors.surface, opacity: "1" },
      ];

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            {stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>

        {/* El halo va dibujado, no como sombra de la vista: `boxShadow` la
            proyecta el rectángulo del contenedor, así que detrás de un
            hexágono aparecía un cuadrado. Un hexágono mayor y translúcido
            sigue la forma y no ensucia las esquinas. */}
        {unlocked && (
          <Polygon
            points={haloPoints}
            fill={color}
            fillOpacity={0.13}
            strokeLinejoin="round"
          />
        )}

        <Polygon
          points={points}
          fill={`url(#${gradientId})`}
          stroke={unlocked ? color : Colors.border}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      </Svg>

      <HugeiconsIcon
        icon={achievementIcon(icon)}
        size={size * 0.36}
        color={unlocked ? color : Colors.textTertiary}
        strokeWidth={2}
      />
    </View>
  );
}
