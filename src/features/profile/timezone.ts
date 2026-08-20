import { useEffect, useRef } from "react";

import { useUserId } from "@/features/auth/session";
import { syncTimezone } from "@/services/profile";

/**
 * Guarda la zona horaria del móvil en el perfil, una vez por sesión.
 *
 * Va suelto y no colgando de los avisos push a propósito: el servidor necesita
 * saber qué día es para esta persona aunque no le mande ni una notificación.
 * Sin esto, quien rechaza los avisos se queda sin zona horaria y el freno de
 * "un entrenamiento por día" calcula el corte con el huso equivocado.
 *
 * Se reintenta al cambiar de usuario porque dos cuentas en el mismo móvil
 * comparten huso, pero no fila de perfil.
 */
export function useTimezoneSync() {
  const userId = useUserId();
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || synced.current === userId) return;

    synced.current = userId;

    // Sin red, o con la fila del perfil todavía sin crear, no pasa nada: el
    // servidor cae a `Europe/Madrid` y se vuelve a intentar al abrir la app.
    syncTimezone(userId).catch((fallo) =>
      console.warn("No se pudo guardar la zona horaria", fallo)
    );
  }, [userId]);
}
