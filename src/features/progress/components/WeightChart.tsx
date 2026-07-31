import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { HomeColors } from "@/features/home/home-theme";
import type { WeightPoint } from "@/services/home";
import { smoothPath } from "@/utils/chart";

interface Props {
  history: WeightPoint[];
}

// Lienzo en coordenadas propias: el SVG se estira al ancho disponible, así
// que estos números son proporciones, no píxeles.
const WIDTH = 300;
const HEIGHT = 140;
// Márgenes iguales arriba y abajo: así las etiquetas de la izquierda, que
// se reparten con `space-between`, caen justo sobre las líneas de rejilla.
const TOP = 14;
const BOTTOM = HEIGHT - TOP;
const LEFT = 8;
const RIGHT = WIDTH - 8;

const PLOT_HEIGHT = 160;
const TOOLTIP_WIDTH = 78;
const GRID_LINES = 4;

const formatDay = (iso: string) =>
  `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

const formatKg = (value: number) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function WeightChart({ history }: Props) {
  const [plotWidth, setPlotWidth] = useState(0);
  // Null mientras nadie toca: la burbuja es respuesta a un gesto, no
  // decoración permanente.
  const [selected, setSelected] = useState<number | null>(null);

  // Al cambiar de rango cambia el número de puntos: sin esto el índice
  // seleccionado podría quedar apuntando fuera de la serie.
  useEffect(() => {
    setSelected(null);
  }, [history.length]);

  const values = history.map((point) => point.weightKg);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.25 || 0.5;
  const low = min - padding;
  const high = max + padding;
  const range = high - low;

  const xOf = (index: number) =>
    history.length > 1
      ? LEFT + (index / (history.length - 1)) * (RIGHT - LEFT)
      : WIDTH / 2;

  const points = history.map((point, index) => {
    const y = BOTTOM - ((point.weightKg - low) / range) * (BOTTOM - TOP);
    return [xOf(index), y] as const;
  });

  const line = smoothPath(points);
  const area = `${line} L${points[points.length - 1][0]} ${BOTTOM} L${points[0][0]} ${BOTTOM} Z`;

  const current = selected !== null ? points[selected] : null;
  const point = selected !== null ? history[selected] : null;

  // Del sistema del SVG a píxeles reales, para colocar la burbuja encima.
  const toPixels = (x: number) => (x / WIDTH) * plotWidth;

  const scale = Array.from(
    { length: GRID_LINES },
    (_, index) => high - (index / (GRID_LINES - 1)) * range
  );

  // Como mucho cinco fechas abajo: con treinta registros no caben todas.
  const ticks = Array.from(
    new Set(
      Array.from({ length: Math.min(history.length, 5) }, (_, index) =>
        history.length === 1
          ? 0
          : Math.round(
              (index / (Math.min(history.length, 5) - 1 || 1)) *
                (history.length - 1)
            )
      )
    )
  );

  const selectFromTouch = (locationX: number) => {
    if (plotWidth === 0 || history.length < 2) return;

    const ratio = clamp(locationX / plotWidth, 0, 1);
    setSelected(Math.round(ratio * (history.length - 1)));
  };

  return (
    <View style={styles.row}>
      <View style={styles.scale}>
        {scale.map((value, index) => (
          <Text key={index} style={styles.scaleLabel}>
            {formatKg(value)}
          </Text>
        ))}
      </View>

      <View style={styles.plot}>
        <View
          onLayout={(event: LayoutChangeEvent) =>
            setPlotWidth(event.nativeEvent.layout.width)
          }
          // Arrastrar recorre la serie, no solo tocar: es la forma natural
          // de recorrer una gráfica con el dedo.
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // La gráfica va dentro de un scroll: si el gesto resulta ser un
          // desplazamiento vertical, le cedemos el turno en vez de secuestrarlo.
          onResponderTerminationRequest={() => true}
          onResponderGrant={(event) =>
            selectFromTouch(event.nativeEvent.locationX)
          }
          onResponderMove={(event) =>
            selectFromTouch(event.nativeEvent.locationX)
          }
          // Al soltar, la gráfica vuelve a estar limpia.
          onResponderRelease={() => setSelected(null)}
          onResponderTerminate={() => setSelected(null)}
        >
          <Svg
            width="100%"
            height={PLOT_HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={HomeColors.primary}
                  stopOpacity="0.3"
                />
                <Stop
                  offset="1"
                  stopColor={HomeColors.primary}
                  stopOpacity="0"
                />
              </LinearGradient>
            </Defs>

            {scale.map((_, index) => {
              const y = TOP + (index / (GRID_LINES - 1)) * (BOTTOM - TOP);

              return (
                <Line
                  key={index}
                  x1="0"
                  y1={y}
                  x2={WIDTH}
                  y2={y}
                  stroke={HomeColors.chartGrid}
                  strokeWidth="1"
                />
              );
            })}

            {history.length > 1 && <Path d={area} fill="url(#areaFill)" />}

            {/* Guía vertical, solo mientras se toca */}
            {current && (
              <Line
                x1={current[0]}
                y1={TOP}
                x2={current[0]}
                y2={BOTTOM}
                stroke={HomeColors.primary}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            )}

            <Path
              d={line}
              fill="none"
              stroke={HomeColors.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {points.map(([cx, cy], index) => (
              <Circle
                key={index}
                cx={cx}
                cy={cy}
                r={index === selected ? "3" : "2.4"}
                // Siempre rellenos; el pulsado se distingue por el aro
                // blanco, no por el hueco.
                fill={HomeColors.primary}
                stroke={index === selected ? "#FFFFFF" : "transparent"}
                strokeWidth={index === selected ? "2" : "0"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </Svg>

          {/* La burbuja va en una vista normal y no dentro del SVG: así el
              texto no se deforma con el estirado del lienzo. */}
          {plotWidth > 0 && current && point && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  left: clamp(
                    toPixels(current[0]) - TOOLTIP_WIDTH / 2,
                    0,
                    Math.max(plotWidth - TOOLTIP_WIDTH, 0)
                  ),
                  top: clamp(
                    (current[1] / HEIGHT) * PLOT_HEIGHT - 42,
                    0,
                    PLOT_HEIGHT - 34
                  ),
                },
              ]}
            >
              <Text style={styles.tooltipValue}>
                {formatKg(point.weightKg)} kg
              </Text>
              <Text style={styles.tooltipDate}>
                {formatDay(point.measuredOn)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.axis}>
          {ticks.map((index) => (
            <Text key={index} style={styles.axisLabel}>
              {formatDay(history[index].measuredOn)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },

  scale: {
    // El margen de 10 sitúa el centro de cada etiqueta sobre su línea.
    height: PLOT_HEIGHT,
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  scaleLabel: {
    fontSize: 10,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  plot: { flex: 1 },

  tooltip: {
    position: "absolute",
    width: TOOLTIP_WIDTH,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: HomeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  tooltipValue: {
    fontSize: 13,
    fontWeight: "700",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  tooltipDate: {
    fontSize: 10,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  axis: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  axisLabel: {
    fontSize: 11,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
});
