import { useQuery } from "@tanstack/react-query";

import {
  fetchCompletedWorkout,
  fetchRecentSessions,
  fetchStats,
  fetchWeightHistory,
} from "@/services/home";
import { useUserId } from "@/features/auth/session";

export const homeKeys = {
  weight: (userId: string) => ["home", "weight", userId] as const,
  sessions: (userId: string) => ["home", "sessions", userId] as const,
  stats: (userId: string) => ["home", "stats", userId] as const,
  completedWorkout: (sessionId: string) => ["home", "completed-workout", sessionId] as const,
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

/** Lo registrado en un día concreto de "Esta semana", al tocarlo. */
export function useCompletedWorkout(sessionId: string | null) {
  return useQuery({
    queryKey: homeKeys.completedWorkout(sessionId ?? "ninguna"),
    queryFn: () => fetchCompletedWorkout(sessionId!),
    enabled: Boolean(sessionId),
  });
}

export function useTrainingStats() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: homeKeys.stats(userId),
    queryFn: () => fetchStats(userId),
  });
}
