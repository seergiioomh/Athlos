// supabase-js construye URLs internamente y el runtime de React Native no
// implementa `URL` del todo, así que el polyfill va antes que el cliente.
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Ojo: `process.env.EXPO_PUBLIC_*` solo se sustituye con acceso por punto.
// Ni desestructuración ni corchetes — Expo no los reemplaza en el bundle.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Una clave con formato imposible es tan inútil como no tener ninguna, pero se
 * nota mucho más tarde: la app arranca, pinta el acceso, y solo al registrarse
 * responde «Invalid API key» desde el servidor.
 *
 * Pasó de verdad, con el marcador `TU_CLAVE_ANON` subido a EAS tal cual.
 */
const looksLikeKey =
  supabaseAnonKey?.includes(".") ||
  supabaseAnonKey?.startsWith("sb_publishable_");

const missing = [
  !supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
  !supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  supabaseAnonKey && !looksLikeKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY (no es una clave válida)",
].filter(Boolean) as string[];

/**
 * Qué configuración falta, o null si está todo. La app lo enseña en pantalla
 * en lugar de lanzar una excepción.
 *
 * Antes esto era un `throw` en el cuerpo del módulo. En desarrollo se ve el
 * error en rojo y se entiende; en una app compilada, una excepción al importar
 * deja la pantalla de inicio congelada sin decir absolutamente nada, y no hay
 * consola donde mirar.
 */
export const configError =
  missing.length > 0
    ? `Falta configuración en la build: ${missing.join(", ")}`
    : null;

export const supabase = createClient(
  // Si falta la URL, el cliente se crea igual contra un destino inexistente:
  // lo que importa es que la app arranque y pueda contar el problema.
  supabaseUrl ?? "https://sin-configurar.invalid",
  supabaseAnonKey ?? "sin-configurar",
  {
    auth: {
      // La sesión vive en el almacenamiento del dispositivo: sin esto habría
      // que iniciar sesión en cada arranque.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Solo tiene sentido en web, donde el token vuelve en la URL.
      detectSessionInUrl: false,
    },
  }
);
