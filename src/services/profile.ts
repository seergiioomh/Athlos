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
