import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import type { TrainingCycleRow } from "@/types/database";

interface Props {
  split: TrainingCycleRow | null;
  generating: boolean;
  error?: string;
  onGenerate: () => void;
  onTalkToCoach: () => void;
}

export function WeeklySplitCard({
  split,
  generating,
  error,
  onGenerate,
  onTalkToCoach,
}: Props) {
  if (!split) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>Sin ciclo todavía</Text>
        <Text style={styles.rationale}>
          El entrenador puede montarte el ciclo según tus días, tu objetivo y tu
          material.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onGenerate}
          disabled={generating}
          style={[styles.primary, generating && styles.primaryBusy]}
        >
          <Text style={styles.primaryText}>
            {generating ? "Diseñando…" : "Diseñar mi ciclo"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Segunda red, además del saneado del servicio. Esta pantalla no tiene
  // salida propia: si revienta al montar, no queda ningún botón que pulsar
  // para arreglarlo.
  const sesiones = Array.isArray(split.cycle) ? split.cycle : [];

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>TU CICLO DE ENTRENAMIENTO</Text>
      <Text style={styles.name}>{split.name}</Text>

      {split.rationale && (
        <Text style={styles.rationale}>{split.rationale}</Text>
      )}

      <View style={styles.days}>
        {sesiones.map((sesion) => (
          <View key={sesion.position} style={styles.day}>
            {/* El número es la identidad de la sesión: es lo que la ordena en
                la rotación, no el día en que caiga. */}
            <Text style={styles.dayName}>{sesion.position}</Text>

            <View style={styles.dayText}>
              <Text style={styles.dayLabel}>{sesion.label}</Text>
              <Text style={styles.dayFocus}>{sesion.focus}</Text>
            </View>
          </View>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Ajustar el reparto es una conversación, no un formulario: el coach
          necesita saber por qué no te encaja para proponer otra cosa. */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onTalkToCoach}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>
          No me encaja, hablar con el coach
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: HomeColors.textSecondary,
  },

  name: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: HomeColors.text,
  },

  rationale: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.textSecondary,
  },

  days: { marginTop: 16, gap: 8 },

  day: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: HomeColors.surfaceElevated,
  },

  dayToday: { backgroundColor: HomeColors.primarySoft },

  dayName: {
    width: 22,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: HomeColors.textSecondary,
  },

  dayTodayText: { color: HomeColors.primary },

  dayText: { flex: 1 },

  dayLabel: { fontSize: 15, fontWeight: "700", color: HomeColors.text },

  dayFocus: {
    marginTop: 1,
    fontSize: 12,
    color: HomeColors.textSecondary,
  },

  error: { marginTop: 12, fontSize: 12, color: HomeColors.errorText },

  primary: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  primaryBusy: { backgroundColor: HomeColors.primaryMuted },

  primaryText: { fontSize: 15, fontWeight: "700", color: HomeColors.onPrimary },

  secondary: {
    marginTop: 16,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primarySoft,
  },

  secondaryText: { fontSize: 14, fontWeight: "700", color: HomeColors.primary },
});
