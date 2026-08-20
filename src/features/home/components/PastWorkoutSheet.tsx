import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { CompletedWorkoutExercise } from "@/services/home";
import { HomeColors } from "../home-theme";

interface Props {
  workout: CompletedWorkoutExercise[] | null;
  date: Date | null;
  loading: boolean;
  visible: boolean;
  onClose: () => void;
  accentColor?: string;
  accentSoftColor?: string;
}

const formatDate = (date: Date) =>
  date
    .toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    // "miércoles" -> "Miércoles": es un título, no mitad de frase.
    .replace(/^./, (letter) => letter.toUpperCase());

/**
 * Qué se entrenó un día concreto, al tocarlo en "Esta semana".
 *
 * Hermana de `WorkoutPreviewSheet`, no la misma hoja: aquella invita a
 * empezar un plan por hacer, y esta repasa uno ya hecho. Confundirlas
 * significaría enseñar "Empezar entrenamiento" sobre un día de hace tres
 * semanas.
 */
export function PastWorkoutSheet({
  workout,
  date,
  loading,
  visible,
  onClose,
  accentColor = HomeColors.primary,
  accentSoftColor = HomeColors.primarySoft,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            {date && (
              <Text style={[styles.date, { color: accentColor }]}>
                {formatDate(date)}
              </Text>
            )}
            <Text style={styles.title}>Entrenamiento realizado</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Cerrar"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={18}
              color={HomeColors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Text style={styles.empty}>Cargando…</Text>
          ) : workout?.length ? (
            <CompletedExerciseList
              exercises={workout}
              accentColor={accentColor}
              accentSoftColor={accentSoftColor}
            />
          ) : (
            <Text style={styles.empty}>
              No hay series registradas para este entrenamiento.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function CompletedExerciseList({
  exercises,
  accentColor,
  accentSoftColor,
}: {
  exercises: CompletedWorkoutExercise[];
  accentColor: string;
  accentSoftColor: string;
}) {
  return exercises.map((exercise, index) => (
    <View key={exercise.exerciseId} style={styles.exercise}>
      <View style={[styles.position, { backgroundColor: accentSoftColor }]}>
        <Text style={[styles.positionText, { color: accentColor }]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.exerciseDetails}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.muscle}>{exercise.muscleGroup}</Text>
        <View style={styles.sets}>
          {exercise.sets
            .sort((a, b) => a.number - b.number)
            .map((set) => (
              <Text key={set.number} style={styles.set}>
                {set.number}. {String(set.weightKg).replace(".", ",")} kg × {set.reps}
              </Text>
            ))}
        </View>
      </View>
    </View>
  ));
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheet: {
    marginTop: "auto",
    maxHeight: "85%",
    backgroundColor: HomeColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: HomeColors.border,
  },

  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
  },

  header: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  headerText: { flex: 1 },

  date: {
    fontSize: 13,
    fontWeight: "700",
    color: HomeColors.primary,
    textTransform: "capitalize",
  },

  title: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: HomeColors.text,
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { marginTop: 14 },
  listContent: { gap: 10, paddingBottom: 8 },

  empty: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    color: HomeColors.textSecondary,
  },
  exercise: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, backgroundColor: HomeColors.surface },
  position: { width: 26, height: 26, borderRadius: 9, backgroundColor: HomeColors.primarySoft, alignItems: "center", justifyContent: "center" },
  positionText: { fontSize: 13, fontWeight: "700", color: HomeColors.primary },
  exerciseDetails: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: "700", color: HomeColors.text },
  muscle: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },
  sets: { marginTop: 9, gap: 4 },
  set: { fontSize: 13, fontWeight: "600", color: HomeColors.text, fontVariant: ["tabular-nums"] },
});
