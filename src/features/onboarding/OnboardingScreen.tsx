import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChipGroup } from "@/components/ui/ChipGroup";
import { ChipMultiGroup } from "@/components/ui/ChipMultiGroup";
import { HomeColors } from "@/features/home/home-theme";
import { errorMessage } from "@/utils/errors";
import { useSaveProfile } from "./queries";
import {
  cardioOptions,
  dailyActivityOptions,
  equipmentOptions,
  experienceOptions,
  focusAreaOptions,
  goalOptions,
  onboardingSchema,
  sessionMinutesOptions,
  sexOptions,
  sleepOptions,
  techniqueOptions,
  weekdayOptions,
} from "./schema";

// El formulario se maneja como texto y opciones sueltas; zod se encarga de
// convertir y validar de golpe al enviar.
type Draft = Record<string, unknown>;

/**
 * Cuatro pasos en vez de una pantalla larga. Cada uno agrupa preguntas que se
 * responden con la misma cabeza, y `fields` dice qué validar antes de avanzar:
 * así los errores salen en el paso donde está el campo, no al final.
 */
const STEPS = [
  {
    title: "Sobre ti",
    subtitle: "Lo básico para calibrar cargas y progresión.",
    fields: [
      "displayName",
      "birthDay",
      "birthMonth",
      "birthYear",
      "sex",
      "heightCm",
      "weightKg",
      "targetWeightKg",
    ],
  },
  {
    title: "Tu objetivo",
    subtitle: "Qué buscas y de dónde partes.",
    fields: ["goal", "focusAreas", "experience", "techniqueLevel"],
  },
  {
    title: "Tu disponibilidad",
    subtitle: "Cuándo, cuánto tiempo y con qué material.",
    fields: ["trainingDays", "sessionMinutes", "equipment", "cardio"],
  },
  {
    title: "Descanso y salud",
    subtitle: "Lo que condiciona cuánto puedes asimilar.",
    fields: ["dailyActivity", "sleepHours", "limitations", "avoidExercises"],
  },
] as const;

export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ focusAreas: [], trainingDays: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useSaveProfile();
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const set = (field: string, value: unknown) => {
    setDraft((state) => ({ ...state, [field]: value }));

    // El error desaparece en cuanto tocas el campo: mantenerlo mientras
    // corriges es ruido.
    setErrors((state) => {
      if (!state[field]) return state;

      const { [field]: _removed, ...rest } = state;
      return rest;
    });
  };

  /** Valida todo, pero solo enseña los errores de los campos de este paso. */
  const validateStep = () => {
    const result = onboardingSchema.safeParse(draft);

    if (result.success) return result.data;

    const relevant: Record<string, string> = {};

    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);

      if (
        (current.fields as readonly string[]).includes(field) &&
        !relevant[field]
      ) {
        relevant[field] = issue.message;
      }
    }

    setErrors(relevant);

    return Object.keys(relevant).length === 0 ? null : undefined;
  };

  const advance = () => {
    const outcome = validateStep();

    // `undefined` significa que hay errores en este paso; `null`, que los hay
    // en otro, así que se puede seguir.
    if (outcome === undefined) return;

    if (!last) {
      setStep(step + 1);
      return;
    }

    const result = onboardingSchema.safeParse(draft);

    if (!result.success) {
      // Solo puede pasar si algo de un paso anterior quedó suelto: volvemos
      // al primero que falle en vez de bloquear el botón sin explicación.
      const failing = String(result.error.issues[0].path[0]);
      const index = STEPS.findIndex((item) =>
        (item.fields as readonly string[]).includes(failing)
      );

      setErrors({ [failing]: result.error.issues[0].message });
      if (index >= 0) setStep(index);

      return;
    }

    save.mutate(result.data);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.progress}>
          {STEPS.map((item, index) => (
            <View
              key={item.title}
              style={[styles.segment, index <= step && styles.segmentDone]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.eyebrow}>
            {step === 0 ? "BIENVENIDO A ATHLOS" : `PASO ${step + 1} DE ${STEPS.length}`}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>

          {step === 0 && (
            <>
              <Field label="¿Cómo te llamas?" error={errors.displayName}>
                <TextInput
                  style={[styles.input, errors.displayName && styles.inputError]}
                  value={String(draft.displayName ?? "")}
                  onChangeText={(value) => set("displayName", value)}
                  placeholder="Sergio"
                  placeholderTextColor={HomeColors.textTertiary}
                  autoCapitalize="words"
                  maxLength={40}
                />
              </Field>

              <Field
                label="Fecha de nacimiento"
                error={
                  errors.birthDay ?? errors.birthMonth ?? errors.birthYear
                }
              >
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <NumberInput
                      value={draft.birthDay}
                      invalid={Boolean(errors.birthDay)}
                      placeholder="Día"
                      onChange={(value) => set("birthDay", value)}
                    />
                  </View>

                  <View style={styles.flex}>
                    <NumberInput
                      value={draft.birthMonth}
                      invalid={Boolean(errors.birthMonth)}
                      placeholder="Mes"
                      onChange={(value) => set("birthMonth", value)}
                    />
                  </View>

                  <View style={styles.year}>
                    <NumberInput
                      value={draft.birthYear}
                      invalid={Boolean(errors.birthYear)}
                      placeholder="Año"
                      maxLength={4}
                      onChange={(value) => set("birthYear", value)}
                    />
                  </View>
                </View>
              </Field>

              {/* Las tres medidas comparten fila y ninguna lleva pista
                  debajo: con una sí y las otras no, los campos se
                  descuadraban en vertical. */}
              <View style={styles.row}>
                <Field label="Altura (cm)" error={errors.heightCm} style={styles.flex}>
                  <NumberInput
                    value={draft.heightCm}
                    invalid={Boolean(errors.heightCm)}
                    placeholder="178"
                    onChange={(value) => set("heightCm", value)}
                  />
                </Field>

                <Field label="Peso (kg)" error={errors.weightKg} style={styles.flex}>
                  <NumberInput
                    value={draft.weightKg}
                    invalid={Boolean(errors.weightKg)}
                    placeholder="74,5"
                    decimal
                    onChange={(value) => set("weightKg", value)}
                  />
                </Field>

                <Field
                  label="Objetivo"
                  error={errors.targetWeightKg}
                  style={styles.flex}
                >
                  <NumberInput
                    value={draft.targetWeightKg}
                    invalid={Boolean(errors.targetWeightKg)}
                    placeholder="70"
                    decimal
                    onChange={(value) => set("targetWeightKg", value)}
                  />
                </Field>
              </View>

              <Text style={styles.aside}>
                El peso objetivo es opcional: déjalo en blanco si no entrenas
                con una cifra en la cabeza.
              </Text>

              <Field label="Sexo" error={errors.sex}>
                <ChipGroup
                  options={sexOptions}
                  value={draft.sex as string | undefined}
                  onChange={(value) => set("sex", value)}
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="¿Cuál es tu objetivo?" error={errors.goal}>
                <ChipGroup
                  options={goalOptions}
                  value={draft.goal as string | undefined}
                  onChange={(value) => set("goal", value)}
                />
              </Field>

              <Field
                label="¿Qué quieres priorizar?"
                hint="Opcional. Hasta cuatro."
                error={errors.focusAreas}
              >
                <ChipMultiGroup
                  options={focusAreaOptions}
                  value={(draft.focusAreas as string[]) ?? []}
                  onChange={(value) => set("focusAreas", value)}
                />
              </Field>

              <Field label="¿Cuánto llevas entrenando?" error={errors.experience}>
                <ChipGroup
                  options={experienceOptions}
                  value={draft.experience as string | undefined}
                  onChange={(value) => set("experience", value)}
                />
              </Field>

              <Field
                label="Sentadilla, peso muerto y press"
                hint="Si no dominas la técnica, empezamos por versiones más seguras."
                error={errors.techniqueLevel}
              >
                <ChipGroup
                  options={techniqueOptions}
                  value={draft.techniqueLevel as string | undefined}
                  onChange={(value) => set("techniqueLevel", value)}
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="¿Qué días puedes entrenar?"
                hint="Los que marques definen tu semana."
                error={errors.trainingDays}
              >
                <ChipMultiGroup
                  options={weekdayOptions}
                  value={(draft.trainingDays as string[]) ?? []}
                  onChange={(value) => set("trainingDays", value)}
                />
              </Field>

              <Field label="¿Cuánto dura una sesión?" error={errors.sessionMinutes}>
                <ChipGroup
                  options={sessionMinutesOptions}
                  value={draft.sessionMinutes as number | undefined}
                  onChange={(value) => set("sessionMinutes", value)}
                />
              </Field>

              <Field label="¿Dónde entrenas?" error={errors.equipment}>
                <ChipGroup
                  options={equipmentOptions}
                  value={draft.equipment as string | undefined}
                  onChange={(value) => set("equipment", value)}
                />
              </Field>

              <Field label="¿Haces cardio?" error={errors.cardio}>
                <ChipGroup
                  options={cardioOptions}
                  value={draft.cardio as string | undefined}
                  onChange={(value) => set("cardio", value)}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="¿Cómo es tu día a día?" error={errors.dailyActivity}>
                <ChipGroup
                  options={dailyActivityOptions}
                  value={draft.dailyActivity as string | undefined}
                  onChange={(value) => set("dailyActivity", value)}
                />
              </Field>

              <Field label="¿Cuánto duermes?" error={errors.sleepHours}>
                <ChipGroup
                  options={sleepOptions}
                  value={draft.sleepHours as number | undefined}
                  onChange={(value) => set("sleepHours", value)}
                />
              </Field>

              <Field
                label="¿Alguna lesión o limitación?"
                hint="Opcional. El coach lo tendrá en cuenta al elegir ejercicios."
                error={errors.limitations}
              >
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={String(draft.limitations ?? "")}
                  onChangeText={(value) => set("limitations", value)}
                  placeholder="Hombro derecho delicado, evito press militar"
                  placeholderTextColor={HomeColors.textTertiary}
                  multiline
                  maxLength={300}
                />
              </Field>

              <Field
                label="¿Hay ejercicios que no quieras hacer?"
                hint="Opcional. Por gusto o por historial."
                error={errors.avoidExercises}
              >
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={String(draft.avoidExercises ?? "")}
                  onChangeText={(value) => set("avoidExercises", value)}
                  placeholder="Burpees, peso muerto convencional"
                  placeholderTextColor={HomeColors.textTertiary}
                  multiline
                  maxLength={300}
                />
              </Field>
            </>
          )}

          {save.error && (
            <Text style={styles.saveError}>
              No se pudo guardar: {errorMessage(save.error)}
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setStep(step - 1)}
              style={styles.back}
            >
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={advance}
            disabled={save.isPending}
            style={[styles.button, save.isPending && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {save.isPending ? "Guardando…" : last ? "Empezar" : "Continuar"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  invalid,
  decimal,
  maxLength,
}: {
  value: unknown;
  onChange: (value: string) => void;
  placeholder: string;
  invalid: boolean;
  decimal?: boolean;
  maxLength?: number;
}) {
  return (
    <TextInput
      style={[styles.input, invalid && styles.inputError]}
      value={String(value ?? "")}
      onChangeText={(text) =>
        onChange(
          decimal
            ? // zod espera un número: el separador viaja como punto aunque
              // aquí se escriba con coma.
              text.replace(/[^0-9.,]/g, "").replace(",", ".")
            : text.replace(/[^0-9]/g, "")
        )
      }
      placeholder={placeholder}
      placeholderTextColor={HomeColors.textTertiary}
      keyboardType={decimal ? "decimal-pad" : "number-pad"}
      maxLength={maxLength ?? (decimal ? 6 : 3)}
    />
  );
}

function Field({
  label,
  hint,
  error,
  style,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HomeColors.background },
  flex: { flex: 1 },

  progress: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: HomeColors.surfaceElevated,
  },

  segmentDone: { backgroundColor: HomeColors.primary },

  content: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: HomeColors.primary,
  },

  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: HomeColors.text,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: HomeColors.textSecondary,
  },

  field: { marginTop: 24, gap: 8 },
  row: { flexDirection: "row", gap: 10 },
  // El año necesita cuatro cifras: algo más de sitio que día y mes.
  year: { flex: 1.4 },

  aside: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textSecondary,
  },

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

  inputError: { borderColor: HomeColors.error },

  textArea: { height: 88, paddingTop: 14, textAlignVertical: "top" },

  error: { fontSize: 12, color: HomeColors.errorText },
  saveError: { marginTop: 20, fontSize: 13, color: HomeColors.errorText },

  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HomeColors.border,
  },

  back: {
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.surface,
  },

  backText: { fontSize: 15, fontWeight: "700", color: HomeColors.text },

  button: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: HomeColors.primary,
  },

  buttonDisabled: { backgroundColor: HomeColors.primaryMuted },

  buttonText: { fontSize: 16, fontWeight: "700", color: HomeColors.onPrimary },
});
