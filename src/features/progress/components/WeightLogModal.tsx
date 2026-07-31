import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  visible: boolean;
  /** Último peso conocido: se propone como punto de partida. */
  lastWeight?: number;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (weightKg: number) => void;
}

const MIN = 30;
const MAX = 300;

export function WeightLogModal({
  visible,
  lastWeight,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  // Cada vez que se abre partimos del último peso: lo habitual es corregir
  // unos gramos, no escribir el número entero.
  useEffect(() => {
    if (!visible) return;

    setValue(lastWeight ? String(lastWeight).replace(".", ",") : "");
    setInvalid(false);
  }, [visible, lastWeight]);

  const submit = () => {
    const parsed = Number(value.replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < MIN || parsed > MAX) {
      setInvalid(true);
      return;
    }

    onSave(parsed);
  };

  const adjust = (delta: number) => {
    const current = Number(value.replace(",", ".")) || lastWeight || 70;
    const next = Math.min(MAX, Math.max(MIN, current + delta));

    setValue(next.toFixed(1).replace(".", ","));
    setInvalid(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* El campo abre el teclado solo, así que la hoja tiene que subir con
          él: sin esto el botón de guardar queda debajo y es inalcanzable. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.lift}
      >
      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <Text style={styles.title}>Peso de hoy</Text>
        <Text style={styles.subtitle}>
          Si ya registraste uno hoy, este lo sustituye.
        </Text>

        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => adjust(-0.1)}
            style={styles.step}
          >
            <Text style={styles.stepText}>−</Text>
          </TouchableOpacity>

          <View style={styles.field}>
            <TextInput
              style={[styles.input, invalid && styles.inputError]}
              value={value}
              onChangeText={(text) => {
                setValue(text.replace(/[^0-9.,]/g, "").replace(".", ","));
                setInvalid(false);
              }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              maxLength={6}
              autoFocus
              accessibilityLabel="Peso en kilos"
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => adjust(0.1)}
            style={styles.step}
          >
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>

        {invalid && (
          <Text style={styles.error}>
            Escribe un peso entre {MIN} y {MAX} kg.
          </Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={submit}
          disabled={saving}
          style={[styles.save, saving && styles.saveDisabled]}
        >
          <Text style={styles.saveText}>
            {saving ? "Guardando…" : "Guardar"}
          </Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  // La hoja se ancla abajo desde el contenedor, no con `marginTop: auto`:
  // así el KeyboardAvoidingView puede empujarla.
  lift: { flex: 1, justifyContent: "flex-end" },

  sheet: {
    backgroundColor: HomeColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: HomeColors.border,
  },

  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
  },

  title: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "700",
    color: HomeColors.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: HomeColors.textSecondary,
  },

  row: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  step: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
  },

  stepText: { fontSize: 24, fontWeight: "700", color: HomeColors.text },

  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
  },

  input: {
    minWidth: 110,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.5,
    textAlign: "center",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  inputError: { color: HomeColors.errorText },

  unit: { fontSize: 18, fontWeight: "600", color: HomeColors.textSecondary },

  error: {
    marginTop: 12,
    fontSize: 13,
    color: HomeColors.errorText,
    textAlign: "center",
  },

  save: {
    marginTop: 24,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  saveDisabled: { backgroundColor: HomeColors.primaryMuted },

  saveText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },
});
