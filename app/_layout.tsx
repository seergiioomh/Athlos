import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { useProfile } from "@/features/onboarding/queries";
import { HomeColors } from "@/features/home/home-theme";

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
  const { data: profile, isPending } = useProfile();

  // Hasta saber si hay perfil no montamos nada: si no, se vería un
  // parpadeo de la app antes de saltar a la bienvenida.
  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={HomeColors.primary} />
      </View>
    );
  }

  // Si el perfil no se puede leer (sin red, por ejemplo) dejamos pasar a la
  // app en vez de encerrar al usuario en el formulario.
  const needsOnboarding = profile !== undefined && !profile?.onboarded_at;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={!needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        {/* Se abren encima de las pestañas, no son pestañas más. */}
        <Stack.Screen name="weekly-plan" />
        <Stack.Screen name="rachas" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.background,
  },
});
