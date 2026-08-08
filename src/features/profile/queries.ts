import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "@/features/onboarding/queries";
import { deleteAccount, saveProfile } from "@/services/profile";
import { fetchActiveSplit, generateSplit } from "@/services/split";
import type { ProfileRow } from "@/types/database";
import { useUserId } from "@/features/auth/session";

export const splitKeys = {
  active: (userId: string) => ["split", "active", userId] as const,
};

export function useActiveSplit() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: splitKeys.active(userId),
    queryFn: () => fetchActiveSplit(userId),
  });
}

export function useGenerateSplit() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateSplit(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: splitKeys.active(userId),
      });
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
