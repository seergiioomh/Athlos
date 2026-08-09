import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T> {
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

/**
 * Selector de un solo valor, en barra continua.
 *
 * Se diferencia de `ChipGroup` en algo más que el aspecto: los tramos reparten
 * el ancho a partes iguales dentro de un mismo carril, así que se leen como
 * posiciones de una misma escala. Para rangos de tiempo —7 días, 30 días, 3
 * meses, 1 año— eso dice más que cuatro píldoras sueltas, que se leen como
 * cuatro opciones sin relación entre sí.
 *
 * `ChipGroup` sigue siendo lo correcto cuando las opciones no forman una
 * progresión: sexo, objetivo, material.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.85}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  segment: {
    // Mismo ancho para todos aunque "3 meses" ocupe menos que "30 días": si
    // cada tramo midiera lo que su texto, el carril bailaría al cambiar de
    // idioma o de etiqueta.
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentSelected: {
    backgroundColor: HomeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: HomeColors.primary,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  labelSelected: {
    fontWeight: "700",
    color: HomeColors.primary,
  },
});
