import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import type { Battle } from "@/services/battles";
import { errorMessage } from "@/utils/errors";
import { initial } from "../format";
import {
  useBattleParticipants,
  useCancelBattle,
  useLeaveBattle,
  useStartBattle,
} from "../queries";

interface Props {
  battle: Battle;
  meId: string;
}

export function BattleLobby({ battle, meId }: Props) {
  const {
    data: participants,
    isPending: participantsPending,
    error: participantsError,
  } = useBattleParticipants(battle.id);
  const start = useStartBattle();
  const cancel = useCancelBattle();
  const leave = useLeaveBattle();

  const soyElCreador = battle.createdBy === meId;
  const cuantos = participants?.length ?? 0;

  const compartir = async () => {
    try {
      await Share.share({
        message: `Te reto en ATHLOS. Entra en "${battle.name}" con el código ${battle.code}.`,
      });
    } catch {
      // Cancelar el menú lanza en iOS. No hay nada que contar.
    }
  };

  const error = participantsError ?? start.error ?? cancel.error ?? leave.error;

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Código para entrar</Text>
        <Text selectable style={styles.code}>
          {battle.code}
        </Text>

        {/* Solo compartir: el menú del sistema ya trae "Copiar", y una
            dependencia nativa nueva para un botón de copiar obligaría a
            recompilar la app entera. El código además es seleccionable. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={compartir}
          style={styles.codeButton}
        >
          <Text style={styles.codeButtonText}>Compartir código</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>
        {cuantos} {cuantos === 1 ? "participante" : "participantes"}
      </Text>

      {participantsPending ? (
        <ActivityIndicator style={styles.participantsLoading} color={HomeColors.primary} />
      ) : (
      <View style={styles.list}>
        {(participants ?? []).map((person) => (
          <View key={person.userId} style={styles.person}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial(person.displayName)}</Text>
            </View>
            <Text style={styles.personName}>
              {person.userId === meId ? "Tú" : person.displayName}
            </Text>
            {person.userId === battle.createdBy && (
                <Text style={styles.host}>creador</Text>
            )}
          </View>
        ))}
      </View>
      )}

      {soyElCreador ? (
        <>
          {/* Se avisa antes de pulsar, no después: al empezar se cierra la
              entrada y quien llegue tarde ya no puede unirse. */}
          <Text style={styles.warning}>
            Al empezar se cierra la entrada. Asegúrate de que están todos.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={start.isPending}
            onPress={() => start.mutate(battle.id)}
            style={styles.primary}
          >
            {start.isPending ? (
              <ActivityIndicator color={HomeColors.onPrimary} />
            ) : (
              <Text style={styles.primaryText}>Empezar batalla</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={cancel.isPending}
            onPress={() => cancel.mutate(battle.id)}
            style={styles.ghost}
          >
            <Text style={styles.ghostText}>Cancelar batalla</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.warning}>
            Esperando a que {"quien la creó"} le dé a empezar.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={leave.isPending}
            onPress={() => leave.mutate(battle.id)}
            style={[styles.leave, leave.isPending && styles.leaveOff]}
          >
            <Text style={styles.leaveText}>Salir</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{errorMessage(error)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  codeCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
  },

  codeLabel: { fontSize: 12, color: HomeColors.textSecondary },

  code: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 6,
    color: HomeColors.primary,
  },

  codeButton: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: HomeColors.surfaceElevated,
  },

  codeButtonText: { fontSize: 13, fontWeight: "700", color: HomeColors.text },

  section: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: HomeColors.textTertiary,
  },

  list: { gap: 8 },
  participantsLoading: { marginVertical: 10 },

  person: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: HomeColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: { fontSize: 13, fontWeight: "700", color: HomeColors.textSecondary },

  personName: { flex: 1, fontSize: 15, fontWeight: "600", color: HomeColors.text },
  host: { fontSize: 11, fontWeight: "600", color: HomeColors.textTertiary },

  warning: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
    textAlign: "center",
  },

  primary: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  primaryText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },

  ghost: { height: 46, alignItems: "center", justifyContent: "center" },
  ghostText: { fontSize: 14, fontWeight: "600", color: HomeColors.textSecondary },

  leave: {
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: HomeColors.error,
    backgroundColor: HomeColors.errorSoft,
  },
  leaveOff: { opacity: 0.5 },
  leaveText: { fontSize: 14, fontWeight: "700", color: HomeColors.errorText },

  error: { fontSize: 12, color: HomeColors.errorText, textAlign: "center" },
});
