import { SentIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeColors } from "@/features/home/home-theme";
import {
  useLatestPlan,
  usePlanStarted,
  useRegeneratePlan,
} from "@/features/workout/queries";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { RETENTION_DAYS, type CoachMessage } from "@/services/coach";
import { errorMessage } from "@/utils/errors";
import { ProposalCard } from "./components/ProposalCard";
import { useAskCoach, useCoachMessages, useResolveProposal } from "./queries";

// Hueco para que la tab bar flotante no tape la barra de escritura.
const TAB_BAR_SPACE = 115;

const suggestions = [
  "¿Puedo entrenar con agujetas?",
  "¿Cómo mejoro mi press banca?",
  "¿Qué como después de entrenar?",
  "Hoy tengo poco tiempo, ¿qué hago?",
];

export function CoachScreen() {
  const [draft, setDraft] = useState("");
  const keyboardOpen = useKeyboardVisible();

  const { data: messages, isPending, error } = useCoachMessages();
  const ask = useAskCoach();
  const resolve = useResolveProposal();

  const { data: plan } = useLatestPlan();
  const pendiente = plan && !plan.completedAt ? plan : null;
  const { data: empezado } = usePlanStarted(pendiente?.id);
  const regenerate = useRegeneratePlan();

  /**
   * Cambiar el reparto deja obsoleto el entrenamiento que ya estaba preparado,
   * y hasta ahora no había forma de salir de él: "preparar el siguiente" solo
   * aparece cuando no hay ninguno pendiente.
   *
   * Se pregunta en vez de rehacerlo solo. El coach propone y el usuario decide,
   * igual que con el resto de sus cambios.
   */
  const ofrecerRehacer = () => {
    // Un entrenamiento con series registradas es historial: no se toca aunque
    // el reparto haya cambiado.
    if (!pendiente || empezado !== false) return;

    Alert.alert(
      "Tu reparto ha cambiado",
      `El entrenamiento preparado sigue siendo el anterior: ${pendiente.title}. ¿Lo rehago con el reparto nuevo?`,
      [
        { text: "Dejarlo así", style: "cancel" },
        {
          text: "Rehacer",
          onPress: () =>
            regenerate.mutate(pendiente.id, {
              onError: (caught) =>
                Alert.alert("No se pudo rehacer", errorMessage(caught)),
            }),
        },
      ]
    );
  };

  const send = (text: string) => {
    const message = text.trim();
    if (!message || ask.isPending) return;

    setDraft("");

    ask.mutate(message, {
      // Si no llegó a enviarse, devolvemos el texto al campo: obligar a
      // reescribirlo es la peor manera de contar que algo falló.
      onError: () => setDraft(message),
    });
  };

  const empty = !isPending && (messages ?? []).length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* La cabecera cierra el teclado al tocarla. La lista NO va envuelta:
            un Pressable reclama el gesto al posar el dedo y la lista se queda
            sin él, así que el chat dejaba de poder desplazarse. Ella cierra
            el teclado por su cuenta, al arrastrar o al tocar en hueco. */}
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <HugeiconsIcon
                icon={SparklesIcon}
                size={18}
                color={HomeColors.primary}
                strokeWidth={2.2}
              />
            </View>

            <View>
              <Text style={styles.title}>Coach ATHLOS</Text>
              <Text style={styles.subtitle}>
                {ask.isPending ? "Escribiendo…" : "Tu entrenador personal"}
              </Text>
            </View>
          </View>
        </Pressable>

        {isPending ? (
          <View style={styles.centered}>
            <ActivityIndicator color={HomeColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.emptyBody}>
              No pudimos cargar la conversación.
            </Text>
          </View>
        ) : empty ? (
          <Pressable
            style={styles.centered}
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <Text style={styles.emptyTitle}>Pregúntame lo que quieras</Text>
            <Text style={styles.emptyBody}>
              Conozco tu objetivo, tu nivel y lo que has entrenado estos días.
            </Text>

            <View style={styles.suggestions}>
              {suggestions.map((text) => (
                <TouchableOpacity
                  key={text}
                  activeOpacity={0.85}
                  onPress={() => send(text)}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        ) : (
          <FlatList
            style={styles.flex}
            // Invertida: los mensajes nuevos entran abajo y la lista se
            // queda donde debe sin tener que forzar el scroll.
            inverted
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={ask.isPending ? <Typing /> : null}
            // En una lista invertida el pie se dibuja arriba del todo, que es
            // justo donde acaba lo que se conserva.
            ListFooterComponent={
              <Text style={styles.retention}>
                Los mensajes de hace más de {RETENTION_DAYS} días se borran
                solos.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.turn}>
                <Bubble message={item} />

                {item.proposal && item.proposalStatus && (
                  <ProposalCard
                    proposal={item.proposal}
                    status={item.proposalStatus}
                    busy={
                      resolve.isPending &&
                      resolve.variables?.messageId === item.id
                    }
                    onApply={() =>
                      resolve.mutate(
                        {
                          messageId: item.id,
                          proposal: item.proposal!,
                          status: "aplicada",
                        },
                        {
                          onSuccess: () => {
                            if (
                              item.proposal?.kind === "cambiar_reparto_semanal"
                            ) {
                              ofrecerRehacer();
                            }
                          },
                        }
                      )
                    }
                    onDiscard={() =>
                      resolve.mutate({
                        messageId: item.id,
                        proposal: item.proposal!,
                        status: "descartada",
                      })
                    }
                  />
                )}
              </View>
            )}
          />
        )}

        {/* Fuera de la lista a propósito: cuando la conversación está vacía
            la lista no se dibuja, y el error se quedaba invisible. */}
        {ask.error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              No se pudo enviar. {message(ask.error)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.composer,
            // Con el teclado abierto la tab bar queda tapada: reservarle
            // hueco entonces empuja toda la pantalla hacia arriba.
            { paddingBottom: keyboardOpen ? 12 : TAB_BAR_SPACE },
          ]}
        >
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe a tu entrenador…"
            placeholderTextColor={HomeColors.textTertiary}
            multiline
            maxLength={2000}
            onSubmitEditing={() => send(draft)}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => send(draft)}
            disabled={!draft.trim() || ask.isPending}
            style={[
              styles.sendButton,
              (!draft.trim() || ask.isPending) && styles.sendDisabled,
            ]}
            accessibilityLabel="Enviar"
          >
            <HugeiconsIcon
              icon={SentIcon}
              size={20}
              color={HomeColors.onPrimary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }: { message: CoachMessage }) {
  const mine = message.role === "user";

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.bubbleText, mine && styles.mineText]}>
        {message.content}
      </Text>
    </View>
  );
}

function Typing() {
  return (
    <View style={[styles.bubble, styles.theirs, styles.typing]}>
      <ActivityIndicator size="small" color={HomeColors.textSecondary} />
      <Text style={styles.typingText}>Pensando…</Text>
    </View>
  );
}

const message = (error: unknown) =>
  errorMessage(error, "Inténtalo de nuevo.");

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: HomeColors.border,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 17, fontWeight: "700", color: HomeColors.text },
  subtitle: { marginTop: 1, fontSize: 12, color: HomeColors.textSecondary },

  centered: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: TAB_BAR_SPACE,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: HomeColors.text,
    textAlign: "center",
  },

  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },

  suggestions: { marginTop: 18, gap: 8, alignSelf: "stretch" },

  suggestion: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  suggestionText: {
    fontSize: 14,
    color: HomeColors.text,
    textAlign: "center",
  },

  list: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },

  retention: {
    marginBottom: 8,
    fontSize: 11,
    color: HomeColors.textTertiary,
    textAlign: "center",
  },

  // Mensaje y propuesta son un mismo turno: van juntos y con menos aire
  // entre ellos que entre turnos distintos.
  turn: { gap: 8 },

  bubble: {
    maxWidth: "84%",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
  },

  mine: {
    alignSelf: "flex-end",
    backgroundColor: HomeColors.primary,
    borderBottomRightRadius: 6,
  },

  theirs: {
    alignSelf: "flex-start",
    backgroundColor: HomeColors.surface,
    borderBottomLeftRadius: 6,
  },

  bubbleText: { fontSize: 15, lineHeight: 21, color: HomeColors.text },
  mineText: { color: HomeColors.onPrimary },

  typing: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 14, color: HomeColors.textSecondary },

  errorBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: HomeColors.errorSoft,
  },

  errorText: { fontSize: 13, lineHeight: 18, color: HomeColors.errorText },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
    fontSize: 15,
    color: HomeColors.text,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  sendDisabled: { backgroundColor: HomeColors.primaryMuted },
});
