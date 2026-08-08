import { supabase } from "@/lib/supabase";
import type { WeeklySplitDay, WeeklySplitRow } from "@/types/database";

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

  return data;
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
  const { error: deactivateError } = await supabase
    .from("weekly_splits")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("active", true);

  if (deactivateError) throw deactivateError;

  const { error } = await supabase.from("weekly_splits").insert({
    user_id: userId,
    name: split.name,
    rationale: split.rationale ?? null,
    days: split.days,
  });

  if (error) throw error;
}
