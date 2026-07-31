// supabase-js construye URLs internamente y el runtime de React Native no
// implementa `URL` del todo, así que el polyfill va antes que el cliente.
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

// Ojo: `process.env.EXPO_PUBLIC_*` solo se sustituye con acceso por punto.
// Ni desestructuración ni corchetes — Expo no los reemplaza en el bundle.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copia .env.example como .env y rellénalo (después reinicia con `npx expo start --clear`)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Todavía no hay login: sin sesión que guardar, nos ahorramos el
    // almacenamiento y el refresco de tokens.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Usuario fijo mientras no exista autenticación. Cuando entre Auth, esto
 * se sustituye por el id de la sesión y se ejecuta la migración
 * 0004_drop_dev_access.sql.
 */
export const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID;

if (!DEV_USER_ID) {
  throw new Error(
    "Falta EXPO_PUBLIC_DEV_USER_ID. Créalo en Supabase (Authentication → Users) y ponlo en .env."
  );
}
