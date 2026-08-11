import {
  CheckmarkCircle02Icon,
  Dumbbell01Icon,
  Edit02Icon,
  FireIcon,
  FlashIcon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";
import { CoachInsightCard } from "@/features/home/components/CoachInsightCard";
import { useRecentSessions } from "@/features/home/queries";
import { useProfile } from "@/features/onboarding/queries";
import { useStreak } from "@/features/progress/queries";
import { errorMessage } from "@/utils/errors";
import {
  useSaveSessionFeedback,
} from "./queries";

interface Props {
  sessionId: string;
  onOpenCoach: () => void;
  onContinue: () => void;
}

export function WorkoutCompletionScreen({
  sessionId,
  onOpenCoach,
  onContinue,
}: Props) {
  const { data: profile } = useProfile();
  const { data: recentSessions } = useRecentSessions();
  const { data: streak } = useStreak();
  const feedback = useSaveSessionFeedback();
  const [energy, setEnergy] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const select = (value: number, setter: (value: number) => void) => {
    setter(value);
    Haptics.selectionAsync();
  };

  const saveAndContinue = async () => {
    try {
      await feedback.mutateAsync({
        sessionId,
        // La base conserva la escala histórica de 1 a 10; la pantalla usa
        // cinco pasos más fáciles de responder al acabar de entrenar.
        energyDuring: energy ? energy * 2 : null,
        rating: rating ? rating * 2 : null,
        notes: notes.trim() || null,
      });
      onContinue();
    } catch {
      // El error de la mutación se muestra junto al botón para no perder el texto.
    }
  };

  const name = profile?.display_name?.split(" ")[0] || "";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.hero}>
        <View style={styles.successRing}>
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={88}
            color={HomeColors.primary}
            strokeWidth={1.5}
          />
        </View>
        <Text selectable style={styles.title}>¡Entrenamiento completado!</Text>
        <Text selectable style={styles.subtitle}>
          {name ? `Gran trabajo, ${name}.` : "Gran trabajo."} Sigue sumando.
        </Text>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakIcon}>
          <HugeiconsIcon icon={FireIcon} size={31} color={HomeColors.primary} strokeWidth={2} />
        </View>
        <View style={styles.streakCopy}>
          <Text style={styles.streakLabel}>Racha actual</Text>
          <Text selectable style={styles.streakValue}>
            {streak ?? 1} {(streak ?? 1) === 1 ? "entreno" : "entrenos"}
          </Text>
          <Text style={styles.streakHint}>La constancia se nota.</Text>
        </View>
      </View>

      <SectionCard icon={Message01Icon} color={HomeColors.primary} title="¿Cómo ha ido?">
        <Text style={styles.sectionDescription}>
          Tu feedback ayuda a adaptar el próximo entrenamiento.
        </Text>
        <RatingRow
          icon={FlashIcon}
          color={HomeColors.primary}
          label="¿Cómo ha sido tu energía?"
          low="Baja"
          high="Alta"
          value={energy}
          onChange={(value) => select(value, setEnergy)}
        />
        <View style={styles.separator} />
        <RatingRow
          icon={Dumbbell01Icon}
          color={HomeColors.orange}
          label="¿Qué tal tu rendimiento?"
          low="Flojo"
          high="Genial"
          value={rating}
          onChange={(value) => select(value, setRating)}
        />
        <View style={styles.separator} />
        <View style={styles.notesTitle}>
          <HugeiconsIcon icon={Edit02Icon} size={20} color={HomeColors.purple} strokeWidth={2} />
          <Text style={styles.notesLabel}>Comentarios sobre el entrenamiento</Text>
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Escribe tus sensaciones, qué destacarías o qué mejorarías…"
          placeholderTextColor={HomeColors.textTertiary}
          multiline
          maxLength={200}
          textAlignVertical="top"
          style={styles.notesInput}
          accessibilityLabel="Comentarios sobre el entrenamiento"
        />
        <Text style={styles.count}>{notes.length}/200</Text>
      </SectionCard>

      <CoachInsightCard
        sessionsThisWeek={recentSessions?.filter((session) => session.finishedAt).length ?? 0}
        targetDays={profile?.days_per_week ?? null}
        onPress={onOpenCoach}
      />

      {feedback.error && (
        <Text selectable style={styles.error}>
          No pudimos guardar tu feedback: {errorMessage(feedback.error)}
        </Text>
      )}
      <TouchableOpacity
        activeOpacity={0.86}
        disabled={feedback.isPending}
        onPress={saveAndContinue}
        style={[styles.action, feedback.isPending && styles.actionBusy]}
      >
        {feedback.isPending ? (
          <ActivityIndicator color={HomeColors.onPrimary} />
        ) : (
          <Text style={styles.actionText}>Guardar y continuar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionCard({ icon, color, title, children }: {
  icon: typeof Dumbbell01Icon;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return <View style={styles.card}>
    <View style={styles.cardTitle}>
      <HugeiconsIcon icon={icon} size={25} color={color} strokeWidth={2} />
      <Text selectable style={styles.cardHeading}>{title}</Text>
    </View>
    {children}
  </View>;
}

function RatingRow({ icon, color, label, low, high, value, onChange }: {
  icon: typeof FlashIcon;
  color: string;
  label: string;
  low: string;
  high: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return <View style={styles.ratingRow}>
    <HugeiconsIcon icon={icon} size={23} color={color} strokeWidth={2} />
    <View style={styles.ratingContent}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingControls}>
        <Text style={styles.endpoint}>{low}</Text>
        {[1, 2, 3, 4, 5].map((item) => (
          <TouchableOpacity
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === item }}
            accessibilityLabel={`${label}: ${item} de 5`}
            activeOpacity={0.8}
            onPress={() => onChange(item)}
            style={[styles.ratingButton, value === item && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[styles.ratingValue, value === item && { color: HomeColors.onPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.endpoint}>{high}</Text>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 132, gap: 16 },
  hero: { alignItems: "center", paddingTop: 6, paddingBottom: 8 },
  successRing: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", backgroundColor: HomeColors.primarySoft, boxShadow: "0 0 26px rgba(198, 244, 50, 0.22)" },
  title: { marginTop: 16, fontSize: 27, fontWeight: "800", letterSpacing: -0.6, color: HomeColors.text, textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 16, color: HomeColors.textSecondary, textAlign: "center" },
  streakCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22, backgroundColor: HomeColors.surface, borderCurve: "continuous" },
  streakIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: HomeColors.primarySoft },
  streakCopy: { flex: 1 },
  streakLabel: { fontSize: 13, color: HomeColors.textSecondary },
  streakValue: { marginTop: 2, fontSize: 22, fontWeight: "800", color: HomeColors.text, fontVariant: ["tabular-nums"] },
  streakHint: { marginTop: 2, fontSize: 13, color: HomeColors.primary },
  card: { padding: 18, borderRadius: 24, backgroundColor: HomeColors.surface, borderCurve: "continuous" },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardHeading: { flex: 1, fontSize: 21, fontWeight: "700", color: HomeColors.text },
  sectionDescription: { marginTop: 7, fontSize: 14, lineHeight: 20, color: HomeColors.textSecondary },
  ratingRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 18 },
  ratingContent: { flex: 1, minWidth: 0 },
  ratingLabel: { fontSize: 15, fontWeight: "600", color: HomeColors.text },
  ratingControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 12 },
  endpoint: { fontSize: 11, color: HomeColors.textSecondary },
  ratingButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: HomeColors.border, backgroundColor: HomeColors.surfaceElevated },
  ratingValue: { fontSize: 14, fontWeight: "700", color: HomeColors.text },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: HomeColors.border },
  notesTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  notesLabel: { fontSize: 15, fontWeight: "600", color: HomeColors.text },
  notesInput: { height: 112, marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: HomeColors.border, color: HomeColors.text, backgroundColor: HomeColors.surfaceElevated, fontSize: 14, lineHeight: 20 },
  count: { marginTop: 6, fontSize: 12, color: HomeColors.textTertiary, textAlign: "right", fontVariant: ["tabular-nums"] },
  error: { fontSize: 13, lineHeight: 19, color: HomeColors.errorText, textAlign: "center" },
  action: { height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: HomeColors.primary, borderCurve: "continuous" },
  actionBusy: { backgroundColor: HomeColors.primaryMuted },
  actionText: { fontSize: 17, fontWeight: "800", color: HomeColors.onPrimary },
});
