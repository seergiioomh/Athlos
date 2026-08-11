import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import type { CoachProposal, ProposalStatus } from "@/services/coach";

interface Props {
  proposal: CoachProposal;
  status: ProposalStatus;
  busy: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

const formatWeight = (kg: number) =>
  kg === 0 ? "peso corporal" : `${String(kg).replace(".", ",")} kg`;

/** Qué se va a tocar, en lenguaje llano. La tarjeta es lo que se lee antes
 *  de aceptar, así que no puede hablar de columnas ni de identificadores. */
const describe = (proposal: CoachProposal): string[] => {
  if (proposal.kind === "ajustar_ejercicio") {
    const lines: string[] = [];

    if (proposal.sets !== undefined) {
      lines.push(`Series: ${proposal.sets}`);
    }
    if (proposal.target_reps !== undefined) {
      lines.push(`Repeticiones: ${proposal.target_reps}`);
    }
    if (proposal.target_weight_kg !== undefined) {
      lines.push(`Peso: ${formatWeight(proposal.target_weight_kg)}`);
    }
    if (proposal.rest_seconds !== undefined) {
      lines.push(`Descanso: ${proposal.rest_seconds} s`);
    }

    return lines;
  }

  if (proposal.kind === "sustituir_ejercicio") {
    return [`Cambiar por: ${proposal.exercise_slug.replace(/-/g, " ")}`];
  }

  if (proposal.kind === "cambiar_reparto_semanal") {
    // Segunda red, además del saneado al leer. Lo que hay guardado es JSON que
    // escribió un modelo, y aquí un `.map` sobre undefined no da un hueco en
    // blanco: tumba la pantalla entera del chat.
    const sesiones = Array.isArray(proposal.cycle) ? proposal.cycle : [];

    return [
      proposal.name,
      ...sesiones.map(
        (sesion) => `Sesión ${sesion.position}: ${sesion.label} — ${sesion.focus}`
      ),
    ];
  }

  return [proposal.limitations];
};

const titleOf = (proposal: CoachProposal) =>
  proposal.kind === "ajustar_ejercicio"
    ? "Ajustar el ejercicio"
    : proposal.kind === "sustituir_ejercicio"
      ? "Sustituir el ejercicio"
      : proposal.kind === "cambiar_reparto_semanal"
        ? "Cambiar tu reparto semanal"
        : "Actualizar tus limitaciones";

export function ProposalCard({
  proposal,
  status,
  busy,
  onApply,
  onDiscard,
}: Props) {
  const resolved = status !== "pendiente";

  return (
    <View style={[styles.card, resolved && styles.cardResolved]}>
      <Text style={styles.eyebrow}>PROPUESTA DEL COACH</Text>
      <Text style={styles.title}>{titleOf(proposal)}</Text>

      <View style={styles.changes}>
        {describe(proposal).map((line, index) => (
          <Text key={index} style={styles.change}>
            {line}
          </Text>
        ))}
      </View>

      <Text style={styles.reason}>{proposal.motivo}</Text>

      {resolved ? (
        <Text style={styles.resolved}>
          {status === "aplicada" ? "Aplicada" : "Descartada"}
        </Text>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onDiscard}
            disabled={busy}
            style={styles.discard}
          >
            <Text style={styles.discardText}>Descartar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onApply}
            disabled={busy}
            style={[styles.apply, busy && styles.applyBusy]}
          >
            <Text style={styles.applyText}>
              {busy ? "Aplicando…" : "Aplicar"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    padding: 14,
    borderRadius: 20,
    backgroundColor: HomeColors.purpleSoft,
    borderWidth: 1,
    borderColor: HomeColors.purple,
  },

  // Una vez resuelta deja de pedir atención: ya no hay nada que decidir.
  cardResolved: {
    backgroundColor: HomeColors.surface,
    borderColor: HomeColors.border,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: HomeColors.purple,
  },

  title: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: "700",
    color: HomeColors.text,
  },

  changes: { marginTop: 10, gap: 3 },

  change: {
    fontSize: 14,
    fontWeight: "600",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  reason: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: HomeColors.textSecondary,
  },

  actions: { marginTop: 14, flexDirection: "row", gap: 8 },

  discard: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: HomeColors.surfaceElevated,
  },

  discardText: { fontSize: 14, fontWeight: "700", color: HomeColors.text },

  apply: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: HomeColors.purple,
  },

  applyBusy: { backgroundColor: HomeColors.purpleSoft },

  applyText: { fontSize: 14, fontWeight: "700", color: HomeColors.text },

  resolved: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: HomeColors.textSecondary,
  },
});
