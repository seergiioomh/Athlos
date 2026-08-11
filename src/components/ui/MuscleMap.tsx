import { StyleSheet, View } from "react-native";
import Body from "react-native-body-highlighter";

import {
  bestSideFor,
  bodyPartsFor,
  regionFor,
  type BodyRegion,
} from "@/features/workout/muscle-map";
import type { SuggestedExercise } from "@/features/workout/types";
import { Colors } from "@/theme/colors";

interface Props {
  exercises: Pick<SuggestedExercise, "muscleGroup">[];
  /** Alto de la ilustración. El ancho sale de `FRAME_RATIO`. */
  size?: number;
}

// La figura se dibuja siempre en 200 × 400 unidades y `scale` la multiplica.
const BODY_WIDTH = 200;
const BODY_HEIGHT = 400;

/**
 * Qué franja vertical del cuerpo ocupa cada región, en fracción de la altura
 * total. Recortar permite ampliar: en el mismo hueco, un torso solo se ve al
 * doble de tamaño que el cuerpo entero.
 */
const REGIONS: Record<BodyRegion, { start: number; end: number }> = {
  torso: { start: 0.04, end: 0.58 },
  legs: { start: 0.48, end: 1 },
  full: { start: 0, end: 1 },
};

// --------------------------------------------------------------- encuadre
// Estos cuatro números son el encuadre de la figura dentro de su hueco. Se
// ajustan a ojo, así que van juntos y con nombre.

/** Cuánto se amplía respecto a lo que cabría justo. Mayor que 1 = más grande. */
const ZOOM = 1.3;
/** Desplazamiento horizontal, en fracción del hueco. Positivo = a la derecha. */
const OFFSET_X = 0;
/** Desplazamiento vertical. Positivo = hacia abajo. */
const OFFSET_Y = 0.12;
/**
 * Ancho del marco respecto al alto. Menor que 1 porque un cuerpo es más alto
 * que ancho: con el marco cuadrado sobraba aire a los lados y ese aire se lo
 * quitaba al texto de la tarjeta.
 */
const FRAME_RATIO = 0.72;

export function MuscleMap({ exercises, size = 142 }: Props) {
  const parts = bodyPartsFor(exercises);

  if (parts.length === 0) return null;

  const side = bestSideFor(exercises);
  const bounds = REGIONS[regionFor(parts)];

  // La figura se agranda hasta que la franja elegida llena el hueco (por
  // ZOOM, para que rebose un poco) y se desplaza para dejarla a la vista.
  const bodyHeight = (size / (bounds.end - bounds.start)) * ZOOM;
  const scale = bodyHeight / BODY_HEIGHT;
  const bodyWidth = BODY_WIDTH * scale;
  const frameWidth = size * FRAME_RATIO;

  return (
    <View
      style={[styles.frame, { width: frameWidth, height: size }]}
      pointerEvents="none"
    >
      <View
        style={{
          position: "absolute",
          top: -bounds.start * bodyHeight + size * OFFSET_Y,
          left: (frameWidth - bodyWidth) / 2 + frameWidth * OFFSET_X,
        }}
      >
        <Body
          data={parts.map((part) => ({
            slug: part.slug,
            // Principal en el lima de la marca, secundario en morado: de un
            // vistazo se ve qué es el eje del día y qué se lleva de paso.
            color: part.role === "primary" ? Colors.primary : Colors.purple,
          }))}
          side={side}
          gender="male"
          scale={scale}
          // Lo que no se trabaja queda como silueta, no invisible: hace falta
          // ver el cuerpo para entender qué parte está encendida.
          defaultFill={Colors.surfaceElevated}
          border={Colors.border}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Recorta lo que sobresale de la franja elegida.
  frame: { overflow: "hidden" },
});
