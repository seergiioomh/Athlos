import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  discardPlan,
  fetchLatestPlan,
  generatePlan,
  importSharedWorkout,
  openSession,
  planHasLoggedSets,
} from "@/services/workout";
import type { SharedWorkout } from "./share";
import { useUserId } from "@/features/auth/session";

export const workoutKeys = {
  plan: (userId: string) => ["workout", "plan", userId] as const,
  session: (planId: string) => ["workout", "session", planId] as const,
  started: (planId: string) => ["workout", "started", planId] as const,
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

/** Acepta un entrenamiento que llegó por enlace y lo guarda como propio. */
export function useImportSharedWorkout() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shared: SharedWorkout) =>
      importSharedWorkout(userId, shared),
    onSuccess: () => {
      // No toca `workoutKeys.plan`: el plan del ciclo sigue siendo el mismo y
      // volver a leerlo solo serviría para confirmar que no ha cambiado.
      queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    retry: false,
  });
}

/**
 * Si el plan ya tiene series registradas. Sirve para decidir si se puede
 * ofrecer rehacerlo: un entrenamiento empezado es historial y no se toca.
 */
export function usePlanStarted(planId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.started(planId ?? "sin-plan"),
    queryFn: () => planHasLoggedSets(planId!),
    enabled: Boolean(planId),
  });
}

/**
 * Tira el plan pendiente y pide uno nuevo. Para cuando algo lo deja obsoleto
 * —un cambio de reparto, por ejemplo— antes de haberlo empezado.
 */
export function useRegeneratePlan() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      await discardPlan(userId, planId);
      return generatePlan(userId);
    },
    onSuccess: (plan) => {
      queryClient.setQueryData(workoutKeys.plan(userId), plan);
      queryClient.invalidateQueries({ queryKey: workoutKeys.started(plan.id) });
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
