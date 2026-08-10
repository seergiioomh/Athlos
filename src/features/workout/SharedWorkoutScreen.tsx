import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { ActiveWorkout } from "./ActiveWorkout";
import { useImportSharedWorkout } from "./queries";
import type { SharedWorkout } from "./share";
import type { WorkoutPlan } from "./types";

interface Props {
  shared: SharedWorkout | null;
}

const formatWeight = (kg: number) =>
  kg === 0 ? "Peso corporal" : `${String(kg).replace(".", ",")} kg`;

/**
 * Un entrenamiento que llegó por enlace: se enseña antes de guardarlo.
 *
 * Nada toca la base hasta que el usuario acepta. El enlace lo trae todo, así
 * que la vista previa se pinta sin consultar nada: si decide que no, no queda
 * rastro que limpiar.
 */
export function SharedWorkoutScreen({ shared }: Props) {
  const router = useRouter();
  const importWorkout = useImportSharedWorkout();

  /** El plan ya guardado. A partir de aquí es un entrenamiento normal. */
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  const salir = () => router.replace("/(tabs)");

  if (plan) {
    return (
      <ActiveWorkout plan={plan} onBack={salir} onFinish={salir} />
    );
  }

  if (!shared) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.centered}>
          <Text style={styles.title}>Este enlace no vale</Text>
          <Text style={styles.body}>
            Puede que esté incompleto o que se haya cortado al enviarlo. Pídele
            a tu amigo que te lo pase otra vez.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={salir}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {shared.sharedBy
            ? `ENTRENAMIENTO DE ${shared.sharedBy.toUpperCase()}`
            : "ENTRENAMIENTO COMPARTIDO"}
        </Text>

        <Text style={styles.title}>{shared.title}</Text>
        {shared.focus ? (
          <Text style={styles.focus}>{shared.focus}</Text>
        ) : null}

        <Text style={styles.note}>
          Lo haces y se guarda como cualquier otro, pero no cuenta para tu
          ciclo: el tuyo sigue donde lo dejaste.
        </Text>

        <View style={styles.list}>
          {shared.exercises.map((exercise, index) => (
            <View key={`${exercise.slug}-${index}`} style={styles.exercise}>
              <View style={styles.position}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>

              <View style={styles.details}>
                {/* Del slug, no del nombre: el enlace no trae el nombre para
                    no alargarlo, y resolverlo contra el catálogo exigiría una
                    consulta antes de que el usuario haya aceptado nada. */}
                <Text style={styles.name}>
                  {exercise.slug.replace(/-/g, " ")}
                </Text>

                <View style={styles.metrics}>
                  <Text style={styles.metric}>
                    {exercise.sets} × {exercise.targetReps}
                  </Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.metric}>
                    {formatWeight(exercise.targetWeightKg)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {importWorkout.error && (
          <Text style={styles.error}>
            {errorMessage(importWorkout.error)}
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={importWorkout.isPending}
          onPress={() =>
            importWorkout.mutate(shared, { onSuccess: setPlan })
          }
          style={[
            styles.primary,
            importWorkout.isPending && styles.primaryBusy,
          ]}
        >
          {importWorkout.isPending ? (
            <ActivityIndicator color={HomeColors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Hacer este entrenamiento</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={salir}
          disabled={importWorkout.isPending}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Ahora no</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },

  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 },

  centered: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: HomeColors.primary,
  },

  title: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: HomeColors.text,
  },

  focus: { marginTop: 4, fontSize: 15, color: HomeColors.textSecondary },

  note: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: HomeColors.primarySoft,
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.primary,
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },

  list: { marginTop: 20, gap: 10 },

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

  positionText: { fontSize: 13, fontWeight: "700", color: HomeColors.primary },

  details: { flex: 1 },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: HomeColors.text,
    textTransform: "capitalize",
  },

  metrics: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metric: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  separator: { fontSize: 13, color: HomeColors.textSecondary },

  error: { marginTop: 16, fontSize: 13, color: HomeColors.errorText },

  primary: {
    marginTop: 24,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  primaryBusy: { backgroundColor: HomeColors.primaryMuted },

  primaryText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },

  secondary: { marginTop: 14, height: 46, alignItems: "center", justifyContent: "center" },

  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },
});
