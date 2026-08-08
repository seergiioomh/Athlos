import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { signIn, signUp } from "./session";

type Mode = "entrar" | "registro";

const MIN_PASSWORD = 8;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      return setError("Escribe un correo válido.");
    }

    if (password.length < MIN_PASSWORD) {
      return setError(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
    }

    setBusy(true);

    try {
      if (mode === "entrar") {
        await signIn(cleanEmail, password);
      } else {
        const { needsConfirmation } = await signUp(cleanEmail, password);

        if (needsConfirmation) {
          setNotice(
            "Cuenta creada. Te hemos enviado un correo para confirmarla; ábrelo y vuelve aquí para entrar."
          );
          setMode("entrar");
        }
      }
    } catch (caught) {
      setError(errorMessage(caught, "No se pudo completar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>ATHLOS</Text>
          <Text style={styles.title}>
            {mode === "entrar" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "entrar"
              ? "Entra para seguir donde lo dejaste."
              : "Tu entrenador personal, con tus datos y solo tuyos."}
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={HomeColors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
              placeholderTextColor={HomeColors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              // Le dice al gestor de contraseñas si guardar una nueva o
              // rellenar la existente.
              textContentType={mode === "entrar" ? "password" : "newPassword"}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={submit}
            disabled={busy}
            style={[styles.button, busy && styles.buttonBusy]}
          >
            {busy ? (
              <ActivityIndicator color={HomeColors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "entrar" ? "Entrar" : "Crear cuenta"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMode(mode === "entrar" ? "registro" : "entrar");
              setError(null);
              setNotice(null);
            }}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {mode === "entrar"
                ? "¿No tienes cuenta? Crea una"
                : "¿Ya tienes cuenta? Entra"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  flex: { flex: 1 },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  brand: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    color: HomeColors.primary,
  },

  title: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
  },

  field: { marginTop: 24, gap: 8 },

  label: { fontSize: 14, fontWeight: "700", color: HomeColors.text },

  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
    fontSize: 16,
    color: HomeColors.text,
  },

  error: { marginTop: 18, fontSize: 13, color: HomeColors.errorText },

  notice: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 19,
    color: HomeColors.primary,
  },

  button: {
    marginTop: 26,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  buttonBusy: { backgroundColor: HomeColors.primaryMuted },

  buttonText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },

  switch: { marginTop: 18, alignItems: "center" },

  switchText: { fontSize: 13, fontWeight: "600", color: HomeColors.textSecondary },
});
