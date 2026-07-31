import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { homeKeys } from "@/features/home/queries";
import { useProfile } from "@/features/onboarding/queries";
import { DEV_USER_ID } from "@/lib/supabase";
import { recordWeight } from "@/services/home";
import {
  fetchExerciseProgress,
  fetchProgressSummary,
  fetchStreak,
  fetchWeightRange,
} from "@/services/progress";

export const progressKeys = {
  summary: (userId: string) => ["progress", "summary", userId] as const,
  exercises: (userId: string) => ["progress", "exercises", userId] as const,
  weight: (userId: string, days: number) =>
    ["progress", "weight", userId, days] as const,
  streak: (userId: string, maxGap: number) =>
    ["progress", "streak", userId, maxGap] as const,
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
  return useQuery({
    queryKey: progressKeys.summary(DEV_USER_ID!),
    queryFn: () => fetchProgressSummary(DEV_USER_ID!),
  });
}

export function useExerciseProgress() {
  return useQuery({
    queryKey: progressKeys.exercises(DEV_USER_ID!),
    queryFn: () => fetchExerciseProgress(DEV_USER_ID!),
  });
}

export function useStreak() {
  const { data: profile } = useProfile();
  const maxGap = maxGapFor(profile?.days_per_week ?? null);

  return useQuery({
    queryKey: progressKeys.streak(DEV_USER_ID!, maxGap),
    queryFn: () => fetchStreak(DEV_USER_ID!, maxGap),
  });
}

export function useWeightRange(days: number) {
  return useQuery({
    queryKey: progressKeys.weight(DEV_USER_ID!, days),
    queryFn: () => fetchWeightRange(DEV_USER_ID!, days),
  });
}

export function useRecordWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weightKg: number) => recordWeight(DEV_USER_ID!, weightKg),
    onSuccess: () => {
      // El peso sale en dos sitios: aquí y en la tarjeta de Home.
      queryClient.invalidateQueries({ queryKey: ["progress", "weight"] });
      queryClient.invalidateQueries({
        queryKey: homeKeys.weight(DEV_USER_ID!),
      });
    },
  });
}
