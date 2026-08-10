import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { useRecoveryLink } from "@/features/auth/recovery-link";
import {
  useInitSession,
  useRecovering,
  useSession,
} from "@/features/auth/session";
import { HomeColors } from "@/features/home/home-theme";
import { useProfile } from "@/features/onboarding/queries";
import { configError } from "@/lib/supabase";

// La pantalla de carga la controlamos nosotros: así nunca se queda congelada
// esperando a que algo termine.
SplashScreen.preventAutoHideAsync();

/**
 * Tope de espera. Si una consulta se queda colgada —sin red, DNS lento,
 * servidor caído— la app avanza igualmente en vez de dejar al usuario
 * mirando un indicador para siempre.
 */
const STARTUP_TIMEOUT_MS = 8000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // En móvil la red se cae y vuelve constantemente: un reintento evita
      // que un bache de cobertura se vea como un error.
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DarkTheme}>
        <RootNavigator />
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  useInitSession();
  useRecoveryLink();

  const { status } = useSession();
  const recovering = useRecovering();
  const { data: profile, isPending: profilePending } = useProfile();
  const [timedOut, setTimedOut] = useState(false);

  // Se retira en cuanto hay algo que pintar. Si esperásemos a tener los datos,
  // un fallo de red dejaría la app en la pantalla de inicio de Apple sin
  // ninguna pista de qué pasa.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  // Sin configuración no hay nada que hacer, y da igual esperar: mejor
  // decirlo que quedarse cargando para siempre.
  if (configError) {
    return (
      <Loading title="No se pudo iniciar" error={configError} spinner={false} />
    );
  }

  if (status === "loading" && !timedOut) {
    return <Loading text="Abriendo tu sesión…" />;
  }

  // Durante la recuperación hay sesión abierta —`verifyOtp` la abre al validar
  // el código— pero el usuario aún no ha elegido contraseña nueva. Hasta que
  // termine sigue siendo un visitante, no alguien que ha entrado.
  const signedIn = status === "signed-in" && !recovering;

  if (signedIn && profilePending && !timedOut) {
    return <Loading text="Cargando tu perfil…" />;
  }

  // Con sesión pero sin bienvenida terminada, al formulario. Si el perfil no
  // se pudo leer dejamos pasar: un fallo de red no debe encerrar a nadie.
  const needsOnboarding =
    signedIn && profile !== undefined && !profile?.onboarded_at;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="auth" />
        {/* Destinos de los enlaces del correo. Van aquí y no en la zona
            protegida porque durante la recuperación `signedIn` es falso a
            propósito, y porque la confirmación se abre sin sesión previa. */}
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="confirm" />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        {/* Se abren encima de las pestañas, no son pestañas más. */}
        <Stack.Screen name="weekly-plan" />
        <Stack.Screen name="rachas" />
        {/* Un entrenamiento compartido se guarda en la cuenta de quien lo
            recibe, así que hace falta sesión: va en la zona protegida y no
            junto a los enlaces del correo. */}
        <Stack.Screen name="shared-workout" />
      </Stack.Protected>
    </Stack>
  );
}

function Loading({
  text,
  title,
  error,
  spinner = true,
}: {
  text?: string;
  title?: string;
  error?: string;
  spinner?: boolean;
}) {
  return (
    <View style={styles.loading}>
      {spinner && <ActivityIndicator color={HomeColors.primary} />}
      {title && <Text style={styles.loadingTitle}>{title}</Text>}
      {text && <Text style={styles.loadingText}>{text}</Text>}
      {error && <Text style={styles.loadingError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    backgroundColor: HomeColors.background,
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: HomeColors.text,
  },

  loadingText: { fontSize: 13, color: HomeColors.textSecondary },

  loadingError: {
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.errorText,
    textAlign: "center",
  },
});
