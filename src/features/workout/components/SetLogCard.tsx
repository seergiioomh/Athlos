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

export function SetLogCard({
  exercise,
  sets,
  onChange,
  onToggle,
}: Props) {
  const doneCount = sets.filter((set) => set.done).length;

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>Tus series</Text>
        <Text style={styles.counter}>
          {doneCount}/{sets.length} completadas
        </Text>
      </View>

      <View style={styles.columns}>
        <Text style={[styles.column, styles.numberColumn]}>#</Text>
        <Text style={[styles.column, styles.targetColumn]}>
          Objetivo
        </Text>
        <Text style={[styles.column, styles.inputColumn]}>Kg</Text>
        <Text style={[styles.column, styles.inputColumn]}>Reps</Text>
        <View style={styles.checkColumn} />
      </View>

      {sets.map((set) => (
        <View key={set.number} style={styles.row}>
          <Text style={[styles.column, styles.numberColumn, styles.number]}>
            {set.number}
          </Text>

          <Text style={[styles.column, styles.targetColumn, styles.target]}>
            {exercise.targetWeightKg === 0
              ? `× ${exercise.targetReps}`
              : `${exercise.targetWeightKg} × ${exercise.targetReps}`}
          </Text>

          <TextInput
            style={[styles.input, styles.inputColumn]}
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
            style={[styles.input, styles.inputColumn]}
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
            <HugeiconsIcon
              icon={CheckIcon}
              size={16}
              strokeWidth={2.6}
              color={set.done ? "#0B2E16" : HomeColors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.hint}>
        Si cierras una serie sin escribir nada, guardamos el objetivo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: HomeColors.text,
  },

  counter: {
    fontSize: 12,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  columns: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  column: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },

  numberColumn: { width: 20 },
  targetColumn: { width: 58 },
  inputColumn: { flex: 1, minWidth: 48 },
  checkColumn: { width: 38 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },

  number: {
    fontSize: 14,
    fontWeight: "700",
    color: HomeColors.text,
  },

  target: {
    fontSize: 12,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: HomeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: HomeColors.border,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: 4,
  },

  check: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surfaceElevated,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  checkDone: {
    backgroundColor: HomeColors.success,
    borderColor: HomeColors.success,
  },

  hint: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 15,
    color: HomeColors.textSecondary,
  },
});
