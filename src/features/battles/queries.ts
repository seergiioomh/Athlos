import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useUserId } from "@/features/auth/session";
import {
  cancelBattle,
  createBattle,
  fetchBattleScore,
  fetchCurrentBattle,
  fetchParticipants,
  joinBattle,
  leaveBattle,
  previewBattle,
  startBattle,
} from "@/services/battles";

export const battleKeys = {
  current: (userId: string) => ["battles", "current", userId] as const,
  score: (battleId: string) => ["battles", "score", battleId] as const,
  participants: (battleId: string) =>
    ["battles", "participants", battleId] as const,
};

export function useCurrentBattle() {
  const userId = useUserId()!;

  return useQuery({
    queryKey: battleKeys.current(userId),
    queryFn: fetchCurrentBattle,
  });
}

export function useBattleScore(battleId: string | undefined) {
  return useQuery({
    queryKey: battleKeys.score(battleId ?? "ninguna"),
    queryFn: () => fetchBattleScore(battleId!),
    enabled: Boolean(battleId),
    // El marcador cambia cuando alguien entrena, no cuando miras: se refresca
    // al volver a la pantalla en lugar de sondear cada pocos segundos.
    staleTime: 30_000,
  });
}

export function useBattleParticipants(battleId: string | undefined) {
  return useQuery({
    queryKey: battleKeys.participants(battleId ?? "ninguna"),
    queryFn: () => fetchParticipants(battleId!),
    enabled: Boolean(battleId),
  });
}

/** Todo lo que cambia de batalla invalida lo mismo, así que va junto. */
function useBattleMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
    },
    retry: false,
  });
}

export function useCreateBattle() {
  return useBattleMutation(
    ({ name, durationDays }: { name: string; durationDays: number }) =>
      createBattle(name, durationDays)
  );
}

export function useStartBattle() {
  return useBattleMutation((battleId: string) => startBattle(battleId));
}

export function useJoinBattle() {
  return useBattleMutation((code: string) => joinBattle(code));
}

export function useLeaveBattle() {
  return useBattleMutation((battleId: string) => leaveBattle(battleId));
}

export function useCancelBattle() {
  return useBattleMutation((battleId: string) => cancelBattle(battleId));
}

/**
 * Previsualizar no es una consulta con clave: se pide a mano al escribir un
 * código, y guardarlo en caché solo serviría para enseñar datos viejos de una
 * batalla que quizá ya empezó.
 */
export function usePreviewBattle() {
  return useMutation({
    mutationFn: (code: string) => previewBattle(code),
    retry: false,
  });
}
