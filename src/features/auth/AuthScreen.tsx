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
import { authErrorMessage, esCorreoYaRegistrado } from "@/utils/auth-errors";
import { confirmRedirectUrl, recoveryRedirectUrl } from "./recovery-link";
import {
  cancelRecovery,
  endRecovery,
  requestPasswordReset,
  setRecoveryError,
  signIn,
  signUp,
  updatePassword,
  useRecovering,
  useRecoveryError,
  useSession,
} from "./session";

type Mode = "entrar" | "registro" | "pedir-enlace";

const MIN_PASSWORD = 8;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { status } = useSession();
  const recovering = useRecovering();
  const recoveryError = useRecoveryError();

  /**
   * El enlace del correo ya abrió sesión, pero la contraseña sigue siendo la
   * vieja. Este es el único momento en que se pide la nueva.
   */
  const eligiendoClave = recovering && status === "signed-in";

  /** Llegó un enlace y falló: caducado, ya usado o mal formado. */
  const enlaceFallido = recovering && status !== "signed-in";

  const limpiar = () => {
    setError(null);
    setNotice(null);
    // El fallo de un enlace ya usado no debe seguir en pantalla cuando el
    // usuario vuelve a intentar cualquier otra cosa.
    setRecoveryError(null);
  };

  const cambiarModo = (siguiente: Mode) => {
    setMode(siguiente);
    limpiar();
  };

  /** Sale de la recuperación cerrando la sesión que abrió el enlace. */
  const volverAEntrar = async () => {
    await cancelRecovery();
    setPassword("");
    cambiarModo("entrar");
  };

  const pedirEnlace = async (cleanEmail: string) => {
    setBusy(true);

    try {
      await requestPasswordReset(cleanEmail, recoveryRedirectUrl());
      setNotice(
        "Si hay una cuenta con ese correo, te llega un enlace en unos segundos. Ábrelo desde este mismo móvil y volverás aquí para elegir la contraseña."
      );
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const guardarClaveNueva = async () => {
    if (password.length < MIN_PASSWORD) {
      return setError(
        `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`
      );
    }

    setBusy(true);

    try {
      await updatePassword(password);
      // A partir de aquí la sesión es legítima: al bajar la marca, el layout
      // deja pasar al usuario a la app.
      endRecovery();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    limpiar();

    if (eligiendoClave) return guardarClaveNueva();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      return setError("Escribe un correo válido.");
    }

    if (mode === "pedir-enlace") return pedirEnlace(cleanEmail);

    if (password.length < MIN_PASSWORD) {
      return setError(
        `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`
      );
    }

    setBusy(true);

    try {
      if (mode === "entrar") {
        await signIn(cleanEmail, password);
      } else {
        const { needsConfirmation } = await signUp(
          cleanEmail,
          password,
          confirmRedirectUrl()
        );

        if (needsConfirmation) {
          setNotice(
            "Cuenta creada. Te hemos enviado un correo para confirmarla: ábrelo desde este mismo móvil y el enlace te traerá de vuelta aquí, ya dentro."
          );
          setMode("entrar");
        }
      }
    } catch (caught) {
      if (mode === "registro" && esCorreoYaRegistrado(caught)) {
        setMode("entrar");
        return setNotice("Ya tienes cuenta con este correo. Entra con ella.");
      }

      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const { title, subtitle } = (() => {
    if (eligiendoClave) {
      return {
        title: "Nueva contraseña",
        subtitle: "Elige una contraseña y entrarás con ella a partir de ahora.",
      };
    }

    if (enlaceFallido) {
      return {
        title: "El enlace no ha funcionado",
        subtitle: "Vuelve al acceso y pide otro correo.",
      };
    }

    if (mode === "registro") {
      return {
        title: "Crea tu cuenta",
        subtitle: "Tu entrenador personal, con tus datos y solo tuyos.",
      };
    }

    if (mode === "pedir-enlace") {
      return {
        title: "Recuperar contraseña",
        subtitle: "Te mandamos un enlace al correo para que elijas una nueva.",
      };
    }

    return {
      title: "Bienvenido de vuelta",
      subtitle: "Entra para seguir donde lo dejaste.",
    };
  })();

  const textoBoton = eligiendoClave
    ? "Guardar contraseña"
    : { entrar: "Entrar", registro: "Crear cuenta", "pedir-enlace": "Enviar enlace" }[
        mode
      ];

  const mostrarCorreo = !eligiendoClave && !enlaceFallido;
  const mostrarClave = eligiendoClave || (!enlaceFallido && mode !== "pedir-enlace");

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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {mostrarCorreo && (
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
          )}

          {mostrarClave && (
            <View style={styles.field}>
              <Text style={styles.label}>
                {eligiendoClave ? "Contraseña nueva" : "Contraseña"}
              </Text>
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
                textContentType={mode === "entrar" && !eligiendoClave ? "password" : "newPassword"}
              />
            </View>
          )}

          {mode === "entrar" && !recovering && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => cambiarModo("pedir-enlace")}
              style={styles.forgot}
            >
              <Text style={styles.forgotText}>¿Has olvidado la contraseña?</Text>
            </TouchableOpacity>
          )}

          {(recoveryError || error) && (
            <Text style={styles.error}>{recoveryError ?? error}</Text>
          )}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          {!enlaceFallido && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={submit}
              disabled={busy}
              style={[styles.button, busy && styles.buttonBusy]}
            >
              {busy ? (
                <ActivityIndicator color={HomeColors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>{textoBoton}</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (recovering || mode === "pedir-enlace") return volverAEntrar();
              cambiarModo(mode === "entrar" ? "registro" : "entrar");
            }}
            disabled={busy}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {recovering || mode === "pedir-enlace"
                ? "Volver al acceso"
                : mode === "entrar"
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

  forgot: { marginTop: 14, alignSelf: "flex-start" },

  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.primary,
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
