import { useQuery } from "@tanstack/react-query";

import { DEV_USER_ID } from "@/lib/supabase";
import {
  fetchRecentSessions,
  fetchStats,
  fetchWeightHistory,
} from "@/services/home";

export const homeKeys = {
  weight: (userId: string) => ["home", "weight", userId] as const,
  sessions: (userId: string) => ["home", "sessions", userId] as const,
  stats: (userId: string) => ["home", "stats", userId] as const,
};

export function useWeightHistory() {
  return useQuery({
    queryKey: homeKeys.weight(DEV_USER_ID!),
    queryFn: () => fetchWeightHistory(DEV_USER_ID!),
  });
}

export function useRecentSessions() {
  return useQuery({
    queryKey: homeKeys.sessions(DEV_USER_ID!),
    queryFn: () => fetchRecentSessions(DEV_USER_ID!),
  });
}

export function useTrainingStats() {
  return useQuery({
    queryKey: homeKeys.stats(DEV_USER_ID!),
    queryFn: () => fetchStats(DEV_USER_ID!),
  });
}
