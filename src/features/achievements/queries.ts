import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useUserId } from "@/features/auth/session";
import {
  fetchAchievementMetrics,
  fetchUnlocked,
  unlockAchievements,
} from "@/services/achievements";
import { earnedSlugs } from "./definitions";

export const achievementKeys = {
  metrics: (userId: string) => ["achievements", "metrics", userId] as const,
  unlocked: (userId: string) => ["achievements", "unlocked", userId] as const,
};

export function useAchievementMetrics() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: achievementKeys.metrics(userId),
    queryFn: () => fetchAchievementMetrics(userId),
  });
}

export function useUnlockedAchievements() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: achievementKeys.unlocked(userId),
    queryFn: () => fetchUnlocked(userId),
  });
}

/**
 * Comprueba las métricas y guarda lo que se haya ganado. Devuelve los slugs
 * nuevos, o vacío si no hay ninguno.
 *
 * Se llama al terminar un entrenamiento, que es cuando cambian casi todas las
 * métricas. No hace falta llamarlo al abrir la pantalla de logros: si no has
 * entrenado, nada ha podido cambiar.
 */
export function useSyncAchievements() {
  const userId = useUserId()!;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const metrics = await fetchAchievementMetrics(userId);

      return unlockAchievements(userId, earnedSlugs(metrics));
    },
    onSuccess: (nuevos) => {
      // Solo si hay algo nuevo: invalidar sin motivo obliga a la pantalla de
      // logros a recargar cada vez que se termina un entrenamiento.
      if (nuevos.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["achievements"] });
      }
    },
    // Un logro que no se guarda no puede romper el fin del entrenamiento.
    retry: false,
  });
}
