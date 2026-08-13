import { supabase } from "@/lib/supabase";

export type BattleStatus = "lobby" | "active" | "finished" | "cancelled";

export interface Battle {
  id: string;
  code: string;
  name: string;
  status: BattleStatus;
  durationDays: number;
  startedAt: string | null;
  endsAt: string | null;
  winnerId: string | null;
  createdBy: string;
}

export interface BattleScore {
  userId: string;
  displayName: string;
  sessionsDone: number;
  targetSessions: number;
  adherencePoints: number;
  prPoints: number;
  activeDayPoints: number;
  totalPoints: number;
}

export interface BattlePreview {
  name: string;
  creator: string;
  participants: number;
  durationDays: number;
  status: BattleStatus;
}

const BATTLE_SELECT =
  "id, code, name, status, duration_days, started_at, ends_at, winner_id, created_by";

const toDomain = (row: Record<string, unknown>): Battle => ({
  id: String(row.id),
  code: String(row.code),
  name: String(row.name),
  status: row.status as BattleStatus,
  durationDays: Number(row.duration_days),
  startedAt: (row.started_at as string) ?? null,
  endsAt: (row.ends_at as string) ?? null,
  winnerId: (row.winner_id as string) ?? null,
  createdBy: String(row.created_by),
});

/**
 * La batalla que le importa al usuario ahora mismo.
 *
 * No hace falta filtrar por usuario: RLS solo deja ver las batallas en las que
 * participas. Se pide la más reciente sin filtrar por estado para que la
 * pantalla pueda enseñar también el resultado de la que acaba de terminar; es
 * ella quien decide si una terminada hace semanas ya no interesa.
 */
export async function fetchCurrentBattle(): Promise<Battle | null> {
  const { data, error } = await supabase
    .from("battles")
    .select(BATTLE_SELECT)
    .in("status", ["lobby", "active", "finished"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toDomain(data);
}

export async function fetchBattleScore(battleId: string): Promise<BattleScore[]> {
  const { data, error } = await supabase.rpc("battle_score", {
    p_battle: battleId,
  });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: String(row.user_id),
    displayName: String(row.display_name),
    sessionsDone: Number(row.sessions_done),
    targetSessions: Number(row.target_sessions),
    adherencePoints: Number(row.adherence_points),
    prPoints: Number(row.pr_points),
    activeDayPoints: Number(row.active_day_points),
    totalPoints: Number(row.total_points),
  }));
}

/** Quién compite en una sala de espera, para enseñarlo antes de empezar. */
export async function fetchParticipants(
  battleId: string
): Promise<{ userId: string; displayName: string }[]> {
  const { data, error } = await supabase
    .rpc("battle_lobby_participants", { p_battle: battleId });

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: String(row.user_id),
    displayName: (row.display_name as string | null) ?? "Alguien",
  }));
}

export async function createBattle(
  name: string,
  durationDays: number
): Promise<string> {
  const { data, error } = await supabase.rpc("create_battle", {
    p_name: name,
    p_duration_days: durationDays,
  });

  if (error) throw error;

  return String(data);
}

export async function startBattle(battleId: string): Promise<void> {
  const { error } = await supabase.rpc("start_battle", { p_battle: battleId });
  if (error) throw error;
}

export async function previewBattle(code: string): Promise<BattlePreview | null> {
  const { data, error } = await supabase
    .rpc("battle_preview", { p_code: code })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;

  return {
    name: String(row.name),
    creator: String(row.creator),
    participants: Number(row.participants),
    durationDays: Number(row.duration_days),
    status: row.status as BattleStatus,
  };
}

export async function joinBattle(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_battle", { p_code: code });

  if (error) throw error;

  return String(data);
}

export async function leaveBattle(battleId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_battle", { p_battle: battleId });
  if (error) throw error;
}

export async function cancelBattle(battleId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_battle", { p_battle: battleId });
  if (error) throw error;
}
