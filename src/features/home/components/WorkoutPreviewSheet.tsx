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

import type { WorkoutPlan } from "@/features/workout/types";
import { HomeColors } from "../home-theme";

interface Props {
  plan: WorkoutPlan | null;
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

const formatWeight = (kg: number) =>
  kg === 0 ? "Peso corporal" : `${String(kg).replace(".", ",")} kg`;

const formatRest = (seconds: number) =>
  seconds >= 60 && seconds % 60 === 0
    ? `${seconds / 60} min`
    : `${seconds} s`;

export function WorkoutPreviewSheet({
  plan,
  visible,
  onClose,
  onStart,
}: Props) {
  if (!plan) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Tocar fuera cierra, que es lo que espera cualquiera con una hoja
          que sube desde abajo. */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.focus}>{plan.focus}</Text>
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
          {plan.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exercise}>
              <View style={styles.position}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={styles.muscle}>{exercise.muscleGroup}</Text>

                <View style={styles.metrics}>
                  <Text style={styles.metric}>
                    {exercise.sets} × {exercise.targetReps}
                  </Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.metric}>
                    {formatWeight(exercise.targetWeightKg)}
                  </Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.metric}>
                    {formatRest(exercise.restSeconds)} descanso
                  </Text>
                </View>

                {exercise.aiNote ? (
                  <Text style={styles.note}>{exercise.aiNote}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onStart}
          style={styles.start}
        >
          <Text style={styles.startText}>Empezar entrenamiento</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheet: {
    marginTop: "auto",
    // Deja ver el fondo por arriba: se entiende que hay una pantalla debajo.
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

  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: HomeColors.text,
  },

  focus: { marginTop: 3, fontSize: 14, color: HomeColors.textSecondary },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  list: { marginTop: 18 },
  listContent: { gap: 10, paddingBottom: 8 },

  exercise: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: HomeColors.surface,
  },

  position: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  positionText: {
    fontSize: 13,
    fontWeight: "700",
    color: HomeColors.primary,
  },

  details: { flex: 1 },

  name: { fontSize: 16, fontWeight: "700", color: HomeColors.text },
  muscle: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  metrics: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  metric: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  separator: { fontSize: 13, color: HomeColors.textSecondary },

  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.primary,
  },

  start: {
    marginTop: 16,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  startText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },
});
