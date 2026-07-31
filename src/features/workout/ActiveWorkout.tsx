import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { ExerciseTargetCard } from "./components/ExerciseTargetCard";
import { NextExerciseCard } from "./components/NextExerciseCard";
import { RestTimer } from "./components/RestTimer";
import { SetLogCard } from "./components/SetLogCard";
import { WorkoutHeader } from "./components/WorkoutHeader";
import { useQueryClient } from "@tanstack/react-query";

import { DEV_USER_ID } from "@/lib/supabase";
import { useSession, workoutKeys } from "./queries";
import { WorkoutPlan } from "./types";
import { useWorkoutSession } from "./useWorkoutSession";

interface Props {
  plan: WorkoutPlan;
  onBack: () => void;
  onFinish: () => void;
}

export function ActiveWorkout({ plan, onBack, onFinish }: Props) {
  const { data: sessionId } = useSession(plan.id);
  const session = useWorkoutSession(plan, sessionId);
  const queryClient = useQueryClient();

  const finish = async () => {
    const closed = await session.finish();

    // Solo salimos si de verdad quedó cerrado. Si falló, el aviso ya está
    // en pantalla y el entrenamiento sigue donde estaba.
    if (!closed) return;

    // El plan pasa a estar hecho: quien lo tenga cacheado tiene que
    // enterarse, o Home seguiría ofreciendo empezarlo.
    queryClient.invalidateQueries({
      queryKey: workoutKeys.plan(DEV_USER_ID!),
    });

    // Terminar mueve la racha, los totales y la tira de la semana.
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });

    onFinish();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <WorkoutHeader
          title={plan.title}
          focus={plan.focus}
          exerciseIndex={session.exerciseIndex}
          exerciseCount={session.exerciseCount}
          onBack={onBack}
        />

        <ExerciseTargetCard exercise={session.exercise} />

        {session.resting && (
          <RestTimer
            secondsLeft={session.restLeft}
            totalSeconds={session.exercise.restSeconds}
            onAdd={session.addRest}
            onSkip={session.skipRest}
          />
        )}

        <SetLogCard
          exercise={session.exercise}
          sets={session.sets}
          onChange={session.updateSet}
          onToggle={session.toggleSet}
        />

        {session.syncError && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{session.syncError}</Text>
          </View>
        )}

        {session.nextUp ? <NextExerciseCard exercise={session.nextUp} /> : null}

        <View style={styles.actions}>
          {session.exerciseIndex > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={session.previousExercise}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Anterior</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={session.isLastExercise ? finish : session.nextExercise}
            style={[
              styles.primary,
              // Sin series cerradas el botón sigue activo: el usuario
              // puede saltarse un ejercicio, solo lo dejamos apagado.
              !session.allSetsDone && styles.primaryMuted,
            ]}
          >
            <Text style={styles.primaryText}>
              {session.isLastExercise
                ? "Terminar entrenamiento"
                : "Siguiente ejercicio"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    // Hueco para que la tab bar flotante no tape el último botón.
    paddingBottom: 132,
  },

  banner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: HomeColors.errorSoft,
  },

  bannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.errorText,
  },

  actions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },

  secondary: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surface,
  },

  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: HomeColors.text,
  },

  primary: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  primaryMuted: {
    backgroundColor: HomeColors.primaryMuted,
  },

  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: HomeColors.onPrimary,
  },
});
