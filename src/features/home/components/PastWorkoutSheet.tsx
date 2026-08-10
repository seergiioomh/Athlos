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

import { MuscleMap } from "@/components/ui/MuscleMap";
import type { WorkoutPlan } from "@/features/workout/types";
import { HomeColors } from "../home-theme";
import { PlanExerciseList } from "./PlanExerciseList";

interface Props {
  plan: WorkoutPlan | null;
  date: Date | null;
  loading: boolean;
  visible: boolean;
  onClose: () => void;
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
  plan,
  date,
  loading,
  visible,
  onClose,
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
            {date && <Text style={styles.date}>{formatDate(date)}</Text>}
            {plan && <Text style={styles.title}>{plan.title}</Text>}
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

        {plan && (
          <View style={styles.mapRow}>
            <MuscleMap exercises={plan.exercises} size={120} />
          </View>
        )}

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Text style={styles.empty}>Cargando…</Text>
          ) : plan ? (
            <PlanExerciseList exercises={plan.exercises} />
          ) : (
            <Text style={styles.empty}>
              No se pudo recuperar ese entrenamiento.
            </Text>
          )}
        </ScrollView>
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

  mapRow: { alignItems: "center", marginTop: 6 },

  list: { marginTop: 14 },
  listContent: { gap: 10, paddingBottom: 8 },

  empty: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14,
    color: HomeColors.textSecondary,
  },
});
