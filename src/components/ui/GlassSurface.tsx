import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

/**
 * Liquid Glass nativo (iOS 26+). En cualquier otro caso caemos al material
 * simulado con expo-blur, que se ve bien en iOS 18-25, Android y web.
 *
 * `isGlassEffectAPIAvailable` protege contra las betas de iOS 26 donde el
 * componente existe pero la API nativa no, que crashea.
 */
export const LIQUID_GLASS =
  isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type Variant = "bar" | "pill";

interface Props {
  variant?: Variant;
  radius: number;
  style?: StyleProp<ViewStyle>;
}

// La app es oscura (fondo #000), así que el material es oscuro siempre.
const FALLBACK = {
  bar: {
    intensity: Platform.OS === "ios" ? 55 : 30,
    tint: Platform.select({
      ios: "systemChromeMaterialDark",
      default: "dark",
    } as const),
    // Sobre negro puro el blur no tiene nada que levantar: este velo es
    // lo que separa la barra del fondo.
    fill: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.10)",
  },
  pill: {
    intensity: Platform.OS === "ios" ? 25 : 20,
    tint: "dark" as const,
    fill: "rgba(255,255,255,0.12)",
    border: "rgba(255,255,255,0.10)",
  },
};

export function GlassSurface({
  variant = "bar",
  radius,
  style,
}: Props) {
  if (LIQUID_GLASS) {
    return (
      <GlassView
        style={[style, { borderRadius: radius }]}
        glassEffectStyle="regular"
        // La píldora se apoya sobre el cristal de la barra: sin un tinte
        // propio las dos capas se funden y deja de leerse.
        tintColor={
          variant === "pill" ? "rgba(255,255,255,0.18)" : undefined
        }
        colorScheme="dark"
      />
    );
  }

  const material = FALLBACK[variant];

  return (
    <View
      style={[
        style,
        {
          borderRadius: radius,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: material.border,
        },
      ]}
    >
      <BlurView
        intensity={material.intensity}
        tint={material.tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: material.fill },
        ]}
      />
    </View>
  );
}
