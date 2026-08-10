import { supabase } from "@/lib/supabase";
import type { TrainingCycleEntry, TrainingCycleRow } from "@/types/database";

/**
 * Normaliza el ciclo que viene de JSON externo. Los modelos no escriben en la
 * base directamente, pero sus propuestas y los borradores siguen siendo datos
 * no fiables al leerlos.
 */
export function sanearCiclo(value: unknown): TrainingCycleEntry[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();

  return value
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const raw = entry as Record<string, unknown>;
      const position = Number(raw.position);

      if (!Number.isInteger(position) || position < 1 || seen.has(position)) {
        return [];
      }
      seen.add(position);

      return [
        {
          position,
          label: typeof raw.label === "string" ? raw.label : "",
          focus: typeof raw.focus === "string" ? raw.focus : "",
        },
      ];
    })
    .sort((a, b) => a.position - b.position)
    // Un ciclo siempre se lee seguido: Día 1, Día 2, Día 3… No dejamos que
    // una posición que llegó mal convierta el próximo entrenamiento en Día 7.
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

function toCycle(data: TrainingCycleRow): TrainingCycleRow | null {
  const cycle = sanearCiclo(data.cycle);
  return cycle.length > 0 ? { ...data, cycle } : null;
}

async function fetchCycle(
  userId: string,
  status: "active" | "draft"
): Promise<TrainingCycleRow | null> {
  const { data, error } = await supabase
    .from("weekly_splits")
    .select("*")
    .eq("user_id", userId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toCycle(data as TrainingCycleRow) : null;
}

/** El ciclo aceptado, o null si el usuario todavía no ha aprobado uno. */
export function fetchActiveCycle(
  userId: string
): Promise<TrainingCycleRow | null> {
  return fetchCycle(userId, "active");
}

/** La propuesta pendiente de aceptar, si la hay. */
export function fetchDraftCycle(
  userId: string
): Promise<TrainingCycleRow | null> {
  return fetchCycle(userId, "draft");
}

export async function generateCycle(_userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("generate-split", {
    body: {},
  });

  if (error) throw error;
}

/**
 * Aprueba un borrador ya revisado por el usuario. La RPC archiva los anteriores
 * y activa este en la misma transacción.
 */
export async function approveCycle(cycleId: string): Promise<TrainingCycleRow> {
  const { data, error } = await supabase.rpc("approve_training_cycle", {
    p_cycle_id: cycleId,
  });

  if (error) throw error;
  const cycle = data ? toCycle(data as TrainingCycleRow) : null;
  if (!cycle) throw new Error("El ciclo aprobado no es válido");

  return cycle;
}

/**
 * Aplica una propuesta del coach: al pulsar Aplicar el usuario ya la ha
 * aprobado. Se guarda como borrador y se activa con la misma RPC que usa la
 * pantalla de bienvenida, sin dejar nunca un hueco sin ciclo vigente.
 */
export async function replaceCycle(
  userId: string,
  cycle: { name: string; rationale?: string; cycle: TrainingCycleEntry[] }
): Promise<void> {
  const sessions = sanearCiclo(cycle.cycle);

  if (sessions.length === 0) {
    throw new Error("El ciclo propuesto no tiene ninguna sesión reconocible");
  }

  const name = cycle.name?.trim();
  if (!name) throw new Error("El ciclo propuesto no tiene nombre");

  const { data, error } = await supabase
    .from("weekly_splits")
    .insert({
      user_id: userId,
      name,
      rationale: cycle.rationale?.trim() || null,
      cycle: sessions,
      status: "draft",
      active: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("No se pudo guardar el ciclo propuesto");

  await approveCycle(data.id);
}
