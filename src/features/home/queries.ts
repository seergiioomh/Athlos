import { useQuery } from "@tanstack/react-query";

import {
  fetchRecentSessions,
  fetchStats,
  fetchWeightHistory,
} from "@/services/home";
import { useUserId } from "@/features/auth/session";

export const homeKeys = {
  weight: (userId: string) => ["home", "weight", userId] as const,
  sessions: (userId: string) => ["home", "sessions", userId] as const,
  stats: (userId: string) => ["home", "stats", userId] as const,
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

export function useTrainingStats() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: homeKeys.stats(userId),
    queryFn: () => fetchStats(userId),
  });
}
