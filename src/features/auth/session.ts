import { useEffect } from "react";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-in" | "signed-out";

interface SessionState {
  status: Status;
  userId: string | null;
  email: string | null;
  /**
   * Verdadero mientras se está recuperando la contraseña.
   *
   * `verifyOtp` abre sesión en cuanto el código es correcto, pero el usuario
   * todavía no ha elegido contraseña nueva. Sin esta marca, el layout raíz lo
   * daría por dentro y se llevaría por delante la pantalla a medio proceso.
   */
  recovering: boolean;
  /** Fallo al abrir el enlace del correo, para poder contarlo en pantalla. */
  recoveryError: string | null;
  set: (state: Partial<SessionState>) => void;
}

const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  email: null,
  recovering: false,
  recoveryError: null,
  set,
}));

/**
 * Engancha la sesión de Supabase al estado de la app. Se llama una sola vez,
 * desde el layout raíz.
 *
 * `onAuthStateChange` cubre el ciclo entero —entrar, salir, renovar el token—
 * así que no hace falta refrescar nada a mano en el resto de la app.
 */
export function useInitSession() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useSessionStore.getState().set({
        status: data.session ? "signed-in" : "signed-out",
        userId: data.session?.user.id ?? null,
        email: data.session?.user.email ?? null,
      });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      useSessionStore.getState().set({
        status: session ? "signed-in" : "signed-out",
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
      });
    });

    return () => data.subscription.unsubscribe();
  }, []);
}

export const useSession = () => useSessionStore();

/**
 * El id del usuario con sesión iniciada. Las consultas solo se lanzan cuando
 * existe, así que dentro de la app siempre hay uno.
 */
export const useUserId = () => useSessionStore((state) => state.userId);

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Devuelve si la cuenta quedó lista para entrar. Con la confirmación por
 * correo activada en Supabase, el registro no abre sesión: hay que verificar
 * el correo primero, y la app tiene que decirlo en vez de quedarse quieta.
 */
export async function signUp(
  email: string,
  password: string,
  redirectTo: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Sin esto el enlace del correo apunta al Site URL del proyecto, que por
    // defecto es http://localhost:3000: en un móvil no lleva a ninguna parte y
    // la cuenta se queda sin confirmar para siempre.
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;

  return { needsConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Verdadero mientras dura la recuperación de contraseña. */
export const useRecovering = () =>
  useSessionStore((state) => state.recovering);

/** El fallo del enlace, si lo hubo. */
export const useRecoveryError = () =>
  useSessionStore((state) => state.recoveryError);

export function setRecoveryError(message: string | null) {
  useSessionStore.getState().set({ recoveryError: message });
}

/**
 * Primer paso: pide a Supabase que mande el correo con el enlace.
 *
 * `redirectTo` es la pieza clave. La plantilla del correo no se puede editar
 * sin SMTP propio, pero el destino del enlace lo decide el cliente, así que la
 * plantilla de serie sirve tal cual: apunta a donde le digamos.
 *
 * La URL tiene que estar dada de alta en Authentication → URL Configuration
 * del panel; si no, Supabase la rechaza y manda al usuario al sitio por
 * defecto.
 *
 * No se le dice al usuario si el correo existe o no. Contestar lo mismo en los
 * dos casos evita que cualquiera pueda averiguar quién tiene cuenta probando
 * direcciones.
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Un correo inexistente no es un fallo que deba verse: se ignora a
  // propósito. El resto sí (sin red, límite de envíos).
  if (error && !/user not found/i.test(error.message)) throw error;
}

/**
 * Segundo paso: el usuario ya ha vuelto del correo y elige contraseña.
 *
 * Cuando esto se ejecuta la sesión ya está abierta —la abrió el enlace—, así
 * que basta con actualizar el usuario.
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Abandona la recuperación. El enlace ya dejó la sesión abierta con la
 * contraseña vieja, así que se cierra: si no, quien se arrepiente a mitad se
 * encuentra dentro de la app sin haber elegido contraseña nueva.
 */
export async function cancelRecovery() {
  // Cerrar sesión antes de bajar la marca, nunca al revés: en el orden
  // contrario el layout ve una sesión válida durante un instante y mete al
  // usuario en la app de un parpadeo.
  if (useSessionStore.getState().status === "signed-in") {
    await supabase.auth.signOut();
  }

  useSessionStore.getState().set({ recovering: false, recoveryError: null });
}

/** Levanta la marca en cuanto llega el enlace, antes de abrir la sesión. */
export function beginRecovery() {
  useSessionStore.getState().set({ recovering: true, recoveryError: null });
}

/** La baja cuando la contraseña ya se ha cambiado y la sesión es legítima. */
export function endRecovery() {
  useSessionStore.getState().set({ recovering: false, recoveryError: null });
}
