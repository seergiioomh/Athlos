import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "@/features/onboarding/queries";
import {
  deleteAccount,
  fetchTrainingHistory,
  saveProfile,
} from "@/services/profile";
import {
  approveCycle,
  fetchActiveCycle,
  fetchDraftCycle,
  generateCycle,
} from "@/services/split";
import type { ProfileRow } from "@/types/database";
import { useUserId } from "@/features/auth/session";

export const splitKeys = {
  active: (userId: string) => ["split", "active", userId] as const,
  draft: (userId: string) => ["split", "draft", userId] as const,
};

export const profileHistoryKeys = {
  training: (userId: string) => ["profile", "training-history", userId] as const,
};

/** El historial solo se carga al abrirlo: no pesa en la entrada al perfil. */
export function useTrainingHistory(enabled: boolean) {
  const userId = useUserId()!;

  return useQuery({
    queryKey: profileHistoryKeys.training(userId),
    queryFn: () => fetchTrainingHistory(userId),
    enabled,
  });
}

/** El ciclo que el usuario ya aprobó. */
export function useActiveCycle() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: splitKeys.active(userId),
    queryFn: () => fetchActiveCycle(userId),
  });
}

/** La propuesta pendiente de aprobar, si la hay. */
export function useDraftCycle() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: splitKeys.draft(userId),
    queryFn: () => fetchDraftCycle(userId),
  });
}

/** Acepta el borrador. A partir de aquí manda él. */
export function useApproveCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cycleId: string) => approveCycle(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split"] });
    },
    retry: false,
  });
}

/** Pide un ciclo nuevo. Se guarda como borrador: no manda hasta aprobarlo. */
export function useGenerateCycle() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateCycle(userId),
    onSuccess: () => {
      // La función crea un borrador, no un ciclo activo. Invalidar ambos evita
      // que la pantalla conserve en caché el «no hay ciclo» anterior.
      queryClient.invalidateQueries({ queryKey: ["split"] });
    },
    // Diseñar el reparto cuesta una llamada a la IA: que reintente el usuario.
    retry: false,
  });
}

/**
 * Borra la cuenta. Al terminar se vacía la caché entera: los datos del usuario
 * ya no existen, y dejarlos en memoria haría que la siguiente cuenta que
 * entrase en este móvil viera un instante de los del anterior.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
    },
    // Borrar no es idempotente desde fuera: si falla, que lo decida el usuario.
    retry: false,
  });
}

/**
 * Actualiza solo los campos enviados. Las columnas que no viajan en la
 * petición conservan su valor, así que se puede editar un bloque suelto.
 */
export function useUpdateProfile() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<ProfileRow>) =>
      saveProfile(userId, values),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile(userId), profile);
    },
  });
}
