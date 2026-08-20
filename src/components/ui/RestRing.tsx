import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Colors } from "@/theme/colors";

interface Props {
  minutosRestantes: number;
  /** Diámetro. El trazo y la marca de visto se escalan con él. */
  size?: number;
}

/**
 * Anillo con la marca de visto: entrenamiento hecho y cuánto queda para el
 * siguiente.
 *
 * El arco mide **el día**, no la espera. La espera empieza cuando cada uno
 * termina —a las 8:00 o a las 21:00—, así que un arco sobre ella no querría
 * decir lo mismo para dos personas; el día sí es igual para todos y no hay que
 * explicarlo. A medianoche está lleno, que es justo cuando se desbloquea.
 *
 * Lo usan la tarjeta de Inicio y la pantalla de Entrenar, que cuentan lo mismo
 * y tienen que enseñarlo igual.
 */
export function RestRing({ minutosRestantes, size = 76 }: Props) {
  const trazo = Math.max(4, Math.round(size * 0.08));
  const radio = (size - trazo) / 2;
  const vuelta = 2 * Math.PI * radio;

  const transcurrido = Math.min(
    1,
    Math.max(0, 1 - minutosRestantes / (24 * 60))
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* El giro va en el estilo de la vista y no en props del nodo `Svg`: en
          el raíz no son de fiar. Como el lienzo es cuadrado, girarlo no mueve
          sus límites, y la marca de visto queda fuera del giro. Sin él el arco
          arrancaría a las tres en punto, porque los ángulos de SVG parten del
          eje X. */}
      <Svg
        width={size}
        height={size}
        style={[StyleSheet.absoluteFill, styles.rotado]}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          stroke={Colors.surfaceHighlight}
          strokeWidth={trazo}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={trazo}
          strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={vuelta * (1 - transcurrido)}
        />
      </Svg>

      <HugeiconsIcon
        icon={Tick02Icon}
        size={size * 0.45}
        color={Colors.primary}
        strokeWidth={2.6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rotado: { transform: [{ rotate: "-90deg" }] },
});
