import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { useUserId } from "@/features/auth/session";
import { registerForPush } from "@/services/notifications";

/**
 * Con la app abierta, una notificación entrante se enseña igual. Sin esto
 * llegaría en silencio y el usuario no vería nada, que es lo contrario de lo
 * que espera quien acaba de recibir un aviso.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registra el móvil al entrar y abre la pantalla correcta al tocar un aviso.
 *
 * El registro se intenta una vez por sesión: pedirlo en cada render sacaría
 * el diálogo de permiso una y otra vez.
 */
export function usePushNotifications() {
  const userId = useUserId();
  const router = useRouter();
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || registered.current === userId) return;

    registered.current = userId;

    // Que falle el registro no puede tumbar la app: sin permiso, sin red o en
    // un emulador se sigue igual, solo que sin avisos.
    registerForPush(userId).catch((fallo) =>
      console.warn("No se pudo registrar para avisos", fallo)
    );
  }, [userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (respuesta) => {
        const screen = respuesta.notification.request.content.data?.screen;

        if (screen === "workout") router.push("/(tabs)/workout");
        if (screen === "battles") router.push("/batallas");
      }
    );

    return () => sub.remove();
  }, [router]);
}
