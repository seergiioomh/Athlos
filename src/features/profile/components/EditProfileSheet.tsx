import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ChipGroup } from "@/components/ui/ChipGroup";
import { ChipMultiGroup } from "@/components/ui/ChipMultiGroup";
import {
  cardioOptions,
  dailyActivityOptions,
  equipmentOptions,
  experienceOptions,
  focusAreaOptions,
  goalOptions,
  sessionMinutesFromDb,
  sessionMinutesOptions,
  sessionMinutesToDb,
  sexOptions,
  sportDaysOptions,
  sportOptions,
  techniqueOptions,
  weekdayOptions,
} from "@/features/onboarding/schema";
import { HomeColors } from "@/features/home/home-theme";
import type { ProfileRow } from "@/types/database";

export type EditSection = "personal" | "training";

interface Props {
  section: EditSection | null;
  profile: ProfileRow;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (values: Partial<ProfileRow>) => void;
}

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

export function EditProfileSheet({
  section,
  profile,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<Partial<ProfileRow>>({});
  const [birthDate, setBirthDate] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);

  // Cada apertura parte de lo que hay guardado, no de la edición anterior.
  useEffect(() => {
    if (!section) return;

    setDraft({});
    setInvalid(null);
    setBirthDate(profile.birth_date ?? "");
  }, [section, profile.birth_date]);

  if (!section) return null;

  /**
   * El valor que se está editando: el del borrador si se ha tocado, y el
   * guardado si no.
   *
   * Se pregunta por la *presencia* de la clave, no por su valor. Con `??` un
   * null del borrador caía al valor del perfil, así que vaciar un campo era
   * indistinguible de no haberlo tocado: el control volvía solo a lo guardado y
   * parecía que no respondía al pulsarlo.
   */
  const value = <K extends keyof ProfileRow>(key: K): ProfileRow[K] =>
    (key in draft ? draft[key] : profile[key]) as ProfileRow[K];

  const set = <K extends keyof ProfileRow>(key: K, next: ProfileRow[K]) => {
    setDraft((current) => ({ ...current, [key]: next }));
    setInvalid(null);
  };

  const submit = () => {
    if (section === "personal") {
      const name = String(value("display_name") ?? "").trim();
      if (name.length < 2) return setInvalid("Escribe tu nombre.");

      // Formato ISO, que es el que espera la columna `date`.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return setInvalid("La fecha va como AAAA-MM-DD.");
      }

      const [year, month, day] = birthDate.split("-").map(Number);

      // En UTC a propósito: con hora local, un nacimiento a final de mes se
      // desplaza un día según el huso y la comprobación de abajo fallaría por
      // una fecha que sí existe.
      const born = new Date(Date.UTC(year, month - 1, day));

      /**
       * `new Date` no rechaza fechas imposibles: convierte el 31 de febrero en
       * el 3 de marzo sin decir nada. Al comparar los componentes de vuelta,
       * una fecha que no existe deja de coincidir consigo misma.
       *
       * Sin esto, Postgres la rechazaba más tarde con un error de fecha
       * inválida, que en pantalla se lee como un mensaje incomprensible.
       */
      const existe =
        born.getUTCFullYear() === year &&
        born.getUTCMonth() === month - 1 &&
        born.getUTCDate() === day;

      if (!existe) {
        return setInvalid("Esa fecha no existe. Comprueba el día y el mes.");
      }

      const years = (Date.now() - born.getTime()) / 31_557_600_000;

      if (!Number.isFinite(years) || years < 14 || years > 100) {
        return setInvalid("La fecha de nacimiento no cuadra.");
      }

      const height = Number(value("height_cm"));
      if (!Number.isFinite(height) || height < 100 || height > 250) {
        return setInvalid("La altura tiene que estar entre 100 y 250 cm.");
      }

      onSave({
        ...draft,
        display_name: name,
        birth_date: birthDate,
        height_cm: height,
      });

      return;
    }

    // `days_per_week` se deriva de los días marcados, y la columna exige entre
    // 1 y 7. Quedarse sin ninguno mandaría un 0 y rompería al guardar, así que
    // se corta aquí y con un mensaje que se entiende.
    if (
      "training_days" in draft &&
      (value("training_days") ?? []).length === 0
    ) {
      return setInvalid("Elige al menos un día de entrenamiento.");
    }

    // Mismo criterio que la bienvenida: un deporte sin días es media
    // respuesta, y al prompt le llega peor que no decir nada.
    const sport = value("sport");
    if (sport && sport !== "ninguno" && !value("sport_days")) {
      return setInvalid("Elige cuántos días a la semana practicas ese deporte.");
    }

    onSave({
      ...draft,
      // Una cadena vacía y un nulo significan lo mismo aquí, y guardar la
      // cadena obliga a comprobar las dos cosas en todos los sitios.
      ...("goal_notes" in draft
        ? { goal_notes: String(draft.goal_notes ?? "").trim() || null }
        : {}),
    });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.lift}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {section === "personal" ? "Datos personales" : "Entrenamiento"}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              hitSlop={10}
              style={styles.close}
              accessibilityLabel="Cerrar"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={18}
                color={HomeColors.text}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {section === "personal" ? (
              <>
                <Field label="Nombre">
                  <TextInput
                    style={styles.input}
                    value={String(value("display_name") ?? "")}
                    onChangeText={(text) => set("display_name", text)}
                    placeholder="Tu nombre"
                    placeholderTextColor={HomeColors.textTertiary}
                    autoCapitalize="words"
                    maxLength={40}
                  />
                </Field>

                <View style={styles.row}>
                  <Field label="Nacimiento" style={styles.flex}>
                    <TextInput
                      style={styles.input}
                      value={birthDate}
                      onChangeText={(text) => {
                        setBirthDate(text.replace(/[^0-9-]/g, ""));
                        setInvalid(null);
                      }}
                      placeholder="1998-05-12"
                      placeholderTextColor={HomeColors.textTertiary}
                      maxLength={10}
                    />
                  </Field>

                  <Field label="Altura (cm)" style={styles.flex}>
                    <TextInput
                      style={styles.input}
                      value={String(value("height_cm") ?? "")}
                      onChangeText={(text) =>
                        set("height_cm", Number(onlyDigits(text)) || null)
                      }
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </Field>
                </View>

                <Field label="Sexo">
                  <ChipGroup
                    options={sexOptions}
                    value={value("sex") ?? undefined}
                    onChange={(next) => set("sex", next)}
                  />
                </Field>

                <Text style={styles.note}>
                  El peso se registra desde Progreso, para que quede el
                  histórico.
                </Text>
              </>
            ) : (
              <>
                <Field label="Objetivo">
                  <ChipGroup
                    options={goalOptions}
                    value={value("goal") ?? undefined}
                    onChange={(next) => set("goal", next)}
                  />
                </Field>

                {/* La bienvenida se pasa una sola vez: sin esto, quien ya
                    tenía cuenta antes del rediseño no podría escribirlo
                    nunca. */}
                <Field label="Qué quieres conseguir">
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={String(value("goal_notes") ?? "")}
                    onChangeText={(text) => set("goal_notes", text)}
                    placeholder="Cuéntanos qué quieres conseguir"
                    placeholderTextColor={HomeColors.textTertiary}
                    multiline
                    maxLength={500}
                  />
                </Field>

                <Field label="Experiencia">
                  <ChipGroup
                    options={experienceOptions}
                    value={value("experience") ?? undefined}
                    onChange={(next) => set("experience", next)}
                  />
                </Field>

                <Field label="Técnica en los básicos">
                  <ChipGroup
                    options={techniqueOptions}
                    value={value("technique_level") ?? undefined}
                    onChange={(next) => set("technique_level", next)}
                  />
                </Field>

                <Field
                  label="Qué priorizar"
                  hint="Hasta cuatro grupos."
                >
                  <ChipMultiGroup
                    options={focusAreaOptions}
                    value={value("focus_areas") ?? []}
                    onChange={(next) => set("focus_areas", next.slice(0, 4))}
                  />
                </Field>

                <Field
                  label="Días que entrenas"
                  hint="Los días por semana se calculan de aquí."
                >
                  <ChipMultiGroup
                    options={weekdayOptions}
                    value={value("training_days") ?? []}
                    onChange={(next) => {
                      // Los dos campos tienen que contar lo mismo, así que el
                      // número se deriva y no se edita por separado.
                      set("training_days", next);
                      set("days_per_week", next.length);
                    }}
                  />
                </Field>

                <Field label="Minutos por sesión">
                  <ChipGroup
                    options={sessionMinutesOptions}
                    // 0 en pantalla, null en la base: hay que traducir en los
                    // dos sentidos o "Me da igual" no se guarda ni se relee.
                    value={sessionMinutesFromDb(value("session_minutes"))}
                    onChange={(next) =>
                      set("session_minutes", sessionMinutesToDb(next))
                    }
                  />
                </Field>

                <Field label="Otro deporte">
                  <ChipGroup
                    options={sportOptions}
                    value={value("sport") ?? undefined}
                    onChange={(next) => {
                      set("sport", next);
                      // Los días del deporte anterior no valen para el nuevo.
                      if (next === "ninguno") set("sport_days", null);
                    }}
                  />
                </Field>

                {Boolean(value("sport")) && value("sport") !== "ninguno" && (
                  <Field label="Días de deporte a la semana">
                    <ChipGroup
                      options={sportDaysOptions}
                      value={value("sport_days") ?? undefined}
                      onChange={(next) => set("sport_days", next)}
                    />
                  </Field>
                )}

                <Field label="Cardio">
                  <ChipGroup
                    options={cardioOptions}
                    value={value("cardio") ?? undefined}
                    onChange={(next) => set("cardio", next)}
                  />
                </Field>

                <Field label="Actividad diaria">
                  <ChipGroup
                    options={dailyActivityOptions}
                    value={value("daily_activity") ?? undefined}
                    onChange={(next) => set("daily_activity", next)}
                  />
                </Field>

                <Field label="Dónde entrenas">
                  <ChipGroup
                    options={equipmentOptions}
                    value={value("equipment") ?? undefined}
                    onChange={(next) => set("equipment", next)}
                  />
                </Field>

                <Field
                  label="Lesiones o limitaciones"
                  hint="El coach lo tiene en cuenta al elegir ejercicios."
                >
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={String(value("limitations") ?? "")}
                    onChangeText={(text) => set("limitations", text)}
                    placeholder="Cuéntanos si hay alguna zona que te moleste"
                    placeholderTextColor={HomeColors.textTertiary}
                    multiline
                    maxLength={300}
                  />
                </Field>

                <Field label="Ejercicios que no quieres hacer">
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={String(value("avoid_exercises") ?? "")}
                    onChangeText={(text) => set("avoid_exercises", text)}
                    placeholder="Ejercicios que prefieras evitar"
                    placeholderTextColor={HomeColors.textTertiary}
                    multiline
                    maxLength={300}
                  />
                </Field>
              </>
            )}

            {(invalid || error) && (
              <Text style={styles.error}>{invalid ?? error}</Text>
            )}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={submit}
            disabled={saving}
            style={[styles.save, saving && styles.saveDisabled]}
          >
            <Text style={styles.saveText}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  hint,
  style,
  children,
}: {
  label: string;
  hint?: string;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  lift: { flex: 1, justifyContent: "flex-end" },

  sheet: {
    maxHeight: "88%",
    backgroundColor: HomeColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: HomeColors.border,
  },

  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
  },

  header: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { fontSize: 22, fontWeight: "700", color: HomeColors.text },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { paddingBottom: 8 },

  field: { marginTop: 22, gap: 8 },
  row: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },

  label: { fontSize: 15, fontWeight: "700", color: HomeColors.text },
  hint: { marginTop: -4, fontSize: 12, color: HomeColors.textSecondary },

  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: HomeColors.surface,
    borderWidth: 1,
    borderColor: HomeColors.border,
    fontSize: 16,
    color: HomeColors.text,
  },

  textArea: { height: 88, paddingTop: 14, textAlignVertical: "top" },

  note: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
  },

  error: { marginTop: 18, fontSize: 13, color: HomeColors.errorText },

  save: {
    marginTop: 20,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  saveDisabled: { backgroundColor: HomeColors.primarySoft },

  saveText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },
});
