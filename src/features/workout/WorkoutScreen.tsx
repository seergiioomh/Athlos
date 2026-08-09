import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { WeeklySplitCard } from "@/features/profile/components/WeeklySplitCard";
import { useActiveSplit, useGenerateSplit } from "@/features/profile/queries";
import { errorMessage } from "@/utils/errors";
import { ActiveWorkout } from "./ActiveWorkout";
import { useGeneratePlan, useLatestPlan } from "./queries";

export function WorkoutScreen() {
  const router = useRouter();

  const { data: plan, isPending, error, refetch } = useLatestPlan();
  const generate = useGeneratePlan();

  const { data: split, isPending: splitPending } = useActiveSplit();
  const makeSplit = useGenerateSplit();

  /**
   * Si el usuario ha dado el visto bueno a su reparto.
   *
   * Quien ya tenía uno al entrar no tiene nada que aprobar: se da por bueno.
   * Quien no lo tiene pasa antes por diseñarlo y confirmarlo, porque el reparto
   * decide el foco de todas sus sesiones y empezar a entrenar sin haberlo
   * mirado es empezar por el tejado.
   */
  const [aprobado, setAprobado] = useState<boolean | null>(null);

  useEffect(() => {
    if (splitPending || aprobado !== null) return;
    setAprobado(Boolean(split));
  }, [splitPending, split, aprobado]);

  // Mientras no esté hecho, este es el entrenamiento vigente por muchos días
  // que hayan pasado.
  const pending = plan && !plan.completedAt ? plan : null;

  /** Hay que pasar por la semana antes de tocar el entrenamiento. */
  const faltaReparto = !pending && aprobado === false;

  // Una sola tentativa automática por visita: si la IA falla, insistir sola
  // sería quemar llamadas sin que el usuario se entere.
  const attempted = useRef(false);

  useEffect(() => {
    // Solo se genera solo la primera vez. Después de terminar uno, el
    // siguiente lo pide el usuario: es él quien sabe cuándo vuelve.
    if (isPending || error || plan || attempted.current) return;

    // Y nunca antes de tener un reparto aprobado: la sesión se diseña a partir
    // de él, así que generarla antes sería tirarla a la basura.
    if (aprobado !== true) return;

    attempted.current = true;
    generate.mutate(undefined);
  }, [isPending, error, plan, generate, aprobado]);

  // Entrenar es una pestaña raíz: si se llegó tocando la tab no hay
  // historial que deshacer, así que caemos a Inicio.
  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  const retry = () => {
    generate.reset();
    generate.mutate(undefined);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {isPending ? (
        <Centered>
          <ActivityIndicator color={HomeColors.primary} />
        </Centered>
      ) : error ? (
        <Centered>
          <Text style={styles.title}>No pudimos cargar tu entrenamiento</Text>
          <Text style={styles.body}>{message(error)}</Text>
          <Action label="Reintentar" onPress={() => refetch()} />
        </Centered>
      ) : faltaReparto ? (
        <ScrollView contentContainerStyle={styles.splitStep}>
          <Text style={styles.title}>Primero, tu semana</Text>
          <Text style={styles.body}>
            El reparto decide qué te toca cada día, y cada entrenamiento sale
            de él. Míralo antes de empezar: si no te encaja, lo cambiamos.
          </Text>

          <WeeklySplitCard
            split={split ?? null}
            generating={makeSplit.isPending}
            error={makeSplit.error ? message(makeSplit.error) : undefined}
            onGenerate={() => makeSplit.mutate()}
            onTalkToCoach={() => router.push("/(tabs)/coach")}
          />

          {split && (
            <>
              <Action
                label="Me encaja, prepara mi entrenamiento"
                onPress={() => setAprobado(true)}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => makeSplit.mutate()}
                disabled={makeSplit.isPending}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {makeSplit.isPending ? "Diseñando…" : "Prefiero otro reparto"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      ) : pending && pending.exercises.length > 0 ? (
        <ActiveWorkout
          // Un plan nuevo es un entrenamiento nuevo: la `key` fuerza el
          // remontaje para que no arrastre las series del anterior.
          key={pending.id}
          plan={pending}
          onBack={back}
          onFinish={() => router.push("/(tabs)/progress")}
        />
      ) : generate.error ? (
        <Centered>
          <Text style={styles.title}>El coach no pudo preparar la sesión</Text>
          <Text style={styles.body}>{message(generate.error)}</Text>
          <Action label="Reintentar" onPress={retry} />
        </Centered>
      ) : plan && !generate.isPending ? (
        <Centered>
          <Text style={styles.title}>Entrenamiento completado</Text>
          <Text style={styles.body}>
            Terminaste «{plan.title}». Cuando quieras volver, el coach
            preparará el siguiente a partir de lo que acabas de levantar.
          </Text>
          <Action label="Preparar el siguiente" onPress={retry} />
        </Centered>
      ) : (
        <Centered>
          <ActivityIndicator color={HomeColors.primary} />
          <Text style={styles.title}>Preparando tu entrenamiento</Text>
          <Text style={styles.body}>
            El coach está diseñando la sesión de hoy con tus datos y tus
            últimas semanas. Tarda unos segundos.
          </Text>
        </Centered>
      )}
    </SafeAreaView>
  );
}

const message = (error: unknown) => errorMessage(error);

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: HomeColors.background,
  },

  centered: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // El paso del reparto no va centrado como el resto: la tarjeta ocupa el
  // ancho y necesita scroll cuando la semana tiene seis días.
  splitStep: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 12,
  },

  title: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: HomeColors.text,
    textAlign: "center",
  },

  secondary: {
    marginTop: 4,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: HomeColors.textSecondary,
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },

  button: {
    marginTop: 12,
    height: 52,
    paddingHorizontal: 26,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  buttonDisabled: {
    backgroundColor: HomeColors.primaryMuted,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: HomeColors.onPrimary,
  },
});
