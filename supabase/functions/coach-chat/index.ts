// Chat con el entrenador personal.
//
// El modelo puede PROPONER cambios en el entrenamiento, pero no aplicarlos:
// las herramientas no escriben nada. La propuesta se guarda junto al mensaje
// y es la app, con los permisos del propio usuario, la que la ejecuta cuando
// él pulsa aplicar. Así una alucinación del modelo nunca llega a la base de
// datos sin que alguien la haya visto.
//
// Desplegar:
//   supabase functions deploy coach-chat --use-api

import Anthropic from "npm:@anthropic-ai/sdk@0.115.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const MODEL = "claude-sonnet-5";
const HISTORY_LIMIT = 20;
/** Días que se conserva la conversación. Más allá se borra sola. */
const RETENTION_DAYS = 5;

/** Mismo criterio que en generate-workout: qué material tiene según dónde entrene. */
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Eres el entrenador personal de ATHLOS. Hablas con tu cliente por chat.

Cómo respondes:
- En español, directo y cercano, tuteando. Sin florituras ni palmaditas vacías.
- Breve por defecto: dos o tres frases. Solo te extiendes si te piden detalle
  o si la respuesta corta sería inútil.
- Concreto y accionable. Antes que teoría, dile qué hacer.
- Usas lo que sabes de él: su objetivo, su nivel, su material, sus limitaciones
  y lo que ha entrenado estos días.
- Si te pregunta algo que no puedes saber, dilo en lugar de inventarlo.

Cambiar el entrenamiento:
- Cuando lo que te pida implique tocar la sesión pendiente, usa la herramienta
  correspondiente para PROPONER el cambio. No lo apliques por tu cuenta: el
  cliente verá tu propuesta y decidirá.
- Una sola propuesta por mensaje, la más importante.
- Usa los identificadores exactos que te damos en el contexto. No los inventes.
- Al sustituir un ejercicio, elige solo del catálogo que se te da.
- Después de proponer, explica en una o dos frases por qué. No repitas los
  números de la propuesta: ya los ve en la tarjeta.
- Si solo te piden consejo, responde y no propongas nada.

Límites:
- No eres médico. Ante dolor persistente, lesión, mareos o cualquier síntoma
  que pinte a problema de salud, dile que consulte a un profesional sanitario.
  Puedes sugerirle cómo adaptar el entrenamiento mientras tanto.
- Nada de dietas de restricción severa ni de suplementación agresiva.
- No prometas resultados en plazos concretos.`;

const TOOLS = [
  {
    name: "ajustar_ejercicio",
    description:
      "Propone cambiar las series, repeticiones, peso o descanso de un ejercicio del entrenamiento pendiente. Envía solo los campos que cambian.",
    input_schema: {
      type: "object",
      properties: {
        plan_exercise_id: {
          type: "string",
          description: "El id exacto del ejercicio del plan, del contexto.",
        },
        sets: { type: "integer", description: "Series nuevas, entre 1 y 12." },
        target_reps: {
          type: "integer",
          description: "Repeticiones objetivo nuevas.",
        },
        target_weight_kg: {
          type: "number",
          description: "Peso nuevo en kilos. 0 para peso corporal.",
        },
        rest_seconds: {
          type: "integer",
          description: "Descanso nuevo en segundos.",
        },
        motivo: {
          type: "string",
          description: "Una frase corta, para el cliente, explicando el cambio.",
        },
      },
      required: ["plan_exercise_id", "motivo"],
      additionalProperties: false,
    },
  },
  {
    name: "sustituir_ejercicio",
    description:
      "Propone cambiar un ejercicio del entrenamiento pendiente por otro del catálogo, manteniendo su posición.",
    input_schema: {
      type: "object",
      properties: {
        plan_exercise_id: { type: "string" },
        exercise_slug: {
          type: "string",
          description: "Slug exacto del catálogo. No inventar.",
        },
        motivo: { type: "string" },
      },
      required: ["plan_exercise_id", "exercise_slug", "motivo"],
      additionalProperties: false,
    },
  },
  {
    name: "cambiar_reparto_semanal",
    description:
      "Propone un ciclo de entrenamiento nuevo: qué le toca en cada sesión. Es una rotación numerada, no un calendario: sesión 1, 2, 3... y al terminar la última se vuelve a la primera. Úsala cuando el cliente diga que la estructura no le encaja, que cambian sus días disponibles, o que quiere otro tipo de rutina. Devuelve el ciclo COMPLETO, no solo la sesión que cambia.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Nombre del reparto: 'Push / Pull / Legs', 'Torso - Pierna'...",
        },
        rationale: {
          type: "string",
          description: "Dos o tres frases explicándole por qué este reparto.",
        },
        cycle: {
          type: "array",
          description:
            "Las sesiones del ciclo, en el orden en que se hacen. Tantas como días entrene por semana.",
          items: {
            type: "object",
            properties: {
              position: {
                type: "integer",
                description:
                  "Orden dentro del ciclo, empezando en 1 y sin saltos ni repeticiones.",
              },
              label: { type: "string" },
              focus: { type: "string" },
            },
            required: ["position", "label", "focus"],
            additionalProperties: false,
          },
        },
        motivo: { type: "string" },
      },
      required: ["name", "cycle", "motivo"],
      additionalProperties: false,
    },
  },
  {
    name: "actualizar_limitaciones",
    description:
      "Propone actualizar las lesiones o limitaciones del perfil. Afecta a todos los entrenamientos futuros, no solo al de hoy. Úsala cuando el cliente cuente una molestia o lesión que vaya a durar.",
    input_schema: {
      type: "object",
      properties: {
        limitations: {
          type: "string",
          description:
            "El texto completo que quedará en el perfil, integrando lo que ya hubiera.",
        },
        motivo: { type: "string" },
      },
      required: ["limitations", "motivo"],
      additionalProperties: false,
    },
    // Va en la última herramienta a propósito: la caché de la API cubre TODO
    // lo que viene antes del punto marcado, así que ponerlo aquí cachea el
    // array de herramientas entero de una vez. Las cuatro son fijas, iguales
    // para cualquier cliente en cualquier mensaje.
    cache_control: { type: "ephemeral" },
  },
];

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

  let message: string;

  try {
    const body = await req.json();
    message = (body.message ?? "").trim();
  } catch {
    return json({ error: "Cuerpo JSON inválido" }, 400);
  }

  if (!message) return json({ error: "El mensaje está vacío" }, 400);
  if (message.length > 2000) {
    return json({ error: "El mensaje es demasiado largo" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = await userFromRequest(req, supabase);

  if (!userId) return json({ error: "Sesión no válida" }, 401);

  const quota = await consumeAiUsage(supabase, userId, "coach");
  if (quota === null) {
    return json({ error: "No se pudo comprobar tu límite de uso" }, 500);
  }
  if (!quota) {
    return json(
      { error: "Has alcanzado el límite de 20 mensajes al coach hoy. Vuelve mañana." },
      429,
    );
  }

  // Limpieza antes de leer: lo caducado no debe entrar en el contexto ni
  // seguir ocupando la tabla. Es una consulta barata sobre un índice.
  await supabase.rpc("prune_coach_messages", {
    p_user_id: userId,
    p_days: RETENTION_DAYS,
  });

  // El historial se lee ANTES de insertar el mensaje nuevo: si no, vendría
  // duplicado al final de la conversación que le pasamos al modelo.
  const { data: history } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const context = await loadContext(supabase, userId);

  const { error: insertError } = await supabase
    .from("coach_messages")
    .insert({ user_id: userId, role: "user", content: message });

  if (insertError) {
    console.error("Fallo guardando el mensaje", insertError);
    return json({ error: "No se pudo guardar tu mensaje" }, 500);
  }

  const previous = (history ?? []).reverse();

  // La conversación tiene que empezar por un mensaje del usuario. Al caducar
  // los antiguos, lo primero que queda puede ser una respuesta del coach, y
  // enviarla como apertura hace que la API rechace la petición entera.
  while (previous.length > 0 && previous[0].role !== "user") {
    previous.shift();
  }

  const conversation = [
    ...previous.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content as unknown,
    })),
    { role: "user" as const, content: message as unknown },
  ];

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const request = {
    model: MODEL,
    max_tokens: 1500,
    /**
     * Dos bloques, dos cachés distintas.
     *
     * `SYSTEM` no cambia nunca: es el mismo texto para cualquier cliente, en
     * cualquier mensaje. Va como su propio bloque cacheado para que ese ahorro
     * no dependa de que el contexto de después también coincida.
     *
     * `context` sí cambia por usuario, pero dentro de una misma conversación
     * suele ser idéntico de un mensaje al siguiente: mismo perfil, mismo
     * ciclo, mismo plan pendiente, mismo catálogo. Se cachea aparte para que
     * cada mensaje nuevo de la conversación aproveche lo que ya se mandó en
     * el anterior, en vez de volver a pagarlo entero cada vez que el usuario
     * escribe algo.
     */
    system: [
      { type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } },
      {
        type: "text" as const,
        text: `Contexto del cliente:\n${context}`,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    tools: TOOLS,
  };

  let response;
  try {
    response = await anthropic.messages.create({
      ...request,
      messages: conversation,
    });
  } catch (error) {
    console.error("Fallo llamando a Claude", error);
    return json({ error: "El coach no está disponible ahora mismo" }, 502);
  }

  if (response.stop_reason === "refusal") {
    console.error("Petición rechazada", response.stop_details);
    return json({ error: "No puedo ayudarte con eso" }, 422);
  }

  let reply = textOf(response);
  let proposal: Record<string, unknown> | null = null;

  const toolUse = response.content.find((block) => block.type === "tool_use");

  if (toolUse && toolUse.type === "tool_use") {
    proposal = {
      kind: toolUse.name,
      ...(toolUse.input as Record<string, unknown>),
    };

    /**
     * No se hace una segunda llamada para redactar el cierre.
     *
     * El prompt de sistema ya le pide explícitamente "después de proponer,
     * explica en una o dos frases por qué" EN LA MISMA respuesta que hace la
     * propuesta — Claude puede devolver texto y una llamada a herramienta a
     * la vez, y de hecho es lo que se le pide que haga. `reply` ya viene de
     * `textOf(response)` unas líneas más arriba, así que ese texto está aquí
     * salvo que el modelo no lo escribiera.
     *
     * Antes había una llamada extra completa solo para pedir esa frase de
     * cierre, que pagaba otra vez el sistema, el contexto y la conversación
     * entera por una respuesta que casi siempre ya se tenía. El resguardo de
     * más abajo (`if (!reply) ...`) sigue cubriendo el caso raro en que el
     * modelo proponga sin decir nada.
     */
  }

  if (!reply) {
    reply = proposal
      ? "Te propongo este cambio."
      : "No he sabido qué responder. Prueba a preguntármelo de otra forma.";
  }

  const { error: replyError } = await supabase
    .from("coach_messages")
    .insert({
      user_id: userId,
      role: "assistant",
      content: reply,
      proposal,
      proposal_status: proposal ? "pendiente" : null,
    });

  if (replyError) {
    console.error("Fallo guardando la respuesta", replyError);
  }

  return json({ reply, proposal }, 200);
});

function textOf(response: { content: unknown[] }) {
  return (response.content as { type: string; text?: string }[])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

/** Lo que el entrenador sabe del cliente, en texto plano para el prompt. */
async function loadContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `display_name, birth_date, sex, height_cm, weight_kg, target_weight_kg,
       goal, goal_notes, focus_areas, experience, technique_level,
       days_per_week, training_days, session_minutes, equipment, sport,
       sport_days, daily_activity, sleep_hours, cardio, limitations,
       avoid_exercises`,
    )
    .eq("id", userId)
    .maybeSingle();

  // Solo el plan pendiente: proponer cambios sobre uno ya terminado no
  // tendría ningún efecto.
  const { data: plan } = await supabase
    .from("workout_plans")
    .select(
      `id, title, focus,
       plan_exercises (
         id, position, sets, target_reps, target_weight_kg, rest_seconds,
         exercises ( slug, name, muscle_group )
       )`,
    )
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Filtrado por el material del cliente: si no lo puede usar, el coach no
  // debería ni poder proponerlo.
  const place = (profile?.equipment as string | null) ?? "gimnasio";

  const { data: catalog } = await supabase
    .from("exercises")
    .select("slug, name, muscle_group, equipment, pattern")
    .in("equipment", EQUIPMENT_BY_PLACE[place] ?? EQUIPMENT_BY_PLACE.gimnasio)
    // Orden fijo por la misma razón que en generate-workout: sin él, el
    // bloque de contexto cambiaría de bytes entre mensajes de la misma
    // conversación y la caché nunca coincidiría con el turno anterior.
    .order("slug");

  // Las valoraciones (nota, energía, molestias, comentario) explican por qué
  // una sesión salió floja mucho mejor que los kilos levantados.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    // Solo lo que la app escribe. `focus`, `energy_before`, `ate_well` y
    // `discomfort` existen desde la `0015` y no las rellena nadie:
    // `saveSessionFeedback` guarda energía durante, nota y comentarios, y
    // `openSession` inserta solo usuario y plan. Viajaban como cuatro `null`
    // por sesión en cada mensaje del chat. Mismo arreglo que en
    // `generate-workout`.
    .select(
      `started_at, finished_at, rating, energy_during, notes,
       session_sets ( set_number, weight_kg, reps, exercises ( name ) )`,
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(5);

  const parts: string[] = [];

  if (profile) {
    const born = profile.birth_date as string | null;
    const days = profile.training_days as string[] | null;
    const areas = profile.focus_areas as string[] | null;

    parts.push(
      [
        "Perfil:",
        profile.display_name && `- Nombre: ${profile.display_name}`,
        born && `- Edad: ${yearsSince(born)} años`,
        profile.sex && `- Sexo: ${profile.sex}`,
        profile.height_cm && `- Altura: ${profile.height_cm} cm`,
        profile.weight_kg && `- Peso: ${profile.weight_kg} kg`,
        profile.target_weight_kg && `- Peso objetivo: ${profile.target_weight_kg} kg`,
        profile.goal && `- Objetivo: ${profile.goal}`,
        // Lo escribió él. Aquí vale doble: el coach puede responder con sus
        // mismas palabras en vez de con una etiqueta.
        profile.goal_notes &&
          `- Lo que quiere conseguir, en sus palabras: "${profile.goal_notes}"`,
        areas?.length && `- Quiere priorizar: ${areas.join(", ")}`,
        profile.experience && `- Experiencia: ${profile.experience}`,
        profile.technique_level && `- Técnica en los básicos: ${profile.technique_level}`,
        days?.length && `- Días que entrena: ${days.join(", ")}`,
        profile.session_minutes && `- Minutos por sesión: ${profile.session_minutes}`,
        profile.equipment && `- Material: ${profile.equipment}`,
        profile.sport &&
          profile.sport !== "ninguno" &&
          `- Practica ${profile.sport}${
            profile.sport_days ? ` ${profile.sport_days} días por semana` : ""
          } además del gimnasio`,
        profile.cardio && `- Cardio: ${profile.cardio}`,
        profile.daily_activity && `- Actividad diaria: ${profile.daily_activity}`,
        // Declaradas una vez en el perfil, no lo que durmió anoche. Ver el
        // mismo campo en `generate-workout`.
        profile.sleep_hours && `- Horas de sueño que declara habitualmente: ${profile.sleep_hours}`,
        profile.limitations && `- Limitaciones: ${profile.limitations}`,
        profile.avoid_exercises && `- No quiere hacer: ${profile.avoid_exercises}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const { data: split } = await supabase
    .from("weekly_splits")
    .select("name, rationale, cycle")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  parts.push(
    split
      ? `Ciclo de entrenamiento vigente, en orden de rotación:\n${JSON.stringify(split)}`
      : "Todavía no tiene ciclo de entrenamiento.",
  );

  parts.push(
    plan
      ? `Entrenamiento pendiente (los "id" son los que hay que usar en las herramientas):\n${JSON.stringify(plan)}`
      : "No tiene ningún entrenamiento pendiente, así que no puedes proponer cambios sobre él.",
  );

  parts.push(
    `Catálogo disponible con su material (ya filtrado por lo que tiene):\n${(catalog ?? [])
      .map(
        (item) =>
          `- ${item.slug}: ${item.name} · ${item.muscle_group} · ${item.equipment} · ${item.pattern}`,
      )
      .join("\n")}`,
  );

  parts.push(
    sessions?.length
      ? `Últimas sesiones registradas:\n${JSON.stringify(sessions)}`
      : "Todavía no ha registrado ninguna sesión.",
  );

  return parts.join("\n\n");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function consumeAiUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: "coach",
) {
  const { data, error } = await supabase.rpc("consume_ai_usage", {
    p_user: userId,
    p_action: action,
  });

  if (error) {
    console.error("Fallo comprobando el límite de IA", error);
    return null;
  }

  return data === true;
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

/**
 * Saca el usuario del token que envía la app, en lugar de creerse el id que
 * venga en el cuerpo. Con el `user_id` en el cuerpo, cualquiera con la clave
 * anon —que va dentro del bundle— podía pedir datos de otra persona.
 */
async function userFromRequest(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error) return null;

  return data.user?.id ?? null;
}
