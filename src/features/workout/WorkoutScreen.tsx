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
import { localDate } from "@/services/workout";
import { errorMessage } from "@/utils/errors";
import { ActiveWorkout } from "./ActiveWorkout";
import {
  useGeneratePlan,
  useLatestPlan,
  usePlanStarted,
  useRegeneratePlan,
} from "./queries";

const WEEKDAYS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

const NOMBRES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/**
 * El día de la semana de una fecha AAAA-MM-DD, escrito.
 *
 * Se construye por componentes: `new Date("2026-08-10")` interpreta la cadena
 * como UTC y, al leerla en hora local, puede caer en el día anterior.
 */
const diaDe = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return NOMBRES[new Date(year, month - 1, day).getDay()] ?? "otro día";
};

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

  const { data: empezado } = usePlanStarted(pending?.id);
  const regenerate = useRegeneratePlan();

  /** El usuario ha dicho que quiere hacer igualmente el plan de otro día. */
  const [insistir, setInsistir] = useState(false);

  const hoy = WEEKDAYS[new Date().getDay()];
  const slotDeHoy = split?.days.find((day) => day.day === hoy);

  /**
   * Un plan que se quedó pendiente de otro día.
   *
   * Sin esto, saltarse el lunes dejaba el Push del lunes como entrenamiento
   * vigente el martes, el miércoles y para siempre: el desfase se acumulaba y
   * el reparto pasaba a decir una cosa y la app otra.
   *
   * Solo se ofrece si no tiene ninguna serie: uno empezado es historial.
   */
  const planDeOtroDia =
    pending && pending.scheduledFor !== localDate() ? pending : null;

  const ofrecerCambio =
    Boolean(planDeOtroDia) && empezado === false && !insistir;

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
      ) : ofrecerCambio && planDeOtroDia ? (
        <ScrollView contentContainerStyle={styles.choice}>
          <Text style={styles.title}>¿Qué entrenas hoy?</Text>
          <Text style={styles.body}>
            Te quedó uno preparado del {diaDe(planDeOtroDia.scheduledFor)} sin
            hacer.
          </Text>

          {/* Dos opciones con el mismo peso, no una acción y una escapatoria:
              cada tarjeta dice qué entrenamiento sale si la eliges. */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={regenerate.isPending}
            onPress={() =>
              regenerate.mutate(planDeOtroDia.id, {
                onError: () => setInsistir(true),
              })
            }
            style={[styles.option, styles.optionToday]}
          >
            <Text style={styles.optionEyebrow}>HOY</Text>
            <Text style={styles.optionTitle}>
              {slotDeHoy ? slotDeHoy.label : "Sesión suelta"}
            </Text>
            <Text style={styles.optionHint}>
              {regenerate.isPending
                ? "Preparándolo…"
                : slotDeHoy
                  ? slotDeHoy.focus
                  : "Hoy no toca entrenar según tu reparto"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={regenerate.isPending}
            onPress={() => setInsistir(true)}
            style={styles.option}
          >
            <Text style={styles.optionEyebrowMuted}>
              DEL {diaDe(planDeOtroDia.scheduledFor).toUpperCase()}
            </Text>
            <Text style={styles.optionTitle}>{planDeOtroDia.title}</Text>
            <Text style={styles.optionHint}>
              {planDeOtroDia.exercises.length} ejercicios ya preparados
            </Text>
          </TouchableOpacity>

          {regenerate.error && (
            <Text style={styles.body}>{message(regenerate.error)}</Text>
          )}
        </ScrollView>
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

  choice: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120,
    gap: 12,
  },

  option: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
    gap: 4,
  },

  // La de hoy va marcada, pero las dos se pulsan igual: es una elección, no
  // una recomendación con letra pequeña.
  optionToday: {
    borderColor: HomeColors.primary,
    backgroundColor: HomeColors.primarySoft,
  },

  optionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: HomeColors.primary,
  },

  optionEyebrowMuted: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: HomeColors.textTertiary,
  },

  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: HomeColors.text,
  },

  optionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: HomeColors.textSecondary,
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
