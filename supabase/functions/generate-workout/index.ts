// Genera el entrenamiento del día con Claude y lo guarda como plan.
//
// Corre en Deno, dentro de Supabase. La clave de Anthropic vive aquí como
// secreto del proyecto y nunca llega al móvil:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Desplegar:
//   supabase functions deploy generate-workout

import Anthropic from "npm:@anthropic-ai/sdk@0.115.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const MODEL = "claude-opus-5";

/**
 * Qué equipamiento tiene disponible según dónde entrene. En casa se asume
 * mancuernas, bandas y kettlebell; 'corporal' es estrictamente sin material.
 */
const EQUIPMENT_BY_PLACE: Record<string, string[]> = {
  gimnasio: [
    "barra",
    "mancuernas",
    "maquina",
    "polea",
    "peso-corporal",
    "kettlebell",
    "banda",
    "otro",
  ],
  casa: ["mancuernas", "peso-corporal", "kettlebell", "banda", "otro"],
  corporal: ["peso-corporal"],
};

const allowedEquipment = (place: string | null) =>
  EQUIPMENT_BY_PLACE[place ?? "gimnasio"] ?? EQUIPMENT_BY_PLACE.gimnasio;

interface GeneratedExercise {
  exercise_slug: string;
  sets: number;
  target_reps: number;
  target_weight_kg: number;
  rest_seconds: number;
  ai_note: string;
}

interface GeneratedPlan {
  title: string;
  focus: string;
  exercises: GeneratedExercise[];
}

// El esquema es el contrato: con `strict`-style json_schema el modelo no
// puede devolver otra forma, así que no hace falta parsear a la defensiva.
const planSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Título corto del entrenamiento, en español.",
    },
    focus: {
      type: "string",
      description: "Foco de la sesión, p. ej. 'Empuje · Pecho y hombro'.",
    },
    exercises: {
      type: "array",
      description: "Entre 3 y 6 ejercicios, en el orden en que se ejecutan.",
      items: {
        type: "object",
        properties: {
          exercise_slug: {
            type: "string",
            description: "Slug exacto del catálogo. No inventar.",
          },
          sets: { type: "integer" },
          target_reps: { type: "integer" },
          target_weight_kg: {
            type: "number",
            description: "0 para ejercicios de peso corporal.",
          },
          rest_seconds: { type: "integer" },
          ai_note: {
            type: "string",
            description:
              "Una frase en español explicando al usuario por qué esta carga. Se le muestra tal cual.",
          },
        },
        required: [
          "exercise_slug",
          "sets",
          "target_reps",
          "target_weight_kg",
          "rest_seconds",
          "ai_note",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "focus", "exercises"],
  additionalProperties: false,
} as const;

const SYSTEM = `Eres el entrenador personal de la app ATHLOS. Diseñas el entrenamiento
de hoy para un usuario concreto, a partir de su historial reciente.

Reglas:
- Elige ejercicios ÚNICAMENTE del catálogo que se te da, usando su slug exacto.
- Respeta las limitaciones que declare el usuario: si dice que un movimiento le
  molesta, no lo propongas ni busques equivalentes que carguen esa zona.
- El catálogo ya viene filtrado por el material del que dispone: todo lo que
  ves es utilizable.
- Empieza por los ejercicios compuestos, cuando le queda fuerza, y deja los de
  aislamiento para el final.
- Equilibra los patrones de movimiento: no encadenes dos empujes horizontales
  ni montes una sesión entera de aislamiento.
- Ajusta el volumen al nivel y a los días por semana que tiene disponibles.
- La sesión tiene que caber en los minutos que dice tener. Cuenta el descanso:
  cuatro series con 90 s de descanso son más de seis minutos solo de espera.
- Si su técnica en los básicos no es sólida, no le mandes compuestos con barra
  a por su límite: usa máquinas, mancuernas o versiones más controlables.
- Sesga el volumen hacia lo que quiere priorizar, sin abandonar el resto.
- Si duerme poco, tiene mucha actividad diaria o hace bastante cardio, baja el
  volumen: no lo va a asimilar.
- No propongas ejercicios que haya dicho que no quiere hacer.
- Progresa con criterio: si el usuario cerró todas las series al objetivo en un
  ejercicio, sube la carga ligeramente; si se quedó corto, mantenla o bájala.
- El historial trae valoraciones de cada sesión (nota, energía antes y durante,
  si había comido bien, molestias y comentarios). Úsalas: si viene de sesiones
  con poca energía o con molestias, no es el día de subir cargas.
- Sin historial de un ejercicio, propón una carga conservadora.
- Los ejercicios de peso corporal llevan target_weight_kg = 0.
- Alterna el foco respecto a las últimas sesiones para no repetir grupo muscular
  dos días seguidos.
- ai_note se le enseña al usuario: una frase, en español, explicando el porqué de
  esa carga. Nada de jerga ni de repetir los números que ya ve en pantalla.`;

// Sin esto, la app en web no puede llamar a la función: el navegador manda
// antes un OPTIONS de comprobación y, si no se le contesta con estos
// permisos, bloquea la petición real. En móvil no hace falta, pero tampoco
// molesta.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return json({ error: "Falta el secreto ANTHROPIC_API_KEY" }, 500);
  }

  let userId: string;
  let focusHint: string | undefined;

  try {
    const body = await req.json();
    userId = body.user_id;
    focusHint = body.focus;
  } catch {
    return json({ error: "Cuerpo JSON inválido" }, 400);
  }

  if (!userId) {
    return json({ error: "Falta user_id" }, 400);
  }

  // Service role: esta función es la única que escribe planes, y lo hace
  // saltándose RLS a propósito. Por eso `user_id` viene en el cuerpo — cuando
  // entre Auth hay que sacarlo del JWT en vez de confiar en el cliente.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `display_name, birth_date, sex, height_cm, weight_kg, target_weight_kg,
       goal, focus_areas, experience, technique_level, days_per_week,
       training_days, session_minutes, equipment, daily_activity, sleep_hours,
       cardio, limitations, avoid_exercises`,
    )
    .eq("id", userId)
    .maybeSingle();

  // El filtro por material se hace en la consulta, no en el prompt: si un
  // ejercicio no le sirve, el modelo no debería ni verlo.
  const { data: catalog, error: catalogError } = await supabase
    .from("exercises")
    .select("id, slug, name, muscle_group, is_bodyweight, equipment, pattern, is_compound")
    .in("equipment", allowedEquipment(profile?.equipment as string | null));

  if (catalogError || !catalog?.length) {
    return json({ error: "No se pudo leer el catálogo de ejercicios" }, 500);
  }

  // El reparto semanal manda: si hoy toca Pull, la sesión es de Pull.
  const { data: split } = await supabase
    .from("weekly_splits")
    .select("name, rationale, days")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const history = await recentHistory(supabase, userId);

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Programar cargas a partir del historial es razonamiento de varios
      // pasos: dejamos que Claude decida cuánto pensar.
      thinking: { type: "adaptive" },
      // Si los clasificadores rechazan la petición, la API reintenta sola en
      // el modelo de respaldo en vez de devolvernos un hueco.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: planSchema },
      },
      messages: [
        {
          role: "user",
          content: buildPrompt(catalog, profile, split, history, focusHint),
        },
      ],
    });
  } catch (error) {
    console.error("Fallo llamando a Claude", error);
    return json({ error: "El entrenador no está disponible ahora mismo" }, 502);
  }

  if (response.stop_reason === "refusal") {
    console.error("Petición rechazada", response.stop_details);
    return json({ error: "No se pudo generar el entrenamiento" }, 422);
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return json({ error: "Respuesta vacía del modelo" }, 502);
  }

  const plan: GeneratedPlan = JSON.parse(textBlock.text);

  // El esquema garantiza la forma, no que los slugs existan: eso lo
  // comprobamos nosotros contra el catálogo.
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));
  const unknown = plan.exercises
    .map((item) => item.exercise_slug)
    .filter((slug) => !bySlug.has(slug));

  if (unknown.length > 0) {
    console.error("Slugs fuera del catálogo", unknown);
    return json({ error: "El plan generado no es válido" }, 502);
  }

  const { data: created, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userId,
      title: plan.title,
      focus: plan.focus,
      source: "ai",
      ai_model: MODEL,
    })
    .select("id")
    .single();

  if (planError || !created) {
    console.error("Fallo insertando el plan", planError);
    return json({ error: "No se pudo guardar el entrenamiento" }, 500);
  }

  const { error: exercisesError } = await supabase
    .from("plan_exercises")
    .insert(
      plan.exercises.map((item, index) => ({
        plan_id: created.id,
        exercise_id: bySlug.get(item.exercise_slug)!.id,
        position: index,
        sets: item.sets,
        target_reps: item.target_reps,
        target_weight_kg: item.target_weight_kg,
        rest_seconds: item.rest_seconds,
        ai_note: item.ai_note,
      })),
    );

  if (exercisesError) {
    // Un plan sin ejercicios no le sirve a nadie: lo retiramos.
    await supabase.from("workout_plans").delete().eq("id", created.id);
    console.error("Fallo insertando los ejercicios", exercisesError);
    return json({ error: "No se pudo guardar el entrenamiento" }, 500);
  }

  return json({ plan_id: created.id }, 200);
});

async function recentHistory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      `started_at, focus, rating, energy_before, energy_during, ate_well,
       discomfort, notes,
       session_sets ( set_number, weight_kg, reps, exercises ( slug, name ) )`,
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(8);

  return data ?? [];
}

interface CatalogItem {
  slug: string;
  name: string;
  muscle_group: string;
  is_bodyweight: boolean;
  equipment: string;
  pattern: string;
  is_compound: boolean;
}

const WEEKDAYS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function buildPrompt(
  catalog: CatalogItem[],
  profile: Record<string, unknown> | null,
  split: {
    name: string;
    rationale: string | null;
    days: { day: string; label: string; focus: string }[];
  } | null,
  history: unknown[],
  focusHint?: string,
) {
  const today = WEEKDAYS[new Date().getDay()];
  const todaysSlot = split?.days.find((item) => item.day === today);

  const splitText = split
    ? [
        `Reparto semanal vigente: ${split.name}`,
        ...split.days.map(
          (item) =>
            `- ${item.day}: ${item.label} (${item.focus})${item.day === today ? "  ← HOY" : ""}`,
        ),
        todaysSlot
          ? `Hoy le toca ${todaysSlot.label}: ${todaysSlot.focus}. Cíñete a eso.`
          : "Hoy no es un día de entrenamiento en su reparto, así que propón una sesión ligera o del grupo que lleve más tiempo sin trabajar.",
      ].join("\n")
    : "Todavía no tiene reparto semanal: elige tú el foco según lo que lleve más tiempo sin trabajar.";
  // Agrupado por patrón de movimiento: así el modelo ve de un vistazo con
  // qué puede equilibrar la sesión.
  const byPattern = new Map<string, CatalogItem[]>();

  for (const item of catalog) {
    const group = byPattern.get(item.pattern) ?? [];
    group.push(item);
    byPattern.set(item.pattern, group);
  }

  const catalogText = [...byPattern.entries()]
    .map(([pattern, items]) =>
      [
        `[${pattern}]`,
        ...items.map(
          (item) =>
            `- ${item.slug}: ${item.name} · ${item.muscle_group} · ${item.equipment}${item.is_compound ? " · compuesto" : ""}`,
        ),
      ].join("\n"),
    )
    .join("\n\n");

  const profileText = profile
    ? describeProfile(profile)
    : "Sin datos del usuario: usa cargas conservadoras y un enfoque general.";

  const historyText =
    history.length > 0
      ? JSON.stringify(history, null, 2)
      : "Sin sesiones registradas todavía: es su primer entrenamiento.";

  return `Perfil del usuario:
${profileText}

${splitText}

Catálogo de ejercicios disponible:
${catalogText}

Últimas sesiones del usuario (más reciente primero):
${historyText}

${focusHint ? `El usuario quiere centrarse hoy en: ${focusHint}\n` : ""}
Diseña el entrenamiento de hoy.`;
}

function describeProfile(profile: Record<string, unknown>) {
  const born = profile.birth_date as string | null;
  const days = profile.training_days as string[] | null;
  const areas = profile.focus_areas as string[] | null;

  const lines = [
    profile.display_name && `- Nombre: ${profile.display_name}`,
    born && `- Edad: ${yearsSince(born)} años`,
    profile.sex && `- Sexo: ${profile.sex}`,
    profile.height_cm && `- Altura: ${profile.height_cm} cm`,
    profile.weight_kg && `- Peso: ${profile.weight_kg} kg`,
    profile.target_weight_kg && `- Peso objetivo: ${profile.target_weight_kg} kg`,
    profile.goal && `- Objetivo: ${profile.goal}`,
    areas?.length && `- Quiere priorizar: ${areas.join(", ")}`,
    profile.experience && `- Experiencia: ${profile.experience}`,
    profile.technique_level &&
      `- Técnica en los básicos (sentadilla, peso muerto, press): ${profile.technique_level}`,
    days?.length && `- Días que entrena: ${days.join(", ")}`,
    profile.session_minutes &&
      `- Minutos por sesión: ${profile.session_minutes} (el volumen tiene que caber aquí)`,
    profile.equipment && `- Material: ${profile.equipment}`,
    profile.cardio && `- Cardio que hace: ${profile.cardio}`,
    profile.daily_activity && `- Actividad diaria fuera del gimnasio: ${profile.daily_activity}`,
    profile.sleep_hours && `- Horas de sueño: ${profile.sleep_hours}`,
    profile.limitations && `- Limitaciones que declara: ${profile.limitations}`,
    profile.avoid_exercises && `- Ejercicios que no quiere hacer: ${profile.avoid_exercises}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Edad cumplida. Por componentes, no dividiendo milisegundos: los bisiestos
 *  desplazan la cuenta justo el día del cumpleaños. */
function yearsSince(iso: string) {
  const born = new Date(iso);
  const today = new Date();

  let years = today.getFullYear() - born.getFullYear();
  const beforeBirthday =
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());

  if (beforeBirthday) years -= 1;

  return years;
}
