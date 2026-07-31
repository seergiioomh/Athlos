import { ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AthlosButton } from "@/components/ui/AthlosButton";
import { Icon } from "@/components/ui/Icon";
import { MuscleMap } from "@/components/ui/MuscleMap";
import type { WorkoutPlan } from "@/features/workout/types";
import { HomeColors } from "../home-theme";
import { WorkoutPreviewSheet } from "./WorkoutPreviewSheet";

type Props = {
  onPress: () => void;
  plan: WorkoutPlan | null;
};

/**
 * Duración aproximada: el descanso entre series más el tiempo de ejecución.
 * 40 s por serie es una media razonable y evita tener que cronometrar nada.
 */
const SECONDS_PER_SET = 40;

const estimateMinutes = (plan: WorkoutPlan) => {
  const seconds = plan.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets * (SECONDS_PER_SET + exercise.restSeconds),
    0
  );

  return Math.round(seconds / 60);
};

export function TodayWorkoutCard({ onPress, plan }: Props) {
  const [previewing, setPreviewing] = useState(false);

  if (!plan) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Tu entrenamiento</Text>
        <Text style={styles.title}>Sin preparar</Text>
        <Text style={styles.description}>
          El coach diseñará el siguiente cuando se lo pidas.
        </Text>

        <AthlosButton title="Preparar entrenamiento" onPress={onPress} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.label}>Tu entrenamiento</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPreviewing(true)}
          hitSlop={8}
          style={styles.preview}
          accessibilityLabel="Ver el entrenamiento antes de empezar"
        >
          <HugeiconsIcon
            icon={ViewIcon}
            size={14}
            color={HomeColors.primary}
            strokeWidth={2}
          />
          <Text style={styles.previewText}>Ver</Text>
        </TouchableOpacity>
      </View>

      {/* Texto y figura comparten fila: la ilustración cuenta de un vistazo
          qué se trabaja hoy, sin tener que leer el foco. */}
      {/* Solo el título: el foco venía a decir lo mismo con otras palabras, y
          además la figura ya cuenta qué grupos se trabajan. El detalle está
          en "Ver". */}
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={styles.title}>{plan.title}</Text>
        </View>

        <MuscleMap exercises={plan.exercises} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}><Icon name="clock" size={18} color={HomeColors.textSecondary} /><Text style={styles.info}>{estimateMinutes(plan)} min</Text></View>
        <View style={styles.infoItem}><Icon name="dumbbell" size={18} color={HomeColors.textSecondary} /><Text style={styles.info}>{plan.exercises.length} ejercicios</Text></View>
      </View>

      <AthlosButton title="Empezar entrenamiento" onPress={onPress} />

      <WorkoutPreviewSheet
        plan={plan}
        visible={previewing}
        onClose={() => setPreviewing(false)}
        onStart={() => {
          setPreviewing(false);
          onPress();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 30, backgroundColor: HomeColors.surface, borderRadius: 28, padding: 24 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 17, color: HomeColors.textSecondary },
  preview: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: HomeColors.primarySoft },
  previewText: { fontSize: 12, fontWeight: "700", color: HomeColors.primary },
  // Sin separación: el marco de la figura ya trae su propio aire por dentro,
  // y sumarle un hueco solo le robaba ancho al título.
  body: { flexDirection: "row", alignItems: "center" },
  copy: { flex: 1 },
  title: { fontSize: 26, fontWeight: "600", color: HomeColors.text, marginTop: 8 },
  description: { marginTop: 8, fontSize: 16, color: HomeColors.textSecondary },
  infoRow: { flexDirection: "row", marginTop: 8, gap: 20 },
  info: { fontSize: 15, color: HomeColors.textSecondary },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
});
