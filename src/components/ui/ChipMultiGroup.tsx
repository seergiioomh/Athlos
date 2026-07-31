import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T> {
  options: Option<T>[];
  value: T[];
  onChange: (value: T[]) => void;
}

/** Selector de varias opciones. Mismo aspecto que ChipGroup, pero acumula. */
export function ChipMultiGroup<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  const toggle = (option: T) =>
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option]
    );

  return (
    <View style={styles.group}>
      {options.map((option) => {
        const selected = value.includes(option.value);

        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.85}
            onPress={() => toggle(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
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
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

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

  label: { fontSize: 14, fontWeight: "600", color: HomeColors.textSecondary },
  labelSelected: { color: HomeColors.primary },
});
