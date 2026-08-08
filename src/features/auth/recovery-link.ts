import * as Linking from "expo-linking";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@/utils/auth-errors";
import { beginRecovery, cancelRecovery, setRecoveryError } from "./session";

/**
 * La ruta a la que apunta el enlace del correo.
 *
 * `createURL` resuelve el esquema según dónde se ejecute la app, así que sirve
 * igual en la build de desarrollo y en la de producción. Hay que darla de alta
 * en Authentication → URL Configuration del panel de Supabase.
 */
export const recoveryRedirectUrl = () =>
  Linking.createURL("reset-password");

/**
 * Destino del enlace del correo de confirmación de cuenta.
 *
 * Sin pasarle esto a `signUp`, Supabase manda al Site URL del proyecto
 * —`http://localhost:3000` por defecto—, que desde un móvil no abre nada y deja
 * la cuenta sin confirmar para siempre.
 */
export const confirmRedirectUrl = () => Linking.createURL("confirm");

/**
 * Supabase devuelve los datos de dos formas según el flujo configurado:
 * en el fragmento (`#access_token=…`, flujo implícito) o como parámetro
 * (`?code=…`, PKCE). Se aceptan las dos para no depender de un ajuste del
 * panel que puede cambiar sin avisar.
 */
function parseParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  for (const trozo of [url.split("#")[1], url.split("#")[0].split("?")[1]]) {
    if (!trozo) continue;

    for (const par of trozo.split("&")) {
      const [clave, valor] = par.split("=");
      if (clave) params[clave] = decodeURIComponent(valor ?? "");
    }
  }

  return params;
}

async function handleUrl(url: string | null) {
  if (!url) return;

  const params = parseParams(url);

  const esRecuperacion =
    params.type === "recovery" || url.includes("reset-password");

  const esConfirmacion = params.type === "signup" || url.includes("confirm");

  if (!esRecuperacion && !esConfirmacion) return;

  /**
   * Solo la recuperación levanta la marca. `setSession` dispara
   * `onAuthStateChange`, y en recuperación el layout daría al usuario por
   * dentro antes de que haya elegido contraseña.
   *
   * En la confirmación no hace falta: la sesión que abre el enlace ya es
   * legítima y lo que toca es justamente dejarle entrar.
   */
  if (esRecuperacion) beginRecovery();

  // Enlace caducado o ya usado. Supabase lo devuelve como parámetros de error
  // en lugar de fallar la petición.
  if (params.error_code || params.error) {
    const caducado = /expired/i.test(params.error_code ?? "");

    setRecoveryError(
      esConfirmacion
        ? caducado
          ? "El enlace de confirmación ha caducado. Vuelve a registrarte para recibir otro."
          : "El enlace de confirmación no es válido."
        : caducado
          ? "El enlace ha caducado. Pide otro correo."
          : "El enlace no es válido. Pide otro correo."
    );

    return;
  }

  try {
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
    } else if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) throw error;
    } else {
      setRecoveryError("El enlace no trae los datos necesarios. Pide otro.");
      return;
    }
  } catch (caught) {
    // Sin sesión válida no hay nada que recuperar: se sale del modo para que
    // el usuario vuelva a tener la pantalla de acceso normal.
    if (esRecuperacion) await cancelRecovery();
    setRecoveryError(authErrorMessage(caught));
  }
}

/**
 * Escucha el enlace del correo. Se llama una sola vez, desde el layout raíz.
 *
 * Hacen falta las dos vías: `getInitialURL` cubre la app cerrada, que es el
 * caso normal —el usuario abre el correo y la app arranca—, y el escuchador
 * cubre la app ya abierta en segundo plano.
 */
export function useRecoveryLink() {
  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));

    return () => sub.remove();
  }, []);
}
