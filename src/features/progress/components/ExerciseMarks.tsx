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

/**
 * A partir de cuántos días una marca deja de ser tu tope de ahora y pasa a ser
 * un recuerdo. Dos meses: lo bastante como para que ya no represente tu estado
 * actual, sin castigar unas vacaciones o una semana mala.
 */
const DIAS_PARA_VIEJA = 60;

/**
 * Días de calendario, no horas entre dos instantes.
 *
 * Dividir milisegundos entre 86.400.000 cuenta mal lo que la gente llama
 * "ayer": una marca de ayer a las 20:00, mirada hoy a las 9:00, son 13 horas
 * —menos de un día— y saldría como "hoy". Se comparan medianoches locales.
 *
 * `Math.round` y no `floor` porque los cambios de hora dejan días de 23 y de
 * 25 horas, y ahí el truncado se equivoca por uno.
 */
function diasDesde(fecha: string): number {
  const antes = new Date(fecha);
  const hoy = new Date();

  antes.setHours(0, 0, 0, 0);
  hoy.setHours(0, 0, 0, 0);

  return Math.round((hoy.getTime() - antes.getTime()) / 86_400_000);
}

/** "hoy", "hace 3 días", "hace 2 meses". */
function cuando(fecha: string | null): string | null {
  if (!fecha) return null;

  const dias = diasDesde(fecha);

  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;

  const meses = Math.round(dias / 30);

  return meses <= 1 ? "hace un mes" : `hace ${meses} meses`;
}

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
        {active[1].map((exercise) => {
          // El servidor ya devuelve las marcas por fecha, de la más reciente a
          // la más antigua, pero esa fecha no se enseñaba en ninguna parte: el
          // orden parecía arbitrario y una marca de hace cuatro meses se
          // pintaba igual que la de la semana pasada. No son lo mismo — una es
          // tu tope de ahora y la otra un recuerdo—, así que las viejas se
          // atenúan y se distinguen sin leer nada.
          const fecha = cuando(exercise.lastPerformed);
          const vieja =
            exercise.lastPerformed !== null &&
            diasDesde(exercise.lastPerformed) > DIAS_PARA_VIEJA;

          return (
            <View
              key={exercise.exerciseId}
              style={[styles.mark, vieja && styles.markOld]}
            >
              <View style={styles.markText}>
                <Text style={styles.markName}>{exercise.name}</Text>
                <Text style={styles.markSets}>
                  {exercise.totalSets} series{fecha ? ` · ${fecha}` : ""}
                </Text>
              </View>

              <View style={styles.markBest}>
                <Text
                  style={[styles.markWeight, vieja && styles.markWeightOld]}
                >
                  {exercise.bestWeightKg === 0
                    ? "Corporal"
                    : `${kg(exercise.bestWeightKg)} kg`}
                </Text>
                <Text style={styles.markReps}>× {exercise.bestReps} reps</Text>
              </View>
            </View>
          );
        })}
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

  // Atenuada, no escondida: sigue siendo tu mejor marca y tiene que poder
  // leerse. Solo deja de competir por la atención con las recientes.
  markOld: { opacity: 0.55 },

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

  // El rosa es el color de esta pantalla y tira mucho la vista. En una marca
  // vieja se apaga, o la lista entera vuelve a pesar lo mismo por todas partes.
  markWeightOld: { color: HomeColors.textSecondary },

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
