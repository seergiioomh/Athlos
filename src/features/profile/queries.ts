import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "@/features/onboarding/queries";
import { DEV_USER_ID } from "@/lib/supabase";
import { saveProfile } from "@/services/profile";
import { fetchActiveSplit, generateSplit } from "@/services/split";
import type { ProfileRow } from "@/types/database";

export const splitKeys = {
  active: (userId: string) => ["split", "active", userId] as const,
};

export function useActiveSplit() {
  return useQuery({
    queryKey: splitKeys.active(DEV_USER_ID!),
    queryFn: () => fetchActiveSplit(DEV_USER_ID!),
  });
}

export function useGenerateSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateSplit(DEV_USER_ID!),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: splitKeys.active(DEV_USER_ID!),
      });
    },
    // Diseñar el reparto cuesta una llamada a la IA: que reintente el usuario.
    retry: false,
  });
}

/**
 * Actualiza solo los campos enviados. Las columnas que no viajan en la
 * petición conservan su valor, así que se puede editar un bloque suelto.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<ProfileRow>) =>
      saveProfile(DEV_USER_ID!, values),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile(DEV_USER_ID!), profile);
    },
  });
}
