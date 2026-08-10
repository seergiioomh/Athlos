import { Cancel01Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useProfile } from "@/features/onboarding/queries";
import { encodeWorkout } from "@/features/workout/share";
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
  const { data: profile } = useProfile();

  if (!plan) return null;

  /**
   * Comparte el entrenamiento entero dentro del enlace.
   *
   * Se usa el menú del sistema, así que desde el móvil da igual si acaba
   * yendo por WhatsApp, por Mensajes o por AirDrop: eso lo elige quien
   * comparte, y a la app no le afecta.
   */
  const share = async () => {
    const link = encodeWorkout(plan, profile?.display_name ?? "");
    const intro = `Te paso mi entrenamiento de hoy: ${plan.title}`;

    try {
      await Share.share(
        // En iOS, `url` viaja como un elemento propio del selector nativo,
        // separado de `message`: es lo que hace que WhatsApp lo reconozca
        // como un enlace tocable en vez de una URL suelta dentro del texto.
        // En Android ese campo se ignora del todo, así que ahí el enlace
        // tiene que ir metido en el propio mensaje.
        Platform.OS === "ios"
          ? { message: intro, url: link }
          : { message: `${intro}\n\n${link}` }
      );
    } catch {
      // Cancelar el menú de compartir lanza en iOS. No es un error que
      // merezca contarle nada al usuario.
    }
  };

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

          {/* Compartir va aquí y no abajo: la acción principal de esta hoja
              es empezar, y un segundo botón grande competiría con ella. */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={share}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Compartir este entrenamiento"
          >
            <HugeiconsIcon
              icon={Share01Icon}
              size={18}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </TouchableOpacity>

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
