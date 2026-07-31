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
 * Selector de una sola opción. Con pocas opciones se lee entero de un
 * vistazo, que es lo que no consigue un desplegable.
 */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.85}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  chipSelected: {
    backgroundColor: HomeColors.primarySoft,
    borderColor: HomeColors.primary,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  labelSelected: {
    color: HomeColors.primary,
  },
});
