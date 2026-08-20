import { CheckmarkCircle02Icon, Moon02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AthlosButton } from "@/components/ui/AthlosButton";
import { Icon } from "@/components/ui/Icon";
import { MuscleMap } from "@/components/ui/MuscleMap";
import {
  cuentaAtras,
  nombreProximoDia,
  type EstadoDeHoy,
} from "@/features/workout/schedule";
import type { WorkoutPlan } from "@/features/workout/types";
import { HomeColors } from "../home-theme";
import { WorkoutPreviewSheet } from "./WorkoutPreviewSheet";

type Props = {
  onPress: () => void;
  /**
   * Entrenar en un día de descanso. Va aparte de `onPress` porque la decisión
   * tiene que viajar con la navegación: si no, la pantalla de Entrenar vuelve
   * a preguntar lo mismo y son dos toques para una sola respuesta.
   */
  onForzar: () => void;
  plan: WorkoutPlan | null;
  estado: EstadoDeHoy;
  cargando: boolean;
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

export function TodayWorkoutCard({
  onPress,
  onForzar,
  plan,
  estado,
  cargando,
}: Props) {
  const [previewing, setPreviewing] = useState(false);

  // Sin los datos no se afirma nada. Enseñar "toca entrenar" y cambiarlo a
  // "ya entrenaste" medio segundo después es peor que esperar ese medio
  // segundo.
  if (cargando) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Tu entrenamiento</Text>
        <Text style={styles.description}>Un momento…</Text>
      </View>
    );
  }

  if (estado.estado === "hecho") {
    return (
      <View style={styles.card}>
        <View style={styles.heading}>
          <Text style={styles.label}>Tu entrenamiento</Text>

          <View style={styles.chip}>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={14}
              color={HomeColors.primary}
              strokeWidth={2}
            />
            <Text style={styles.chipText}>Hecho</Text>
          </View>
        </View>

        <Text style={styles.title}>Ya has entrenado hoy</Text>
        <Text style={styles.description}>
          Buen trabajo. Lo que has levantado se convierte en músculo mientras
          descansas, así que hoy hemos terminado.
        </Text>

        {/* La cuenta atrás no es un castigo, es una respuesta: quien vuelve a
            Inicio a los diez minutos quiere saber cuándo puede seguir. */}
        <View style={styles.countdown}>
          <Icon name="clock" size={18} color={HomeColors.primary} />
          <Text style={styles.countdownText}>
            Siguiente entrenamiento en {cuentaAtras(estado.minutosRestantes)}
          </Text>
        </View>
      </View>
    );
  }

  if (estado.estado === "descanso") {
    return (
      <View style={styles.card}>
        <View style={styles.heading}>
          <Text style={styles.label}>Tu entrenamiento</Text>

          <View style={styles.chipRest}>
            <HugeiconsIcon
              icon={Moon02Icon}
              size={14}
              color={HomeColors.teal}
              strokeWidth={2}
            />
            <Text style={styles.chipRestText}>Descanso</Text>
          </View>
        </View>

        <Text style={styles.title}>Hoy toca descansar</Text>
        <Text style={styles.description}>
          {estado.proximo
            ? `Según tus días, vuelves ${nombreProximoDia(estado.proximo)}.`
            : "Según los días que elegiste, hoy no entrenas."}
        </Text>

        {/* La puerta se queda abierta a propósito. Los días de entreno son una
            intención, no un contrato: quien se saltó el viernes quiere entrenar
            el sábado, y decirle que no le arruina la semana por respetar un
            dato que escribió él. Un toque de más, y basta. */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onForzar}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Entrenar igualmente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Tu entrenamiento</Text>
        <Text style={styles.title}>Sin preparar</Text>
        <Text style={styles.description}>
          Cuando quieras, te preparo la sesión que toca.
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

  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: HomeColors.primarySoft },
  chipText: { fontSize: 12, fontWeight: "700", color: HomeColors.primary },

  // Turquesa, que en la paleta es el color del descanso.
  chipRest: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: HomeColors.tealSoft },
  chipRestText: { fontSize: 12, fontWeight: "700", color: HomeColors.teal },

  countdown: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: HomeColors.primarySoft },
  countdownText: { flex: 1, fontSize: 15, fontWeight: "600", color: HomeColors.primary },

  // Un enlace, no un botón: la opción existe, pero no compite con nada.
  secondary: { marginTop: 18, height: 46, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 15, fontWeight: "600", color: HomeColors.textSecondary },

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
