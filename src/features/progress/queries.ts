import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { homeKeys } from "@/features/home/queries";
import { useProfile } from "@/features/onboarding/queries";
import { recordWeight } from "@/services/home";
import {
  fetchExerciseProgress,
  fetchPeriodSummary,
  fetchProgressSummary,
  fetchStreak,
  fetchWeightRange,
} from "@/services/progress";
import { useUserId } from "@/features/auth/session";

export const progressKeys = {
  summary: (userId: string) => ["progress", "summary", userId] as const,
  exercises: (userId: string) => ["progress", "exercises", userId] as const,
  weight: (userId: string, days: number) =>
    ["progress", "weight", userId, days] as const,
  streak: (userId: string, maxGap: number) =>
    ["progress", "streak", userId, maxGap] as const,
  period: (userId: string, days: number) =>
    ["progress", "period", userId, days] as const,
};

/**
 * Descanso máximo que la racha aguanta entre entrenamientos, deducido de
 * los días por semana que declaró el usuario: quien entrena tres días a la
 * semana no puede tener el mismo margen que quien entrena seis.
 * El mínimo de dos evita castigar el día de descanso de quien entrena a diario.
 */
export const maxGapFor = (daysPerWeek: number | null) =>
  Math.max(2, Math.ceil(7 / (daysPerWeek || 3)));

export function useProgressSummary() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: progressKeys.summary(userId),
    queryFn: () => fetchProgressSummary(userId),
  });
}

export function useExerciseProgress() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: progressKeys.exercises(userId),
    queryFn: () => fetchExerciseProgress(userId),
  });
}

export function useStreak() {
  const userId = useUserId()!;

  const { data: profile } = useProfile();
  const maxGap = maxGapFor(profile?.days_per_week ?? null);

  return useQuery({
    queryKey: progressKeys.streak(userId, maxGap),
    queryFn: () => fetchStreak(userId, maxGap),
  });
}

export function usePeriodSummary(days: number) {
  const userId = useUserId()!;

  return useQuery({
    queryKey: progressKeys.period(userId, days),
    queryFn: () => fetchPeriodSummary(userId, days),
  });
}

export function useWeightRange(days: number) {
  const userId = useUserId()!;

  return useQuery({
    queryKey: progressKeys.weight(userId, days),
    queryFn: () => fetchWeightRange(userId, days),
  });
}

export function useRecordWeight() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weightKg: number) => recordWeight(userId, weightKg),
    onSuccess: () => {
      // El peso sale en dos sitios: aquí y en la tarjeta de Home.
      queryClient.invalidateQueries({ queryKey: ["progress", "weight"] });
      queryClient.invalidateQueries({
        queryKey: homeKeys.weight(userId),
      });
    },
  });
}
