import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface, LIQUID_GLASS } from "@/components/ui/GlassSurface";
import { TabButton } from "./TabButton";

const BAR_HEIGHT = 72;
const BAR_PADDING = 10;
// Margen a cada lado del hueco de la pestaña. Cuanto menor, más ancha la
// píldora: con 2 queda una cápsula claramente más ancha que alta, que es la
// proporción que usa iOS, en vez del cuadrado redondeado de antes.
const PILL_INSET = 2;
const PILL_HEIGHT = 52;

const SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.9,
};

export default function CustomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [slotWidth, setSlotWidth] = useState(0);

  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const inner =
        event.nativeEvent.layout.width - BAR_PADDING * 2;

      setSlotWidth(
        state.routes.length > 0 ? inner / state.routes.length : 0
      );
    },
    [state.routes.length]
  );

  useEffect(() => {
    if (slotWidth <= 0) return;

    const width = slotWidth - PILL_INSET * 2;
    const x = BAR_PADDING + state.index * slotWidth + PILL_INSET;

    // Primer render: colocamos la píldora sin animar.
    if (pillWidth.value === 0) {
      pillWidth.value = width;
      pillX.value = x;
      return;
    }

    pillWidth.value = withSpring(width, SPRING);
    pillX.value = withSpring(x, SPRING);
  }, [slotWidth, state.index, pillWidth, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    transform: [{ translateX: pillX.value }],
  }));

  const handlePress = (
    route: (typeof state.routes)[number],
    focused: boolean
  ) => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.shadow}>
        <GlassSurface
          variant="bar"
          radius={BAR_HEIGHT / 2}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.row} onLayout={handleLayout}>
          {/* La píldora se monta cuando ya sabemos el ancho del slot: así
              evitamos animar opacidad, que rompe el cristal nativo. */}
          {slotWidth > 0 && (
            <Animated.View
              style={[styles.pill, pillStyle]}
              pointerEvents="none"
            >
              <GlassSurface
                variant="pill"
                radius={PILL_HEIGHT / 2}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          {state.routes.map((route, index) => (
            <TabButton
              key={route.key}
              route={route.name}
              focused={state.index === index}
              onPress={() =>
                handlePress(route, state.index === index)
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 18,
    right: 18,
    alignItems: "center",
  },

  shadow: {
    width: "100%",
    borderRadius: BAR_HEIGHT / 2,

    // Sobre fondo negro una sombra negra no aporta nada; solo la usamos
    // para despegar la barra del contenido que pasa por debajo.
    // Sin `elevation`: en Android, con fondo transparente, dibuja un
    // rectángulo gris en vez de seguir el radio.
    shadowColor: "#000",
    shadowOpacity: LIQUID_GLASS ? 0.2 : 0.35,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  row: {
    flexDirection: "row",
    alignItems: "center",

    height: BAR_HEIGHT,
    paddingHorizontal: BAR_PADDING,
  },

  pill: {
    position: "absolute",
    left: 0,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
  },
});
