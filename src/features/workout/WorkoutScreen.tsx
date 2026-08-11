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
import {
  useActiveCycle,
  useApproveCycle,
  useDraftCycle,
  useGenerateCycle,
} from "@/features/profile/queries";
import { errorMessage } from "@/utils/errors";
import { ActiveWorkout } from "./ActiveWorkout";
import { WorkoutCompletionScreen } from "./WorkoutCompletionScreen";
import { useGeneratePlan, useLatestPlan } from "./queries";

export function WorkoutScreen() {
  const router = useRouter();
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);

  const { data: plan, isPending, error, refetch } = useLatestPlan();
  const generate = useGeneratePlan();

  const { data: cycle, isPending: cyclePending } = useActiveCycle();
  const { data: draft } = useDraftCycle();
  const makeCycle = useGenerateCycle();
  const approve = useApproveCycle();

  // Mientras no esté hecho, este es el entrenamiento vigente por muchos días
  // que hayan pasado. Con el ciclo eso ya no desfasa nada: la sesión pendiente
  // sigue siendo la que toca, se haga hoy o el jueves.
  const pending = plan && !plan.completedAt ? plan : null;

  /**
   * Sin ciclo aprobado no se entrena.
   *
   * El estado vive en la base —`status` y `approved_at`— y no en React: así
   * cerrar la app a mitad no pierde la propuesta, y el coach y esta pantalla
   * miran lo mismo.
   */
  const faltaCiclo = !pending && !cyclePending && !cycle;

  // Una sola tentativa automática por visita: si la IA falla, insistir sola
  // sería quemar llamadas sin que el usuario se entere.
  const attempted = useRef(false);

  useEffect(() => {
    // Solo se genera solo la primera vez. Después de terminar uno, el
    // siguiente lo pide el usuario: es él quien sabe cuándo vuelve.
    if (isPending || error || plan || attempted.current) return;

    // Y nunca antes de tener un ciclo aprobado: la sesión se diseña a partir
    // de él, así que generarla antes sería tirarla a la basura.
    if (!cycle) return;

    attempted.current = true;
    generate.mutate(undefined);
  }, [isPending, error, plan, generate, cycle]);

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
      {completedSessionId && plan ? (
        <WorkoutCompletionScreen
          sessionId={completedSessionId}
          onOpenCoach={() => router.push("/(tabs)/coach")}
          onContinue={() => {
            setCompletedSessionId(null);
            router.replace("/(tabs)/progress");
          }}
        />
      ) : isPending ? (
        <Centered>
          <ActivityIndicator color={HomeColors.primary} />
        </Centered>
      ) : error ? (
        <Centered>
          <Text style={styles.title}>No pudimos cargar tu entrenamiento</Text>
          <Text style={styles.body}>{message(error)}</Text>
          <Action label="Reintentar" onPress={() => refetch()} />
        </Centered>
      ) : faltaCiclo ? (
        <ScrollView contentContainerStyle={styles.splitStep}>
          <Text style={styles.title}>Primero, tu ciclo</Text>
          <Text style={styles.body}>
            Son tus sesiones en orden: la 1, la 2, la 3… y vuelta a empezar.
            Cada entrenamiento sale de aquí, y da igual el día que entrenes.
          </Text>

          <WeeklySplitCard
            split={draft ?? null}
            generating={makeCycle.isPending}
            error={makeCycle.error ? message(makeCycle.error) : undefined}
            onGenerate={() => makeCycle.mutate()}
            onTalkToCoach={() => router.push("/(tabs)/coach")}
          />

          {draft && (
            <>
              <Action
                label={
                  approve.isPending ? "Guardando…" : "Me encaja, empezar"
                }
                onPress={() => approve.mutate(draft.id)}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => makeCycle.mutate()}
                disabled={makeCycle.isPending || approve.isPending}
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>
                  {makeCycle.isPending ? "Diseñando…" : "Prefiero otro ciclo"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {approve.error && (
            <Text style={styles.body}>{message(approve.error)}</Text>
          )}
        </ScrollView>
      ) : pending && pending.exercises.length > 0 ? (
        <ActiveWorkout
          // Un plan nuevo es un entrenamiento nuevo: la `key` fuerza el
          // remontaje para que no arrastre las series del anterior.
          key={pending.id}
          plan={pending}
          onBack={back}
          onFinish={setCompletedSessionId}
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
