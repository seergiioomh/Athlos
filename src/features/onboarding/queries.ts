import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DEV_USER_ID } from "@/lib/supabase";
import { recordWeight } from "@/services/home";
import { fetchProfile, saveProfile } from "@/services/profile";
import { OnboardingValues, toProfileUpdate } from "./schema";

export const profileKeys = {
  profile: (userId: string) => ["profile", userId] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile(DEV_USER_ID!),
    queryFn: () => fetchProfile(DEV_USER_ID!),
    // El perfil decide qué pantalla se ve al arrancar: no queremos que
    // caduque y provoque un parpadeo hacia la bienvenida.
    staleTime: Infinity,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: OnboardingValues) => {
      const profile = await saveProfile(
        DEV_USER_ID!,
        toProfileUpdate(values)
      );

      // El peso de la bienvenida es el primer punto del histórico: sin esto
      // la gráfica de Home nacería vacía.
      await recordWeight(DEV_USER_ID!, values.weightKg);

      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile(DEV_USER_ID!), profile);
    },
  });
}
