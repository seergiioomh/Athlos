import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { WeeklySplitCard } from "./components/WeeklySplitCard";
import { useActiveCycle, useGenerateCycle } from "./queries";

export function WeeklyPlanScreen() {
  const router = useRouter();

  const { data: split } = useActiveCycle();
  const makeSplit = useGenerateCycle();

  const back = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/profile");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
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

        <Text style={styles.title}>Mi plan semanal</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WeeklySplitCard
          split={split ?? null}
          generating={makeSplit.isPending}
          error={makeSplit.error ? errorMessage(makeSplit.error) : undefined}
          onGenerate={() => makeSplit.mutate()}
          onTalkToCoach={() => router.push("/(tabs)/coach")}
        />

        {split && (
          <>
            <Text style={styles.section}>Cómo funciona</Text>

            <View style={styles.explainer}>
              <Text style={styles.explainerText}>
                Cada día que entrenas, el coach diseña la sesión siguiendo este
                reparto. Si hoy toca Pull, el entrenamiento será de Pull.
              </Text>
              <Text style={styles.explainerText}>
                Cambiar el reparto no borra el anterior: se guarda para poder
                ver cómo ha ido evolucionando tu estructura.
              </Text>
            </View>

            {/* Rediseñar vive aquí y no en el perfil: es una acción que cuesta
                una llamada a la IA y conviene que sea deliberada. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => makeSplit.mutate()}
              disabled={makeSplit.isPending}
              style={[
                styles.regenerate,
                makeSplit.isPending && styles.regenerateBusy,
              ]}
            >
              <Text style={styles.regenerateText}>
                {makeSplit.isPending
                  ? "Rediseñando…"
                  : "Rediseñar desde cero"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.aside}>
              Si solo quieres tocar un día o cambiar de tipo de rutina, es mejor
              hablarlo con el coach: te propone el cambio y tú decides.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
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
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: HomeColors.text,
  },

  content: { paddingHorizontal: 20, paddingBottom: 60 },

  section: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "700",
    color: HomeColors.text,
  },

  explainer: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
    gap: 10,
  },

  explainerText: {
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
  },

  regenerate: {
    marginTop: 20,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  regenerateBusy: { opacity: 0.6 },

  regenerateText: { fontSize: 15, fontWeight: "700", color: HomeColors.text },

  aside: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },
});
