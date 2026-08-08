import { useEffect } from "react";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

type Status = "loading" | "signed-in" | "signed-out";

interface SessionState {
  status: Status;
  userId: string | null;
  email: string | null;
  set: (state: Partial<SessionState>) => void;
}

const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  userId: null,
  email: null,
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
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  return { needsConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
