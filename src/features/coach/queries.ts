import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "@/features/onboarding/queries";
import { workoutKeys } from "@/features/workout/queries";
import { DEV_USER_ID } from "@/lib/supabase";
import {
  applyProposal,
  askCoach,
  CoachMessage,
  CoachProposal,
  fetchMessages,
  ProposalStatus,
  setProposalStatus,
} from "@/services/coach";

export const coachKeys = {
  messages: (userId: string) => ["coach", "messages", userId] as const,
};

export function useCoachMessages() {
  return useQuery({
    queryKey: coachKeys.messages(DEV_USER_ID!),
    queryFn: () => fetchMessages(DEV_USER_ID!),
  });
}

export function useAskCoach() {
  const queryClient = useQueryClient();
  const key = coachKeys.messages(DEV_USER_ID!);

  return useMutation({
    mutationFn: (message: string) => askCoach(DEV_USER_ID!, message),

    // Tu mensaje aparece al instante. Esperar a que responda la IA para
    // verlo escrito hace que el chat se sienta roto.
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<CoachMessage[]>(key) ?? [];

      const optimistic: CoachMessage = {
        id: `pendiente-${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
        proposal: null,
        proposalStatus: null,
      };

      queryClient.setQueryData<CoachMessage[]>(key, [optimistic, ...previous]);

      return { previous };
    },

    onError: (_error, _message, context) => {
      // Se cayó: quitamos el mensaje provisional para no dejar en pantalla
      // algo que el coach nunca recibió.
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },

    // Tanto si va bien como si falla, la verdad está en la base de datos.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },

    retry: false,
  });
}

/**
 * Aplica o descarta una propuesta. El estado del mensaje se marca después de
 * ejecutar el cambio: si la escritura falla, la propuesta sigue pendiente y
 * se puede reintentar.
 */
export function useResolveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      proposal,
      status,
    }: {
      messageId: string;
      proposal: CoachProposal;
      status: ProposalStatus;
    }) => {
      if (status === "aplicada") {
        await applyProposal(DEV_USER_ID!, proposal);
      }

      await setProposalStatus(messageId, status);
    },

    onSuccess: (_result, { proposal, status }) => {
      queryClient.invalidateQueries({
        queryKey: coachKeys.messages(DEV_USER_ID!),
      });

      if (status !== "aplicada") return;

      // El cambio se nota fuera del chat: el plan en Entrenar y Home, o el
      // perfil si lo que cambió fueron las limitaciones.
      if (proposal.kind === "actualizar_limitaciones") {
        queryClient.invalidateQueries({
          queryKey: profileKeys.profile(DEV_USER_ID!),
        });
      } else if (proposal.kind === "cambiar_reparto_semanal") {
        queryClient.invalidateQueries({ queryKey: ["split"] });
      } else {
        queryClient.invalidateQueries({
          queryKey: workoutKeys.plan(DEV_USER_ID!),
        });
      }
    },

    retry: false,
  });
}
