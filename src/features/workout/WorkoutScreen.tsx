import { useLocalSearchParams, useRouter } from "expo-router";
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

import { RestRing } from "@/components/ui/RestRing";
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
import { cuentaAtras, nombreProximoDia } from "./schedule";
import { useTrainingDay } from "./useTrainingDay";

export function WorkoutScreen() {
  const router = useRouter();

  /**
   * El usuario ya dijo "entrenar igualmente" en Inicio, en un día de descanso.
   *
   * Viaja en la ruta porque sin esto la decisión se perdía al cambiar de
   * pantalla y aquí volvíamos a preguntarle lo mismo: dos toques para decir
   * una sola cosa, que es justo la clase de traba que no queremos.
   */
  const { forzar } = useLocalSearchParams<{ forzar?: string }>();
  const forzado = forzar === "1";
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);

  const { data: plan, isPending, error, refetch } = useLatestPlan();
  const generate = useGeneratePlan();

  // El mismo estado que pinta la tarjeta de Inicio. Tienen que mirar lo
  // mismo: si allí se esconde el botón y aquí se sigue generando, la regla no
  // existe, porque a esta pantalla se llega tocando la pestaña.
  const { estado, cargando: diaCargando } = useTrainingDay();

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
    if (isPending || error || attempted.current) return;

    // Nunca antes de tener un ciclo aprobado: la sesión se diseña a partir de
    // él, así que generarla antes sería tirarla a la basura.
    if (!cycle) return;

    // Con el entrenamiento ya preparado no hay nada que generar, y si hoy ya
    // se ha entrenado tampoco.
    if (pending) return;

    // Se espera a que se sepa qué día es: hasta que llegan el perfil y las
    // sesiones, el estado dice "toca" por defecto, y sin esta espera generaría
    // en un día de descanso antes de enterarse.
    if (diaCargando || estado.estado === "hecho") return;

    // Se genera sola en dos casos y solo en esos:
    //
    // - **La primera vez**, sin ningún plan todavía, para que la primera
    //   visita no se quede en una pantalla vacía.
    // - **Cuando el usuario ya ha dicho que sí** desde Inicio, en un día de
    //   descanso. Volver a preguntárselo aquí sería el segundo toque para la
    //   misma decisión.
    //
    // Fuera de ahí lo pide él: cada generación es una llamada a Claude con
    // cuota diaria, y gastarla solo porque alguien tocó la pestaña es tirar
    // el dinero y la cuota.
    const generarSola = forzado || (!plan && estado.estado === "toca");

    if (!generarSola) return;

    attempted.current = true;
    generate.mutate(undefined);
  }, [
    isPending,
    error,
    plan,
    pending,
    generate,
    cycle,
    diaCargando,
    estado.estado,
    forzado,
  ]);

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
      ) : estado.estado === "hecho" ? (
        // Va antes que el entrenamiento pendiente a propósito: si hoy ya has
        // entrenado, da igual que quede un plan sin hacer. Mañana sigue ahí.
        <Centered>
          {/* El mismo anillo que la tarjeta de Inicio, más grande porque aquí
              hay pantalla entera. Cuentan lo mismo, así que se enseñan igual. */}
          <RestRing minutosRestantes={estado.minutosRestantes} size={116} />

          <Text style={styles.title}>Hecho por hoy</Text>
          <Text style={styles.body}>
            Siguiente entrenamiento en {cuentaAtras(estado.minutosRestantes)}
          </Text>
        </Centered>
      ) : estado.estado === "descanso" && !forzado ? (
        // Aquí no se bloquea nada: se avisa y se deja el botón. Los días de
        // entreno son una intención declarada, no un contrato, y quien se
        // saltó el viernes quiere entrenar el sábado.
        <Centered>
          <Text style={styles.title}>Hoy toca descansar</Text>
          <Text style={styles.body}>
            {estado.proximo
              ? `Según los días que elegiste, vuelves ${nombreProximoDia(estado.proximo)}. Pero decides tú: si hoy te apetece, entrenamos.`
              : "Según los días que elegiste, hoy no entrenas. Pero decides tú: si hoy te apetece, entrenamos."}
          </Text>

          <Action
            label={generate.isPending ? "Preparando…" : "Entrenar igualmente"}
            onPress={retry}
            disabled={generate.isPending}
          />

          {/* El fallo se enseña aquí y no más abajo: esta rama corta la
              cadena, así que la pantalla de error general no se alcanzaría. */}
          {generate.error && (
            <Text style={styles.body}>{message(generate.error)}</Text>
          )}
        </Centered>
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
