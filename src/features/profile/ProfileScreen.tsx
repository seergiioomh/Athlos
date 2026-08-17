import {
  ArrowRight01Icon,
  Calendar03Icon,
  ChampionIcon,
  Dumbbell01Icon,
  RepeatIcon,
  Sword01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StreakBadge } from "@/components/ui/StreakBadge";
import { signOut, useSession } from "@/features/auth/session";
import { ACHIEVEMENTS, earnedSlugs } from "@/features/achievements/definitions";
import { useAchievementMetrics } from "@/features/achievements/queries";
import { useCurrentBattle } from "@/features/battles/queries";
import { HomeColors } from "@/features/home/home-theme";
import { EXP_PER_LEVEL, levelFromStats } from "@/features/home/level";
import { useProfile } from "@/features/onboarding/queries";
import { useProgressSummary, useStreak } from "@/features/progress/queries";

import type { ProfileRow } from "@/types/database";
import { errorMessage } from "@/utils/errors";
import {
  EditProfileSheet,
  type EditSection,
} from "./components/EditProfileSheet";
import { NotificationsCard } from "./components/NotificationsCard";
import { TrainingHistoryModal } from "./components/TrainingHistoryModal";
import {
  useActiveCycle,
  useDeleteAccount,
  useTrainingHistory,
  useUpdateProfile,
} from "./queries";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const memberSince = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

export function ProfileScreen() {
  const router = useRouter();
  const [editing, setEditing] = useState<EditSection | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  const { data: profile, isPending } = useProfile();
  const { data: summary } = useProgressSummary();
  const { data: streak, error: streakError } = useStreak();
  const { data: split } = useActiveCycle();
  const { data: achievementMetrics } = useAchievementMetrics();
  const { data: battle } = useCurrentBattle();
  const history = useTrainingHistory(historyVisible);
  const { email } = useSession();
  const update = useUpdateProfile();
  const remove = useDeleteAccount();

  /**
   * Dos confirmaciones, no una. Es un borrado irreversible que se pulsa desde
   * la misma pantalla que "Cerrar sesión", y los dos botones están a un dedo de
   * distancia: la segunda pregunta obliga a leer.
   */
  const confirmarBorrado = () => {
    Alert.alert(
      "Borrar cuenta",
      "Se borrará tu perfil y todo tu historial: entrenamientos, series, pesajes y conversaciones con el coach. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "¿Seguro?",
              "Esta es la última confirmación. Tus datos no se pueden recuperar después.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Borrar mi cuenta",
                  style: "destructive",
                  onPress: () =>
                    remove.mutate(undefined, {
                      onError: (caught) =>
                        Alert.alert(
                          "No se pudo borrar",
                          errorMessage(caught)
                        ),
                    }),
                },
              ]
            ),
        },
      ]
    );
  };

  if (isPending || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loading}>
          <ActivityIndicator color={HomeColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const level = levelFromStats({
    finishedSessions: summary?.finishedSessions ?? 0,
    completedSets: summary?.totalSets ?? 0,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {initialsOf(profile.display_name ?? "")}
            </Text>
          </View>

          <Text style={styles.name}>{profile.display_name ?? "Sin nombre"}</Text>

          {profile.onboarded_at && (
            <Text style={styles.since}>
              Contigo desde {memberSince(profile.onboarded_at)}
            </Text>
          )}
        </View>

        {/* --------------------------------------------------------- nivel */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelLabel}>Nivel ATHLOS</Text>
              <Text style={styles.levelValue}>Nivel {level.level}</Text>
            </View>

            <Text style={styles.levelPercent}>{level.percent}%</Text>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${level.percent}%` }]} />
          </View>

          <Text style={styles.levelHint}>
            {level.expToNext} EXP para el nivel {level.level + 1} · {EXP_PER_LEVEL} EXP
            por nivel
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={String(summary?.finishedSessions ?? 0)} label="Entrenos" />
          <Stat value={String(summary?.totalSets ?? 0)} label="Series" />
          <StreakBadge streak={streak ?? 0} size="card" />
        </View>

        {/* Un 0 puede ser una racha rota o una consulta que falló: sin
            decirlo son indistinguibles, así que solo aparece si falla. */}
        {streakError && (
          <Text style={styles.streakFailed}>
            No se pudo calcular la racha: {errorMessage(streakError)}
          </Text>
        )}

        {/* El reparto entero vive en su propia pantalla: aquí solo el acceso,
            para no convertir el perfil en un muro. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/weekly-plan")}
          style={[styles.planButton, styles.planButtonFirst]}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={RepeatIcon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Mi plan semanal</Text>
            <Text style={styles.planSubtitle}>
              {split ? split.name : "Sin diseñar todavía"}
            </Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Junto al plan y no en Progreso: aquí es donde ya vive el resto de
            la gamificación —nivel y racha—, y se buscan en el mismo sitio. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/logros")}
          style={styles.planButton}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={ChampionIcon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Logros</Text>
            <Text style={styles.planSubtitle}>
              {achievementMetrics
                ? `${earnedSlugs(achievementMetrics).length} de ${ACHIEVEMENTS.length} conseguidos`
                : "Momentos que solo se consiguen una vez"}
            </Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHistoryVisible(true)}
          style={styles.planButton}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={Calendar03Icon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Historia</Text>
            <Text style={styles.planSubtitle}>Tu constancia, día a día</Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/batallas")}
          style={styles.planButton}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={Sword01Icon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Batallas</Text>
            <Text style={styles.planSubtitle}>
              {battle?.status === "active"
                ? battle.name
                : battle?.status === "lobby"
                  ? `${battle.name} · sin empezar`
                  : "Compite con tus amigos por constancia"}
            </Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setEditing("personal")}
          style={styles.planButton}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={UserIcon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Datos personales</Text>
            <Text style={styles.planSubtitle}>Nombre, medidas y datos básicos</Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setEditing("training")}
          style={styles.planButton}
        >
          <View style={styles.planIcon}>
            <HugeiconsIcon
              icon={Dumbbell01Icon}
              size={19}
              color={HomeColors.primary}
              strokeWidth={2}
            />
          </View>

          <View style={styles.planText}>
            <Text style={styles.planTitle}>Entrenamiento</Text>
            <Text style={styles.planSubtitle}>
              Objetivo, experiencia y disponibilidad
            </Text>
          </View>

          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={HomeColors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* --------------------------------------------------------- avisos */}
        <Text style={styles.sectionAlone}>Avisos</Text>

        <NotificationsCard
          enabled={profile.notifications_enabled}
          hour={profile.reminder_hour}
          onToggle={(notifications_enabled) =>
            update.mutate({ notifications_enabled })
          }
          onChangeHour={(reminder_hour) => update.mutate({ reminder_hour })}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => signOut()}
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {email && <Text style={styles.email}>{email}</Text>}

        {/* Apagado y al final del todo: tiene que poder encontrarse, que es lo
            que exige Apple, sin competir con nada de lo de arriba. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={confirmarBorrado}
          disabled={remove.isPending}
          style={styles.deleteAccount}
        >
          {remove.isPending ? (
            <ActivityIndicator color={HomeColors.textTertiary} />
          ) : (
            <Text style={styles.deleteAccountText}>Borrar cuenta</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>
          ATHLOS {Constants.expoConfig?.version ?? ""}
        </Text>
      </ScrollView>

      <EditProfileSheet
        section={editing}
        profile={profile}
        saving={update.isPending}
        error={
          update.error ? errorMessage(update.error) : undefined
        }
        onClose={() => setEditing(null)}
        onSave={(values: Partial<ProfileRow>) =>
          update.mutate(values, { onSuccess: () => setEditing(null) })
        }
      />

      <TrainingHistoryModal
        visible={historyVisible}
        trainingDates={history.data ?? []}
        loading={history.isPending}
        error={history.error ? errorMessage(history.error) : undefined}
        onClose={() => setHistoryVisible(false)}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 132 },

  identity: { alignItems: "center", marginTop: 12 },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: HomeColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  initials: { fontSize: 30, fontWeight: "700", color: HomeColors.text },

  name: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: HomeColors.text,
  },

  since: { marginTop: 3, fontSize: 13, color: HomeColors.textSecondary },

  levelCard: {
    marginTop: 26,
    padding: 18,
    borderRadius: 24,
    backgroundColor: HomeColors.surface,
  },

  levelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  levelLabel: { fontSize: 12, color: HomeColors.textSecondary },

  levelValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "700",
    color: HomeColors.text,
  },

  levelPercent: {
    fontSize: 22,
    fontWeight: "800",
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },

  track: {
    marginTop: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: HomeColors.primarySoft,
    overflow: "hidden",
  },

  fill: { height: "100%", borderRadius: 4, backgroundColor: HomeColors.primary },

  levelHint: {
    marginTop: 10,
    fontSize: 11,
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  streakFailed: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.errorText,
  },

  stats: { marginTop: 12, flexDirection: "row", gap: 10 },

  stat: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: HomeColors.text,
    fontVariant: ["tabular-nums"],
  },

  statLabel: { marginTop: 3, fontSize: 11, color: HomeColors.textSecondary },

  sectionAlone: {
    marginTop: 30,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "700",
    color: HomeColors.text,
  },

  planButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: HomeColors.surface,
  },
  planButtonFirst: { marginTop: 24 },

  planIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  planText: { flex: 1 },

  planTitle: { fontSize: 16, fontWeight: "700", color: HomeColors.text },

  planSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: HomeColors.textSecondary,
  },

  signOut: {
    marginTop: 30,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surface,
  },

  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: HomeColors.errorText,
  },

  email: {
    marginTop: 12,
    fontSize: 12,
    color: HomeColors.textTertiary,
    textAlign: "center",
  },

  deleteAccount: {
    marginTop: 22,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteAccountText: {
    fontSize: 13,
    fontWeight: "600",
    color: HomeColors.textTertiary,
    textDecorationLine: "underline",
  },

  version: {
    marginTop: 28,
    fontSize: 11,
    color: HomeColors.textTertiary,
    textAlign: "center",
  },
});
