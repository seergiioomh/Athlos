import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

/**
 * Registra este móvil para recibir los recordatorios.
 *
 * Devuelve el token, o null si no se pudo: sin permiso, en un emulador, o en
 * una build sin `projectId`. Ninguno de esos casos es un error que merezca
 * romper la pantalla, así que se devuelve null y quien llama sigue.
 */
export async function registerForPush(userId: string): Promise<string | null> {
  // Los emuladores no tienen servicio de push. Pedir permiso allí solo saca
  // un diálogo que nunca puede concederse.
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== "granted") {
    const { status: pedido } = await Notifications.requestPermissionsAsync();
    status = pedido;
  }

  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  // La zona horaria viaja con el token porque es la única forma que tiene el
  // servidor de saber qué hora es para esta persona al decidir a quién avisa.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { error } = await supabase.from("push_tokens").upsert(
    {
      token,
      user_id: userId,
      platform: Platform.OS === "ios" ? "ios" : "android",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) throw error;

  if (timezone) {
    await supabase.from("profiles").update({ timezone }).eq("id", userId);
  }

  return token;
}

/** Suelta este móvil al cerrar sesión, para no avisar a quien ya no está. */
export async function unregisterPush(): Promise<void> {
  if (!Device.isDevice) return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  await supabase.from("push_tokens").delete().eq("token", token);
}
