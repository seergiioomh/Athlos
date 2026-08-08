import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchLatestPlan,
  generatePlan,
  openSession,
} from "@/services/workout";
import { useUserId } from "@/features/auth/session";

export const workoutKeys = {
  plan: (userId: string) => ["workout", "plan", userId] as const,
  session: (planId: string) => ["workout", "session", planId] as const,
};

export function useLatestPlan() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: workoutKeys.plan(userId),
    queryFn: () => fetchLatestPlan(userId),
  });
}

export function useGeneratePlan() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (focus?: string) => generatePlan(userId, focus),
    onSuccess: (plan) => {
      // Ya tenemos el plan: lo sembramos en la caché en vez de re-consultar.
      queryClient.setQueryData(workoutKeys.plan(userId), plan);
    },
    // Generar cuesta una llamada a la IA: si falla, que lo decida el usuario.
    retry: false,
  });
}

/**
 * Abre (o recupera) la sesión del plan. Se lanza sola al cargar el plan:
 * la sesión tiene que existir antes de que el usuario cierre su primera serie.
 */
export function useSession(planId: string | undefined) {
  const userId = useUserId()!;

  return useQuery({
    queryKey: workoutKeys.session(planId ?? "none"),
    queryFn: () => openSession(userId, planId!),
    enabled: Boolean(planId),
    // Abrir una sesión no es idempotente en el tiempo: no la reintentamos
    // al volver a la pantalla.
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
