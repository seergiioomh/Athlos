import {
  ArrowLeft01Icon,
  ChampionIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserId } from "@/features/auth/session";
import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { BattleEmpty } from "./components/BattleEmpty";
import { BattleInfoSheet } from "./components/BattleInfoSheet";
import { BattleLeaderboard } from "./components/BattleLeaderboard";
import { BattleLobby } from "./components/BattleLobby";
import { daysLeftLabel } from "./format";
import { useBattleScore, useCurrentBattle } from "./queries";

/**
 * Cuántos días se sigue enseñando el resultado de una batalla terminada.
 * Pasados, la pantalla vuelve a ofrecer crear una nueva: un marcador de hace
 * un mes ya no le importa a nadie.
 */
const RESULT_DAYS = 7;

const recienTerminada = (endsAt: string | null) => {
  if (!endsAt) return false;

  return Date.now() - new Date(endsAt).getTime() < RESULT_DAYS * 86_400_000;
};

export function BattlesScreen() {
  const router = useRouter();
  const meId = useUserId()!;

  const [explaining, setExplaining] = useState(false);

  const { data: battle, isPending, error } = useCurrentBattle();

  // La clasificación solo existe una vez empezada.
  const activa = battle?.status === "active";
  const terminada = battle?.status === "finished" && recienTerminada(battle.endsAt);

  const { data: score } = useBattleScore(
    activa || terminada ? battle?.id : undefined
  );

  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  };

  const ganador = score?.[0];
  const heGanado = terminada && ganador?.userId === meId;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={back}
            hitSlop={10}
            style={styles.back}
            accessibilityLabel="Volver"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={20}
              color={HomeColors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>

          {/* Siempre visible, también sin batalla: es justo antes de crear la
              primera cuando más falta hace saber en qué consiste. */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setExplaining(true)}
            hitSlop={10}
            style={styles.back}
            accessibilityLabel="Cómo funcionan las batallas"
          >
            <HugeiconsIcon
              icon={InformationCircleIcon}
              size={20}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{battle?.name ?? "Batallas"}</Text>

        <Text style={styles.subtitle}>
          {activa
            ? daysLeftLabel(battle.endsAt)
            : battle?.status === "lobby"
              ? "Sala de espera"
              : terminada
                ? "Terminada"
                : "Compite con tus amigos por constancia, no por kilos."}
        </Text>

        {error && (
          <Text style={styles.error}>
            No se pudo cargar: {errorMessage(error)}
          </Text>
        )}

        {isPending ? (
          <View style={styles.centered}>
            <ActivityIndicator color={HomeColors.primary} />
          </View>
        ) : battle?.status === "lobby" ? (
          <View style={styles.body}>
            <BattleLobby battle={battle} meId={meId} />
          </View>
        ) : activa || terminada ? (
          <View style={styles.body}>
            {terminada && (
              <View style={[styles.result, heGanado && styles.resultWin]}>
                <HugeiconsIcon
                  icon={ChampionIcon}
                  size={26}
                  color={heGanado ? HomeColors.primary : HomeColors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={[styles.resultText, heGanado && styles.resultTextWin]}>
                  {heGanado
                    ? "¡Has ganado!"
                    : ganador
                      ? `Ganó ${ganador.displayName}`
                      : "Batalla terminada"}
                </Text>
              </View>
            )}

            {score && score.length > 0 ? (
              <BattleLeaderboard score={score} meId={meId} />
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator color={HomeColors.primary} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.body}>
            <BattleEmpty />
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BattleInfoSheet
        visible={explaining}
        onClose={() => setExplaining(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
  },

  body: { marginTop: 22, gap: 12 },

  centered: { paddingVertical: 50, alignItems: "center" },

  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },

  resultWin: {
    backgroundColor: HomeColors.primarySoft,
    borderWidth: 1,
    borderColor: HomeColors.primary,
  },

  resultText: { fontSize: 17, fontWeight: "700", color: HomeColors.text },
  resultTextWin: { color: HomeColors.primary },

  error: { marginTop: 16, fontSize: 13, color: HomeColors.errorText },
});
