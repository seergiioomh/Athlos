import { supabase } from "@/lib/supabase";
import type { WeeklySplitDay, WeeklySplitRow } from "@/types/database";

/** Orden canónico de la semana. Manda sobre el orden en que llegue el array. */
const SEMANA = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

/**
 * Normaliza el nombre de un día a su código de tres letras, o null si no hay
 * forma de reconocerlo.
 *
 * Acepta lo que escriba el modelo: "lun", "Lunes", "MIÉRCOLES". Quitar los
 * acentos y cortar a tres letras cubre los siete nombres en español, porque
 * ninguno colisiona en sus tres primeras letras.
 */
function normalizarDia(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const corto = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Escrito con escapes y no con los caracteres combinantes literales: en el
    // código fuente son invisibles y cualquier editor puede comérselos.
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 3);

  return (SEMANA as readonly string[]).includes(corto) ? corto : null;
}

/**
 * Deja los días del reparto en un estado que la pantalla siempre sabe pintar.
 *
 * `weekly_splits.days` es jsonb que escribió un modelo, así que se trata como
 * entrada externa: un `.map` sobre algo que no es un array no deja un hueco en
 * blanco, tumba la pantalla entera. Y la del reparto no tiene salida propia:
 * si revienta al montar, no hay botón que pulsar para arreglarlo.
 *
 * Se descarta lo irreconocible en vez de fallar, se quitan los días repetidos
 * —dos entradas del mismo día romperían las claves de React— y se ordena por
 * semana para que la tarjeta se lea siempre de lunes a domingo.
 */
export function sanearDias(value: unknown): WeeklySplitDay[] {
  if (!Array.isArray(value)) return [];

  const vistos = new Set<string>();

  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const raw = entry as Record<string, unknown>;
      const day = normalizarDia(raw.day);

      if (!day || vistos.has(day)) return [];
      vistos.add(day);

      return [
        {
          day,
          label: typeof raw.label === "string" ? raw.label : "",
          focus: typeof raw.focus === "string" ? raw.focus : "",
        } as WeeklySplitDay,
      ];
    })
    .sort((a, b) => SEMANA.indexOf(a.day as never) - SEMANA.indexOf(b.day as never));
}

/** El reparto vigente, o null si el entrenador aún no ha diseñado ninguno. */
export async function fetchActiveSplit(
  userId: string
): Promise<WeeklySplitRow | null> {
  const { data, error } = await supabase
    .from("weekly_splits")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const days = sanearDias(data.days);

  // Un reparto sin un solo día reconocible no es un reparto: se devuelve null
  // para que la pantalla ofrezca diseñar uno en vez de enseñar una tarjeta
  // vacía que no explica nada.
  if (days.length === 0) return null;

  return { ...data, days };
}

export async function generateSplit(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("generate-split", {
    body: {},
  });

  if (error) throw error;
}

/**
 * Sustituye el reparto vigente. El anterior no se borra: pasa a inactivo, así
 * queda el rastro de cómo ha ido evolucionando la estructura.
 */
export async function replaceSplit(
  userId: string,
  split: { name: string; rationale?: string; days: WeeklySplitDay[] }
): Promise<void> {
  const dias = sanearDias(split.days);

  // Se valida ANTES de desactivar el vigente. Al revés, un reparto nuevo mal
  // formado dejaría al usuario sin ninguno: perdería el que tenía y no habría
  // nada que lo sustituyera.
  if (dias.length === 0) {
    throw new Error("El reparto propuesto no tiene ningún día reconocible");
  }

  const nombre = split.name?.trim();

  if (!nombre) {
    throw new Error("El reparto propuesto no tiene nombre");
  }

  const { error: deactivateError } = await supabase
    .from("weekly_splits")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("active", true);

  if (deactivateError) throw deactivateError;

  const { error } = await supabase.from("weekly_splits").insert({
    user_id: userId,
    name: nombre,
    rationale: split.rationale?.trim() || null,
    // Se sanea también al escribir, no solo al leer: si algo llega mal formado
    // desde el coach, mejor que no entre en la base que arreglarlo en cada
    // lectura durante el resto de la vida de la fila.
    days: dias,
  });

  if (error) throw error;
}
