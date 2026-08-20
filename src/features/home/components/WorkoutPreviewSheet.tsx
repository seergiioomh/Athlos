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
import { PlanExerciseList } from "./PlanExerciseList";

interface Props {
  plan: WorkoutPlan | null;
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

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

          {/* Aquí iba el botón de compartir. Retirado mientras el enlace no
              funcione de verdad: el esquema `athlos://` no lo convierte en
              enlace tocable WhatsApp, así que llega como texto plano y quien
              lo recibe no puede hacer nada con él. Lo de detrás sigue en pie
              —`share.ts`, `shared-workout` y `importSharedWorkout`— para que
              los enlaces ya repartidos se sigan abriendo y volver a
              enseñarlo sea deshacer este hueco. */}
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
          <PlanExerciseList exercises={plan.exercises} />
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
