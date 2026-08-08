import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { recordWeight } from "@/services/home";
import { fetchProfile, saveProfile } from "@/services/profile";
import { OnboardingValues, toProfileUpdate } from "./schema";
import { useUserId } from "@/features/auth/session";

export const profileKeys = {
  profile: (userId: string) => ["profile", userId] as const,
};

export function useProfile() {
  // Este es el único que se llama desde el layout raíz, también sin sesión,
  // así que aquí el id puede ser null y la consulta se queda apagada.
  const userId = useUserId();

  return useQuery({
    queryKey: profileKeys.profile(userId ?? "sin-sesion"),
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    // El perfil decide qué pantalla se ve al arrancar: no queremos que
    // caduque y provoque un parpadeo hacia la bienvenida.
    staleTime: Infinity,
  });
}

export function useSaveProfile() {
  const userId = useUserId()!;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: OnboardingValues) => {
      const profile = await saveProfile(
        userId,
        toProfileUpdate(values)
      );

      // El peso de la bienvenida es el primer punto del histórico: sin esto
      // la gráfica de Home nacería vacía.
      await recordWeight(userId, values.weightKg);

      return profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile(userId), profile);
    },
  });
}
