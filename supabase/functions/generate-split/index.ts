// Diseña el reparto semanal del usuario: qué toca cada día que entrena.
//
// Es la estructura que ordena las sesiones. `generate-workout` la lee para
// saber qué le corresponde a hoy, en lugar de decidir el foco al vuelo.
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
    days: {
      type: "array",
      description:
        "Una entrada por cada día que el usuario puede entrenar, en el mismo orden de la semana.",
      items: {
        type: "object",
        properties: {
          day: {
            type: "string",
            enum: ["lun", "mar", "mie", "jue", "vie", "sab", "dom"],
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
        required: ["day", "label", "focus"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "rationale", "days"],
  additionalProperties: false,
} as const;

const SYSTEM = `Eres el entrenador personal de ATHLOS. Diseñas el reparto semanal
de un cliente: qué grupo muscular le toca cada día que puede entrenar.

Reglas:
- Usa EXACTAMENTE los días que el cliente dice tener disponibles, ni uno más.
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

  let userId: string;

  try {
    const body = await req.json();
    userId = body.user_id;
  } catch {
    return json({ error: "Cuerpo JSON inválido" }, 400);
  }

  if (!userId) return json({ error: "Falta user_id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `display_name, birth_date, sex, goal, focus_areas, experience,
       technique_level, days_per_week, training_days, session_minutes,
       equipment, daily_activity, sleep_hours, cardio, limitations,
       avoid_exercises`,
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

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  let response;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: splitSchema } },
      messages: [
        {
          role: "user",
          content: `Perfil del cliente:\n${JSON.stringify(profile, null, 2)}\n\nDiseña su reparto semanal.`,
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
    days: { day: string; label: string; focus: string }[];
  };

  // El esquema garantiza la forma, no que se ceñiera a los días disponibles.
  const invalid = split.days.filter((item) => !days.includes(item.day));

  if (invalid.length > 0 || split.days.length === 0) {
    console.error("Días fuera de los disponibles", invalid);
    return json({ error: "El reparto generado no es válido" }, 502);
  }

  // Solo un reparto vigente: el anterior pasa a historial.
  await supabase
    .from("weekly_splits")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("active", true);

  const { data: created, error: insertError } = await supabase
    .from("weekly_splits")
    .insert({
      user_id: userId,
      name: split.name,
      rationale: split.rationale,
      days: split.days,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Fallo guardando el reparto", insertError);
    return json({ error: "No se pudo guardar el reparto" }, 500);
  }

  return json({ split_id: created.id, split }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
