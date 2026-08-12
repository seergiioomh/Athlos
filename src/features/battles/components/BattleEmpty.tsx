import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { useCreateBattle, useJoinBattle } from "../queries";

const DURATIONS = [
  { value: 7, label: "1 semana" },
  { value: 14, label: "2 semanas" },
  { value: 28, label: "4 semanas" },
];

/**
 * Sin batalla: crear una o entrar con un código.
 *
 * Las dos opciones a la vista y sin pestañas: son dos caminos cortos, y
 * esconder uno detrás de una pestaña solo añade un toque para descubrir que
 * existe.
 */
export function BattleEmpty() {
  const [name, setName] = useState("");
  const [days, setDays] = useState(7);
  const [code, setCode] = useState("");

  const create = useCreateBattle();
  const join = useJoinBattle();

  const canCreate = name.trim().length > 0 && !create.isPending;
  const canJoin = code.trim().length === 6 && !join.isPending;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear una batalla</Text>
        <Text style={styles.cardHint}>
          Gana quien mejor cumpla su propio plan, no quien más peso levante.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Los del gimnasio"
          placeholderTextColor={HomeColors.textTertiary}
          maxLength={40}
          style={styles.input}
          accessibilityLabel="Nombre de la batalla"
        />

        <View style={styles.durations}>
          <SegmentedControl options={DURATIONS} value={days} onChange={setDays} />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canCreate}
          onPress={() => create.mutate({ name: name.trim(), durationDays: days })}
          style={[styles.primary, !canCreate && styles.primaryOff]}
        >
          {create.isPending ? (
            <ActivityIndicator color={HomeColors.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>Crear</Text>
          )}
        </TouchableOpacity>

        {create.error && (
          <Text style={styles.error}>{errorMessage(create.error)}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar con un código</Text>
        <Text style={styles.cardHint}>
          Pídeselo a quien la haya creado. Son 6 caracteres.
        </Text>

        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase().trim())}
          placeholder="K7M2QX"
          placeholderTextColor={HomeColors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={[styles.input, styles.codeInput]}
          accessibilityLabel="Código de la batalla"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canJoin}
          onPress={() => join.mutate(code.trim())}
          style={[styles.secondary, !canJoin && styles.secondaryOff]}
        >
          {join.isPending ? (
            <ActivityIndicator color={HomeColors.primary} />
          ) : (
            <Text style={styles.secondaryText}>Entrar</Text>
          )}
        </TouchableOpacity>

        {join.error && <Text style={styles.error}>{errorMessage(join.error)}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: HomeColors.surface,
  },

  cardTitle: { fontSize: 17, fontWeight: "700", color: HomeColors.text },
  cardHint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: HomeColors.textSecondary,
  },

  input: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: HomeColors.text,
    backgroundColor: HomeColors.surfaceElevated,
  },

  codeInput: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },

  durations: { marginTop: 12 },

  primary: {
    marginTop: 14,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  primaryOff: { backgroundColor: HomeColors.primarySoft },
  primaryText: { fontSize: 15, fontWeight: "700", color: HomeColors.onPrimary },

  secondary: {
    marginTop: 14,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primarySoft,
  },

  secondaryOff: { opacity: 0.5 },
  secondaryText: { fontSize: 15, fontWeight: "700", color: HomeColors.primary },

  error: { marginTop: 10, fontSize: 12, color: HomeColors.errorText },
});
