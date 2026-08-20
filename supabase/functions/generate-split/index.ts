// Diseña el ciclo de entrenamiento del usuario: qué toca en cada sesión.
//
// Es una rotación, no un calendario: sesión 1, 2, 3... y al terminar la última
// se vuelve a la primera. `generate-workout` la lee para saber cuál toca, en
// lugar de decidir el foco al vuelo.
//
// Se numeran las sesiones y no se atan a días de la semana a propósito: así
// saltarse un entrenamiento no desfasa nada, porque la siguiente sigue siendo
// la siguiente.
//
// Lo que se guarda es un BORRADOR. El ciclo vigente no se toca hasta que el
// usuario aprueba el nuevo desde la app: si se activara aquí, una propuesta
// que no llega a mirar le cambiaría los entrenamientos por su cuenta.
//
// Desplegar:
//   supabase functions deploy generate-split --use-api

import Anthropic from "npm:@anthropic-ai/sdk@0.115.0";
import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const MODEL = "claude-opus-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const splitSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "Nombre del reparto, reconocible: 'Push / Pull / Legs', 'Torso - Pierna', 'Full body'...",
    },
    rationale: {
      type: "string",
      description:
        "Dos o tres frases, en español y dirigidas al usuario, explicando por qué este reparto encaja con él.",
    },
    cycle: {
      type: "array",
      description:
        "Las sesiones del ciclo, en el orden en que se hacen. Tantas como días entrene por semana. Al terminar la última se vuelve a la primera.",
      items: {
        type: "object",
        properties: {
          position: {
            type: "integer",
            description:
              "Orden dentro del ciclo, empezando en 1 y sin saltos ni repeticiones.",
          },
          label: {
            type: "string",
            description: "Nombre corto de la sesión: 'Push', 'Pull', 'Pierna'.",
          },
          focus: {
            type: "string",
            description: "Grupos que se trabajan, separados por comas.",
          },
        },
        required: ["position", "label", "focus"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "rationale", "cycle"],
  additionalProperties: false,
} as const;

const SYSTEM = `Eres el entrenador personal de ATHLOS. Diseñas el ciclo de
entrenamiento de un cliente: qué grupo muscular le toca en cada sesión.

Reglas:
- El ciclo es una ROTACIÓN, no un calendario. Numeras las sesiones 1, 2, 3... y
  al terminar la última se vuelve a la primera. No las ates a días de la semana:
  el cliente hace la siguiente cuando entrena, sea el día que sea.
- Haz tantas sesiones como días por semana entrene, ni una más.
- Los días concretos que tiene disponibles te dicen cómo reparte el descanso
  —no es lo mismo lunes, martes y miércoles que lunes, miércoles y viernes—,
  así que úsalos para decidir cuánto puede apretar, no para asignar sesiones.
- Elige el reparto que encaje con su número de días, no el que esté de moda:
  con 2 o 3 días, full body o torso-pierna rinden más que un PPL incompleto;
  con 4, torso-pierna o upper/lower; con 5 o 6, Push/Pull/Legs.
- Reparte el descanso: no encadenes dos días del mismo grupo seguidos.
- Sesga hacia lo que quiere priorizar, sin abandonar el resto del cuerpo.
- Respeta sus limitaciones: si una zona le molesta, no la pongas como eje de
  un día entero.
- El campo rationale se le muestra tal cual: en español, directo, sin jerga.`;

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = await userFromRequest(req, supabase);

  if (!userId) return json({ error: "Sesión no válida" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      // El perfil viaja entero al prompt como JSON, así que ampliar esta
      // lista es lo único que hace falta para que el modelo lo vea.
      //
      // `sport` pesa especialmente aquí: quien juega al fútbol dos días llega
      // con las piernas cargadas, y el reparto debería tenerlo en cuenta al
      // repartir la semana.
      `display_name, birth_date, sex, goal, goal_notes, focus_areas,
       experience, technique_level, days_per_week, training_days,
       session_minutes, equipment, sport, sport_days, daily_activity,
       cardio, limitations, avoid_exercises`,
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return json({ error: "No hay perfil todavía" }, 400);
  }

  const days = (profile.training_days as string[] | null) ?? [];

  if (days.length === 0) {
    return json(
      { error: "Elige primero qué días puedes entrenar en tu perfil" },
      400,
    );
  }

  const quota = await consumeAiUsage(supabase, userId, "cycle");
  if (quota === null) {
    return json({ error: "No se pudo comprobar tu límite de uso" }, 500);
  }
  if (!quota) {
    return json(
      { error: "Has alcanzado el límite de 2 ciclos diseñados hoy. Vuelve mañana." },
      429,
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Igual que en generate-workout: el texto no cambia nunca, así que se
      // marca para caché.
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      output_config: { format: { type: "json_schema", schema: splitSchema } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              // También cacheable. "Prefiero otro ciclo" deja al usuario
              // regenerando varias veces seguidas sin haber cambiado nada de
              // su perfil entre un intento y el siguiente: ese reintento es
              // el mismo bloque, palabra por palabra.
              text: `Perfil del cliente:\n${JSON.stringify(profile)}`,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: "Diseña su ciclo de entrenamiento." },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Fallo llamando a Claude", error);
    return json({ error: "El entrenador no está disponible ahora mismo" }, 502);
  }

  if (response.stop_reason === "refusal") {
    return json({ error: "No se pudo diseñar el reparto" }, 422);
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return json({ error: "Respuesta vacía del modelo" }, 502);
  }

  const split = JSON.parse(textBlock.text) as {
    name: string;
    rationale: string;
    cycle: { position: number; label: string; focus: string }[];
  };

  /**
   * El esquema garantiza la forma, no el contenido: puede devolver posiciones
   * repetidas, con saltos, o más sesiones que días entrena.
   *
   * Un ciclo con un hueco se rompe al dar la vuelta —de la 3 saltaría a la 5 y
   * nunca encontraría la 4—, así que se exige exactamente 1..N.
   */
  const posiciones = [...split.cycle]
    .map((item) => item.position)
    .sort((a, b) => a - b);

  const cicloValido =
    posiciones.length === days.length &&
    posiciones.every((position, index) => position === index + 1);

  if (!cicloValido) {
    console.error("Ciclo inválido", { posiciones, esperadas: days.length });
    return json({ error: "El ciclo generado no es válido" }, 502);
  }

  /**
   * El ciclo vigente NO se toca: esto es una propuesta.
   *
   * Lo que sí se limpia son los borradores anteriores sin aprobar. Si no, pedir
   * otro ciclo dos veces dejaría dos propuestas vivas y la app enseñaría la que
   * saliera primero.
   */
  await supabase
    .from("weekly_splits")
    .delete()
    .eq("user_id", userId)
    .eq("status", "draft");

  const { data: created, error: insertError } = await supabase
    .from("weekly_splits")
    .insert({
      user_id: userId,
      name: split.name,
      rationale: split.rationale,
      cycle: split.cycle,
      status: "draft",
      active: false,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Fallo guardando el ciclo", insertError);
    return json({ error: "No se pudo guardar el ciclo" }, 500);
  }

  return json({ cycle_id: created.id, cycle: split }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function consumeAiUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: "cycle",
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
