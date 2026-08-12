import { CheckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { SetEntry, SuggestedExercise } from "../types";

interface Props {
  exercise: SuggestedExercise;
  sets: SetEntry[];
  onChange: (
    number: number,
    field: "weightKg" | "reps",
    value: string
  ) => void;
  onToggle: (number: number) => void;
}

// El teclado decimal de iOS deja meter varios separadores y el de Android
// permite letras en algunos IME, así que filtramos a mano.
const sanitizeWeight = (value: string) => {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(".", ",");
  const [whole, ...rest] = cleaned.split(",");

  return rest.length > 0 ? `${whole},${rest.join("")}` : whole;
};

const sanitizeReps = (value: string) => value.replace(/[^0-9]/g, "");

/**
 * Las series, una fila por serie.
 *
 * Antes era una tabla de cinco columnas —número, objetivo, kg, reps y check—
 * y en un móvil no cabía: los campos y el botón de completar quedaban por
 * debajo del tamaño con el que se acierta con el dedo. Quitando la columna del
 * objetivo, que ya se dice arriba y es igual para todas, las que quedan
 * respiran.
 *
 * Las unidades van en la cabecera y no en cada fila: repetir "kg" y "reps"
 * cuatro veces le quitaba ancho justo a lo que hay que tocar.
 */
export function SetLogCard({ exercise, sets, onChange, onToggle }: Props) {
  return (
    <View style={styles.list}>
      <View style={styles.columns}>
        <Text style={styles.columnNumber}>#</Text>
        <Text style={styles.columnLabel}>KG</Text>
        <Text style={styles.columnLabel}>REPS</Text>
        <View style={styles.columnCheck} />
      </View>

      {sets.map((set) => {
        return (
          <View key={set.number} style={styles.row}>
            <Text style={styles.number}>{set.number}</Text>

            {/* El `TextInput` ocupa el recuadro entero. Antes iba dentro de una
                caja con la unidad al lado y solo eran tocables sus 34 px: el
                recuadro parecía un campo y no lo era. */}
            <TextInput
              style={styles.input}
              value={set.weightKg}
              onChangeText={(value) =>
                onChange(set.number, "weightKg", sanitizeWeight(value))
              }
              placeholder={String(exercise.targetWeightKg)}
              placeholderTextColor={HomeColors.textTertiary}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={6}
              accessibilityLabel={`Peso de la serie ${set.number}`}
            />

            <TextInput
              style={styles.input}
              value={set.reps}
              onChangeText={(value) =>
                onChange(set.number, "reps", sanitizeReps(value))
              }
              placeholder={String(exercise.targetReps)}
              placeholderTextColor={HomeColors.textTertiary}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={3}
              accessibilityLabel={`Repeticiones de la serie ${set.number}`}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onToggle(set.number)}
              style={[styles.check, set.done && styles.checkDone]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: set.done }}
              accessibilityLabel={`Completar serie ${set.number}`}
            >
              {set.done && (
                <HugeiconsIcon
                  icon={CheckIcon}
                  size={17}
                  color={HomeColors.onPrimary}
                  strokeWidth={3}
                />
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },

  columns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 2,
  },

  columnNumber: { width: 20 },

  columnLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: HomeColors.textTertiary,
  },

  columnCheck: { width: 32 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
  },

  number: {
    width: 20,
    fontSize: 14,
    fontWeight: "700",
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  input: {
    flex: 1,
    height: 42,
    textAlign: "center",
    borderRadius: 12,
    backgroundColor: HomeColors.surfaceElevated,
    fontSize: 16,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  // 32 px es el mínimo con el que se acierta entre serie y serie; antes eran 26.
  check: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: HomeColors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  checkDone: {
    backgroundColor: HomeColors.primary,
    borderColor: HomeColors.primary,
  },
});
