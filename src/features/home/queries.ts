import { useQuery } from "@tanstack/react-query";

import {
  fetchRecentSessions,
  fetchStats,
  fetchWeightHistory,
} from "@/services/home";
import { fetchPlanById } from "@/services/workout";
import { useUserId } from "@/features/auth/session";

export const homeKeys = {
  weight: (userId: string) => ["home", "weight", userId] as const,
  sessions: (userId: string) => ["home", "sessions", userId] as const,
  stats: (userId: string) => ["home", "stats", userId] as const,
  dayPlan: (planId: string) => ["home", "day-plan", planId] as const,
};

export function useWeightHistory() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: homeKeys.weight(userId),
    queryFn: () => fetchWeightHistory(userId),
  });
}

export function useRecentSessions() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: homeKeys.sessions(userId),
    queryFn: () => fetchRecentSessions(userId),
  });
}

/** El plan de un día concreto de "Esta semana", al tocarlo. */
export function useDayPlan(planId: string | null) {
  return useQuery({
    queryKey: homeKeys.dayPlan(planId ?? "ninguno"),
    queryFn: () => fetchPlanById(planId!),
    enabled: Boolean(planId),
  });
}

export function useTrainingStats() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: homeKeys.stats(userId),
    queryFn: () => fetchStats(userId),
  });
}
