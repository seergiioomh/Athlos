import { FireIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { View } from "react-native";

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

  // El escalón final no tiene un color, tiene cuatro: se reparten por los
  // lados del anillo, que es la versión plana de su degradado.
  const gradientBorder = tier.gradient
    ? {
        borderTopColor: tier.gradient[0],
        borderRightColor: tier.gradient[1],
        borderBottomColor: tier.gradient[2] ?? tier.gradient[0],
        borderLeftColor: tier.gradient[3] ?? tier.gradient[1],
      }
    : { borderColor: tier.flame };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        alignItems: "center",
        justifyContent: "center",
        opacity: locked ? 0.45 : 1,
        shadowColor: tier.glow,
        shadowOpacity: locked ? 0 : tier.glowOpacity,
        shadowRadius: size * 0.16,
        shadowOffset: { width: 0, height: 0 },
        ...gradientBorder,
      }}
    >
      <HugeiconsIcon
        icon={FireIcon}
        size={size * 0.46}
        color={tier.flame}
        strokeWidth={2}
      />
    </View>
  );
}
