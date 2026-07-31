import { FireIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { streakTier } from "@/features/progress/streak-tiers";

interface Props {
  streak: number;
  /** `card` ocupa el ancho disponible para convivir con otras tarjetas. */
  size?: "small" | "large" | "card";
  /** Nombre del escalón bajo el número. Solo tiene sitio en los tamaños grandes. */
  showName?: boolean;
  onPress?: () => void;
}

export function StreakBadge({
  streak,
  size = "small",
  showName = false,
  onPress,
}: Props) {
  const tier = streakTier(streak);
  const large = size !== "small";
  const card = size === "card";
  const radius = large ? 18 : 14;

  // Pressable solo cuando hay a dónde ir: un contenedor pulsable que no hace
  // nada se traga los toques y confunde.
  const Container = onPress ? Pressable : View;

  return (
    // El halo va en una vista aparte de la que recorta: en iOS, `overflow`
    // oculto en la misma capa que la sombra se la come.
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={{
        borderRadius: radius,
        // En variante tarjeta el halo iría por fuera de la fila y la
        // descuadraría, así que crece hacia dentro.
        flex: card ? 1 : undefined,
        shadowColor: tier.glow,
        shadowOpacity: tier.glowOpacity,
        shadowRadius: large ? 18 : 10,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View
        style={[
          card ? styles.card : large ? styles.large : styles.small,
          {
            borderRadius: radius,
            backgroundColor: tier.background,
            borderColor: tier.border,
          },
        ]}
        accessibilityLabel={`Racha de ${streak} entrenamientos, escalón ${tier.name}`}
      >
        {tier.gradient && (
          <LinearGradient
            colors={tier.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={styles.line}>
          <HugeiconsIcon
            icon={FireIcon}
            size={large ? 22 : 14}
            color={tier.flame}
            strokeWidth={2}
          />

          <Text
            style={[
              large ? styles.numberLarge : styles.number,
              { color: tier.text },
            ]}
          >
            {streak}
          </Text>
        </View>

        {large && showName && (
          <Text style={[styles.name, { color: tier.text }]}>
            {tier.name.toUpperCase()}
          </Text>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center" },

  small: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 0,
    // Recorta el degradado a las esquinas redondeadas.
    overflow: "hidden",
  },

  large: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    overflow: "hidden",
  },

  card: {
    // Rellena la capa exterior, que ya se estira a la altura de la fila.
    // Sin esto se queda con la altura de su contenido y desalinea el grupo.
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  number: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  numberLarge: {
    marginLeft: 7,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },

  name: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    opacity: 0.9,
  },
});
