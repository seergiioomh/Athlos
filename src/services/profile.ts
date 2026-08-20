import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

/**
 * El perfil del usuario, o null si la fila todavía no existe. Que no exista
 * es un estado válido: significa que aún no ha pasado por la bienvenida.
 */
export async function fetchProfile(
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Borra la cuenta y todo lo que cuelga de ella.
 *
 * La función de Postgres decide a quién borra mirando `auth.uid()`, no un
 * parámetro: desde aquí no hay forma de pedir el borrado de otro.
 *
 * El cierre de sesión va después y a propósito. El token sigue siendo válido
 * hasta que caduque aunque el usuario ya no exista, y sin cerrarlo la app se
 * quedaría con una sesión que apunta a la nada.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_account");

  if (error) throw error;

  await supabase.auth.signOut();
}

export async function saveProfile(
  userId: string,
  values: Record<string, unknown>
): Promise<ProfileRow> {
  // upsert y no update: en producción la fila la creará el trigger de auth,
  // pero con el usuario de desarrollo puede no existir todavía.
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...values })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

/**
 * Guarda la zona horaria de este móvil en el perfil.
 *
 * Es el único dato del perfil que el servidor no puede deducir por su cuenta y
 * sin él no sabe qué hora —ni qué día— es para esta persona. Lo necesitan los
 * recordatorios (`users_to_remind`) y el freno de un entrenamiento por día
 * (`generate-workout`).
 *
 * Vivía dentro de `registerForPush`, y ahí llegaba tarde o no llegaba: esa
 * función sale antes de escribirlo si el usuario rechaza los avisos, así que
 * todo el que dijo que no tenía la columna vacía. Ahora se guarda al entrar,
 * tenga avisos o no.
 *
 * Que falle no importa: el servidor cae a `Europe/Madrid` y como mucho el
 * cálculo se desplaza unas horas. No es motivo para romper el arranque.
 */
export async function syncTimezone(userId: string): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!timezone) return;

  await supabase.from("profiles").update({ timezone }).eq("id", userId);
}

/**
 * Días locales en los que el usuario terminó al menos un entrenamiento.
 *
 * Se devuelven las fechas porque el calendario necesita pintar cada casilla;
 * no trae información de ejercicios, series ni pesos.
 */
export async function fetchTrainingHistory(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("finished_at")
    .eq("user_id", userId)
    .not("finished_at", "is", null);

  if (error) throw error;

  return [
    ...new Set(
      (data ?? []).flatMap((session) => {
        if (!session.finished_at) return [];

        const date = new Date(session.finished_at);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");

        return [`${date.getFullYear()}-${month}-${day}`];
      })
    ),
  ];
}
