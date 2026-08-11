import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChipGroup } from "@/components/ui/ChipGroup";
import { HomeColors } from "@/features/home/home-theme";
import type { ExerciseProgress } from "@/services/progress";
import { categoryFor, MUSCLE_CATEGORY_ORDER } from "../muscle-categories";

interface Props {
  exercises: ExerciseProgress[];
}

const kg = (value: number) =>
  value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function groupByMuscle(
  exercises: ExerciseProgress[]
): [string, ExerciseProgress[]][] {
  const groups = new Map<string, ExerciseProgress[]>();

  for (const exercise of exercises) {
    const category = categoryFor(exercise.muscleGroup);
    if (!MUSCLE_CATEGORY_ORDER.includes(category)) continue;

    const group = groups.get(category) ?? [];
    group.push(exercise);
    groups.set(category, group);
  }

  return [...groups.entries()].sort(
    ([a], [b]) =>
      MUSCLE_CATEGORY_ORDER.indexOf(a) - MUSCLE_CATEGORY_ORDER.indexOf(b)
  );
}

/**
 * Un botón por grupo muscular en vez de una lista larga: con el catálogo ya
 * amplio, un usuario constante acumula marcas de veinte ejercicios distintos,
 * y desplazarse por todos para encontrar el brazo entre medias no ayuda a
 * nadie. Se elige el grupo y solo se ve ese.
 */
export function ExerciseMarks({ exercises }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const groups = groupByMuscle(exercises);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Cuando registres series aparecerán aquí tus mejores marcas de cada
          ejercicio.
        </Text>
      </View>
    );
  }

  const active = groups.find(([group]) => group === selected) ?? groups[0];

  return (
    <View style={styles.container}>
      <ChipGroup
        options={groups.map(([group]) => ({ value: group, label: group }))}
        value={active[0]}
        onChange={setSelected}
        accent={HomeColors.pink}
      />

      <View style={styles.marks}>
        {active[1].map((exercise) => (
          <View key={exercise.exerciseId} style={styles.mark}>
            <View style={styles.markText}>
              <Text style={styles.markName}>{exercise.name}</Text>
              <Text style={styles.markSets}>{exercise.totalSets} series</Text>
            </View>

            <View style={styles.markBest}>
              <Text style={styles.markWeight}>
                {exercise.bestWeightKg === 0
                  ? "Corporal"
                  : `${kg(exercise.bestWeightKg)} kg`}
              </Text>
              <Text style={styles.markReps}>× {exercise.bestReps} reps</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },

  marks: { gap: 10 },

  mark: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  markText: { flex: 1 },
  markName: { fontSize: 16, fontWeight: "700", color: HomeColors.text },
  markSets: { marginTop: 2, fontSize: 12, color: HomeColors.textSecondary },

  markBest: { alignItems: "flex-end" },

  markWeight: {
    fontSize: 17,
    fontWeight: "800",
    color: HomeColors.pink,
    fontVariant: ["tabular-nums"],
  },

  markReps: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  empty: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },
});
