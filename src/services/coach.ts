import { supabase } from "@/lib/supabase";
import { replaceCycle, sanearCiclo } from "@/services/split";
import type { TrainingCycleEntry } from "@/types/database";

/**
 * Cambios que el coach puede proponer. El modelo nunca los ejecuta: los
 * devuelve, se guardan con el mensaje, y esta capa los aplica cuando el
 * usuario pulsa aplicar. Los nombres coinciden con las herramientas
 * declaradas en la Edge Function.
 */
export type CoachProposal =
  | {
      kind: "ajustar_ejercicio";
      plan_exercise_id: string;
      sets?: number;
      target_reps?: number;
      target_weight_kg?: number;
      rest_seconds?: number;
      motivo: string;
    }
  | {
      kind: "sustituir_ejercicio";
      plan_exercise_id: string;
      exercise_slug: string;
      motivo: string;
    }
  | {
      kind: "actualizar_limitaciones";
      limitations: string;
      motivo: string;
    }
  | {
      kind: "cambiar_reparto_semanal";
      name: string;
      rationale?: string;
      cycle: TrainingCycleEntry[];
      motivo: string;
    };

export type ProposalStatus = "pendiente" | "aplicada" | "descartada";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  proposal: CoachProposal | null;
  proposalStatus: ProposalStatus | null;
}

/**
 * Días que se conserva la conversación. Tiene que coincidir con el valor que
 * usa la Edge Function al limpiar; si la app pidiera más de lo que se guarda,
 * enseñaría huecos.
 */
export const RETENTION_DAYS = 5;

/**
 * La conversación, del mensaje más reciente al más antiguo. Ese orden es el
 * que espera la lista invertida de la pantalla.
 */
export async function fetchMessages(
  userId: string,
  limit = 100
): Promise<CoachMessage[]> {
  const since = new Date();
  since.setDate(since.getDate() - RETENTION_DAYS);

  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, role, content, created_at, proposal, proposal_status")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const proposal = sanearPropuesta(row.proposal);

    return {
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
      proposal,
      // Sin propuesta utilizable no hay nada que aplicar ni descartar, y el
      // estado sobra: dejarlo pintaría la tarjeta de una propuesta que no está.
      proposalStatus: proposal
        ? ((row.proposal_status as ProposalStatus | null) ?? null)
        : null,
    };
  });
}

/**
 * Deja pasar solo las propuestas que la pantalla sabe pintar.
 *
 * Lo que hay en `coach_messages.proposal` es JSON suelto que escribió un
 * modelo hace días: aunque la herramienta declare `days` como obligatorio, una
 * fila vieja o una respuesta a medias puede no traerlo. Y la tarjeta hace
 * `proposal.days.map(...)`, así que una sola fila mala tumbaba el chat entero
 * —no fallaba la carga, fallaba el render— y dejaba la pantalla inaccesible
 * sin forma de borrar el mensaje culpable desde la app.
 *
 * Ante la duda se descarta la propuesta y se conserva el mensaje: se pierde un
 * botón, no la conversación.
 */
function sanearPropuesta(value: unknown): CoachProposal | null {
  if (!value || typeof value !== "object") return null;

  const proposal = value as Partial<CoachProposal> & { kind?: string };

  if (proposal.kind === "cambiar_reparto_semanal") {
    // `sanearCiclo` ya descarta lo irreconocible y renumera: si no queda nada,
    // la propuesta no se puede ni pintar ni aplicar.
    const sesiones = sanearCiclo((proposal as { cycle?: unknown }).cycle);

    return sesiones.length > 0
      ? ({ ...proposal, cycle: sesiones } as CoachProposal)
      : null;
  }

  return proposal.kind ? (proposal as CoachProposal) : null;
}

export async function askCoach(
  userId: string,
  message: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body: { message },
  });

  if (error) throw error;

  const reply = (data as { reply?: string })?.reply;
  if (!reply) throw new Error("El coach no respondió");

  return reply;
}

/**
 * Ejecuta la propuesta con los permisos del propio usuario. La Edge Function
 * usa la clave de servicio y se salta RLS; esto no, a propósito: si el cambio
 * no lo puede hacer el usuario, no debe hacerse.
 */
export async function applyProposal(
  userId: string,
  proposal: CoachProposal
): Promise<void> {
  if (proposal.kind === "ajustar_ejercicio") {
    const changes: Record<string, number> = {};

    if (proposal.sets !== undefined) changes.sets = proposal.sets;
    if (proposal.target_reps !== undefined) {
      changes.target_reps = proposal.target_reps;
    }
    if (proposal.target_weight_kg !== undefined) {
      changes.target_weight_kg = proposal.target_weight_kg;
    }
    if (proposal.rest_seconds !== undefined) {
      changes.rest_seconds = proposal.rest_seconds;
    }

    if (Object.keys(changes).length === 0) {
      throw new Error("La propuesta no cambia nada");
    }

    const { error } = await supabase
      .from("plan_exercises")
      .update(changes)
      .eq("id", proposal.plan_exercise_id);

    if (error) throw error;
    return;
  }

  if (proposal.kind === "sustituir_ejercicio") {
    // El slug se resuelve aquí y no en la propuesta: si el ejercicio no
    // existe en el catálogo, el cambio falla en vez de dejar una fila rota.
    const { data: exercise, error: lookupError } = await supabase
      .from("exercises")
      .select("id")
      .eq("slug", proposal.exercise_slug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!exercise) {
      throw new Error(`El ejercicio "${proposal.exercise_slug}" no existe`);
    }

    const { error } = await supabase
      .from("plan_exercises")
      .update({ exercise_id: exercise.id })
      .eq("id", proposal.plan_exercise_id);

    if (error) throw error;
    return;
  }

  if (proposal.kind === "cambiar_reparto_semanal") {
    // `replaceCycle` valida y aprueba en una sola operación: al pulsar Aplicar
    // el usuario ya ha dado su visto bueno, así que no hay borrador que revisar.
    await replaceCycle(userId, {
      name: proposal.name,
      rationale: proposal.rationale,
      cycle: proposal.cycle,
    });

    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ limitations: proposal.limitations })
    .eq("id", userId);

  if (error) throw error;
}

export async function setProposalStatus(
  messageId: string,
  status: ProposalStatus
): Promise<void> {
  const { error } = await supabase
    .from("coach_messages")
    .update({ proposal_status: status })
    .eq("id", messageId);

  if (error) throw error;
}
