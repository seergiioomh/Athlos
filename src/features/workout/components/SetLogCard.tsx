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
 * La serie en curso —la primera sin marcar— va destacada y las siguientes
 * atenuadas: dice por dónde vas sin tener que leer un contador.
 */
export function SetLogCard({ exercise, sets, onChange, onToggle }: Props) {
  const actual = sets.find((set) => !set.done)?.number;

  return (
    <View style={styles.list}>
      {sets.map((set) => {
        const esActual = set.number === actual;
        // Pendiente y no es la de ahora: se aparta sin desaparecer.
        const porVenir = !set.done && !esActual;

        return (
          <View
            key={set.number}
            style={[
              styles.row,
              esActual && styles.rowCurrent,
              porVenir && styles.rowPending,
            ]}
          >
            <Text style={[styles.number, esActual && styles.numberCurrent]}>
              {set.number}
            </Text>

            <View style={styles.field}>
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
              <Text style={styles.unit}>kg</Text>
            </View>

            <View style={styles.field}>
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
              <Text style={styles.unit}>reps</Text>
            </View>

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

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },

  rowCurrent: {
    backgroundColor: HomeColors.primarySoft,
    borderColor: "rgba(198,244,50,0.3)",
  },

  rowPending: { opacity: 0.55 },

  number: {
    width: 20,
    fontSize: 14,
    fontWeight: "700",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  numberCurrent: { color: HomeColors.primary },

  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
    backgroundColor: HomeColors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },

  input: {
    minWidth: 34,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
    padding: 0,
  },

  unit: { fontSize: 11, color: HomeColors.textSecondary },

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
