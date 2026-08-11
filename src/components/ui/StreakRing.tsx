import { FireIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import type { StreakTier } from "@/features/progress/streak-tiers";

interface Props {
  tier: StreakTier;
  size: number;
  /** Apaga el escalón que aún no se ha alcanzado. */
  locked?: boolean;
}

/**
 * La insignia: un anillo del color del escalón con la llama dentro.
 *
 * Sustituye a la píldora con número porque una insignia se reconoce por su
 * forma y su color sin leer nada, que es lo que hace que apetezca coleccionarlas.
 */
export function StreakRing({ tier, size, locked = false }: Props) {
  const stroke = Math.max(3, Math.round(size * 0.07));
  const gradientId = `racha-${tier.from}-${size}`;

  // El escalón final no tiene un color, tiene cuatro: se reparten por los
  // lados del anillo, que es la versión plana de su degradado.
  const gradientBorder = tier.gradient
    ? {}
    : { borderColor: tier.flame };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: tier.gradient ? 0 : stroke,
          alignItems: "center",
          justifyContent: "center",
          opacity: locked ? 0.45 : 1,
          boxShadow:
            locked || tier.glowOpacity < 0.1
              ? undefined
              : `0 0 ${Math.round(size * tier.glowOpacity * 0.38)}px ${tier.glow}`,
          ...gradientBorder,
        }}
      >
        {tier.gradient && (
          <Svg
            width={size}
            height={size}
            style={{ position: "absolute" }}
          >
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={tier.gradient[0]} />
                <Stop offset="35%" stopColor={tier.gradient[1]} />
                <Stop offset="68%" stopColor={tier.gradient[2] ?? tier.gradient[0]} />
                <Stop offset="100%" stopColor={tier.gradient[3] ?? tier.gradient[1]} />
              </LinearGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={(size - stroke) / 2}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={stroke}
            />
          </Svg>
        )}
        <HugeiconsIcon
          icon={FireIcon}
          size={size * 0.46}
          color={tier.flame}
          strokeWidth={2}
        />
      </View>
    </View>
  );
}
