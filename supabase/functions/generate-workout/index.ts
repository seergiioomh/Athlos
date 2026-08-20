// Genera la siguiente sesión del ciclo con Claude y la guarda como plan.
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

interface GeneratedSetTarget {
  reps: number;
  weight_kg: number;
}

interface GeneratedExercise {
  exercise_slug: string;
  sets: number;
  target_reps: number;
  target_weight_kg: number;
  /** Opcional: un objetivo por serie cuando no todas son iguales. */
  set_targets?: GeneratedSetTarget[];
  rest_seconds: number;
  ai_note: string;
}

/**
 * Se queda la progresión solo si cuadra con el ejercicio.
 *
 * El esquema garantiza la forma, no el contenido: el modelo puede devolver
 * cinco entradas para cuatro series. Antes que rechazar el entrenamiento
 * entero por eso, se descarta la progresión y el ejercicio se queda con su
 * objetivo uniforme, que es una degradación que el usuario ni nota.
 *
 * La base tiene la misma comprobación en un `check`; esta evita que un plan
 * bueno se pierda por un detalle recuperable.
 */
function sanearProgresion(
  item: GeneratedExercise,
): GeneratedSetTarget[] | null {
  const targets = item.set_targets;

  if (!Array.isArray(targets) || targets.length !== item.sets) return null;

  const valido = targets.every(
    (entrada) =>
      Number.isFinite(entrada?.reps) &&
      Number.isFinite(entrada?.weight_kg) &&
      entrada.reps >= 1 &&
      entrada.reps <= 100 &&
      entrada.weight_kg >= 0 &&
      entrada.weight_kg <= 9999,
  );

  if (!valido) {
    console.warn("Progresión descartada", item.exercise_slug, targets);
    return null;
  }

  // Todas iguales no es una progresión: guardarlo solo ocupa sitio y obliga a
  // la pantalla a enseñar el objetivo por fila para nada.
  const iguales = targets.every(
    (entrada) =>
      entrada.reps === targets[0].reps &&
      entrada.weight_kg === targets[0].weight_kg,
  );

  return iguales ? null : targets;
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
          set_targets: {
            type: "array",
            description:
              "Opcional. Objetivo de CADA serie, en orden, cuando no todas son iguales: ascendentes, back-off, descendentes. Omítelo si las series son idénticas; entonces se usan target_reps y target_weight_kg. Si lo mandas, tantas entradas como series.",
            items: {
              type: "object",
              properties: {
                reps: { type: "integer" },
                weight_kg: {
                  type: "number",
                  description: "0 para ejercicios de peso corporal.",
                },
              },
              required: ["reps", "weight_kg"],
              additionalProperties: false,
            },
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
- EL CICLO MANDA. Se te dice qué sesión le toca, y el foco lo decide ella, no
  tú: si le toca Pull, la sesión es de Pull entera. No es una sugerencia ni un
  punto de partida. Solo eliges el foco cuando no hay ciclo.
- El ciclo es una rotación, no un calendario: no hables de días de la semana ni
  supongas nada por la fecha de hoy.
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
- Puedes dar un objetivo DISTINTO A CADA SERIE con \`set_targets\` cuando el
  ejercicio lo pida: series ascendentes para subir a un tope, back-off tras una
  serie pesada, o descendentes si llega justo al final. Úsalo cuando aporte,
  no por sistema: para trabajo de aislamiento o de técnica, cuatro series
  iguales suelen ser lo correcto y basta con omitirlo.
- Si mandas \`set_targets\`, explica la progresión en \`ai_note\`: quien entrena
  tiene que entender por qué sube o baja el peso entre series.
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

  let focusHint: string | undefined;

  try {
    const body = await req.json();
    focusHint = body.focus;

    // Ya no se recibe ningún día: el ciclo es una rotación y no depende de la
    // fecha, así que no hay nada que el móvil tenga que contarle al servidor.
  } catch {
    return json({ error: "Cuerpo JSON inválido" }, 400);
  }

  // Service role: esta función escribe planes saltándose RLS a propósito.
  // Justo por eso el usuario NO puede venir del cuerpo de la petición.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = await userFromRequest(req, supabase);

  if (!userId) {
    return json({ error: "Sesión no válida" }, 401);
  }

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

  // El filtro por material se hace en la consulta, no en el prompt: si un
  // ejercicio no le sirve, el modelo no debería ni verlo.
  const { data: catalog, error: catalogError } = await supabase
    .from("exercises")
    .select("id, slug, name, muscle_group, is_bodyweight, equipment, pattern, is_compound")
    .in("equipment", allowedEquipment(profile?.equipment as string | null))
    // Sin orden explícito, Postgres no garantiza devolver siempre las mismas
    // filas en el mismo orden. El catálogo se manda como bloque cacheable en
    // el prompt: si el orden bailara, el texto cambiaría de bytes entre
    // llamadas y la caché nunca coincidiría con la de antes.
    .order("slug");

  if (catalogError || !catalog?.length) {
    return json({ error: "No se pudo leer el catálogo de ejercicios" }, 500);
  }

  // Solo el ciclo aprobado por el usuario. Un borrador sin aceptar no debe
  // decidir sus entrenamientos.
  const { data: cycle } = await supabase
    .from("weekly_splits")
    .select("id, name, rationale, cycle")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sesiones = (cycle?.cycle ?? []) as {
    position: number;
    label: string;
    focus: string;
  }[];

  /**
   * Cuál toca de la rotación.
   *
   * La siguiente a la del último entrenamiento COMPLETADO de ESTE ciclo. Se
   * mira lo completado y no lo generado: un plan que se preparó y no se hizo no
   * consume su turno, que es justo lo que hacía que saltarse un día desfasara
   * el reparto en el modelo anterior.
   *
   * Y se filtra por `cycle_id` porque al cambiar de ciclo las posiciones viejas
   * dejan de significar nada: se empieza otra vez por la primera.
   */
  let posicion = 1;

  if (cycle && sesiones.length > 0) {
    const { data: ultimo } = await supabase
      .from("workout_plans")
      .select("cycle_position")
      .eq("user_id", userId)
      .eq("cycle_id", cycle.id)
      .not("completed_at", "is", null)
      .not("cycle_position", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let previa = ultimo?.cycle_position as number | null | undefined;

    /**
     * Sin ningún entrenamiento de ESTE ciclo, la rotación no tiene dónde
     * anclarse y empezaría por la primera sesión. Eso repite lo que el usuario
     * acaba de hacer si su último entrenamiento fue justo ese foco, que es lo
     * que pasa siempre al aprobar el primer ciclo: los planes anteriores no
     * tienen `cycle_id` porque se generaron sin ciclo.
     *
     * Así que se mira el último completado aunque no pertenezca al ciclo, y se
     * deduce qué sesión fue por los grupos musculares que trabajó. Si no se
     * parece a ninguna con claridad, se empieza por la primera como antes.
     */
    if (!previa) {
      const { data: suelto } = await supabase
        .from("workout_plans")
        .select("plan_exercises ( exercises ( muscle_group ) )")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        // Un compartido es una sesión ocasional, no una parada de la rotación.
        .neq("source", "shared")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const grupos = ((suelto?.plan_exercises ?? []) as {
        exercises: { muscle_group: string } | null;
      }[])
        .map((item) => item.exercises?.muscle_group)
        .filter((group): group is string => Boolean(group));

      previa = sesionQueEncaja(grupos, sesiones);
    }

    // El módulo protege de una posición mayor que el ciclo, que puede quedar
    // guardada si el ciclo se rehizo más corto con el mismo id.
    posicion = previa ? (previa % sesiones.length) + 1 : 1;
  }

  const history = await recentHistory(supabase, userId);

  const quota = await consumeAiUsage(supabase, userId, "workout");
  if (quota === null) {
    return json({ error: "No se pudo comprobar tu límite de uso" }, 500);
  }
  if (!quota) {
    return json(
      { error: "Has alcanzado el límite de 3 entrenamientos generados hoy. Vuelve mañana." },
      429,
    );
  }

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
      // El prompt de sistema no cambia nunca: es el mismo texto para
      // cualquier usuario, cualquier día. `cache_control` le dice a la API
      // que lo recuerde; si vuelve a aparecer igual en otra llamada dentro de
      // la ventana de caché, se cobra a una fracción del precio normal.
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      output_config: {
        format: { type: "json_schema", schema: planSchema },
      },
      messages: [
        {
          role: "user",
          content: buildPrompt(catalog, profile, sesiones, cycle?.name ?? null, posicion, history, focusHint),
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
      // De dónde salió: es lo que permite saber cuál toca la próxima vez sin
      // depender de fechas ni de días de la semana.
      ...(cycle ? { cycle_id: cycle.id, cycle_position: posicion } : {}),
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
        set_targets: sanearProgresion(item),
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

/** Sin tildes y en minúsculas, para comparar "tríceps" con "triceps". */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Dos palabras son el mismo músculo si una empieza por la otra: así "gemelo"
 * encaja con "gemelos" y "cuadriceps" con "cuadricep". El mínimo de cuatro
 * letras evita que "gen" case con cualquier cosa.
 */
const mismoMusculo = (a: string, b: string) =>
  a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));

/**
 * Qué sesión del ciclo se parece más a los grupos musculares de un
 * entrenamiento, o `null` si ninguna encaja.
 *
 * Se usa solo para anclar la rotación cuando el último entrenamiento no
 * pertenece al ciclo. Es una heurística, así que ante la duda —ninguna
 * coincidencia, o dos sesiones empatadas— devuelve `null` y la rotación
 * empieza por la primera, que es el comportamiento de siempre.
 */
function sesionQueEncaja(
  grupos: string[],
  sesiones: { position: number; label: string; focus: string }[],
): number | null {
  if (grupos.length === 0) return null;

  const musculos = grupos.map(normalizar);

  const puntuadas = sesiones.map((sesion) => {
    const palabras = normalizar(`${sesion.label} ${sesion.focus}`)
      .split(/[^a-z]+/)
      .filter((palabra) => palabra.length >= 4);

    const aciertos = musculos.filter((musculo) =>
      palabras.some((palabra) => mismoMusculo(musculo, palabra)),
    ).length;

    return { position: sesion.position, aciertos };
  });

  const mejor = puntuadas.reduce((a, b) => (b.aciertos > a.aciertos ? b : a));

  /**
   * Se exige coincidencia MAYORITARIA, no cualquier parecido: un
   * entrenamiento con un ejercicio de pecho y otro de espalda encaja "un
   * poco" con Push y con Pull, y ahí adivinar es peor que no hacer nada.
   */
  if (mejor.aciertos * 2 <= musculos.length) return null;

  /**
   * Un empate no impide decidir, al contrario: dos sesiones empatan porque
   * trabajan lo mismo —un ciclo de cinco días repite Push y Pierna—, así que
   * la siguiente a cualquiera de ellas sirve igual para no repetir foco. Se
   * coge la primera para que el resultado sea siempre el mismo.
   */
  return Math.min(
    ...puntuadas
      .filter((item) => item.aciertos === mejor.aciertos)
      .map((item) => item.position),
  );
}

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

async function consumeAiUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: "workout",
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

interface CatalogItem {
  slug: string;
  name: string;
  muscle_group: string;
  is_bodyweight: boolean;
  equipment: string;
  pattern: string;
  is_compound: boolean;
}

function buildPrompt(
  catalog: CatalogItem[],
  profile: Record<string, unknown> | null,
  sesiones: { position: number; label: string; focus: string }[],
  cicloNombre: string | null,
  posicion: number,
  history: unknown[],
  focusHint?: string,
) {
  const sesion = sesiones.find((item) => item.position === posicion);

  const splitText = sesiones.length
    ? [
        `Ciclo de entrenamiento vigente: ${cicloNombre ?? "sin nombre"}`,
        ...sesiones.map(
          (item) =>
            `- Sesión ${item.position}: ${item.label} (${item.focus})${
              item.position === posicion ? "  <-- LE TOCA ESTA" : ""
            }`,
        ),
        sesion
          ? `Le toca la sesión ${sesion.position}, ${sesion.label}: ${sesion.focus}. Cíñete a eso.`
          : "No se pudo determinar qué sesión le toca: elige tú el foco según lo que lleve más tiempo sin trabajar.",
      ].join("\n")
    : "Todavía no tiene ciclo de entrenamiento: elige tú el foco según lo que lleve más tiempo sin trabajar.";

  /**
   * La última línea del mensaje, con el foco repetido.
   *
   * El ciclo va arriba, antes del catálogo entero y del historial, y a esa
   * distancia una instrucción pierde fuerza. Lo último que se lee pesa mucho
   * más, así que la sesión vuelve a nombrarse aquí en vez de cerrar con un
   * "diseña el entrenamiento" que no recuerda nada.
   */
  const cierre = sesion
    ? `Diseña esta sesión. Le toca ${sesion.label} — ${sesion.focus}. La sesión entera tiene que ser de eso.`
    : "Diseña el entrenamiento de hoy.";

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

  // Sin sangría: la indentación de `JSON.stringify(x, null, 2)` es puro
  // relleno para un modelo, que lee el JSON igual de bien compacto. En un
  // historial con varias sesiones y series anidadas, la diferencia no es
  // menor.
  const historyText =
    history.length > 0
      ? JSON.stringify(history)
      : "Sin sesiones registradas todavía: es su primer entrenamiento.";

  const rest = `Perfil del usuario:
${profileText}

${splitText}

Últimas sesiones del usuario (más reciente primero):
${historyText}

${focusHint ? `El usuario quiere centrarse hoy en: ${focusHint}\n` : ""}
${cierre}`;

  /**
   * El catálogo va como bloque propio, delante de todo lo demás, y marcado
   * para caché.
   *
   * Solo hay tres catálogos posibles —uno por material— y son idénticos para
   * cualquier usuario con el mismo. Separarlo del resto del mensaje permite
   * que, si otra llamada reciente mandó exactamente este mismo bloque, se
   * cobre a una fracción del precio en vez de precio completo. El resto del
   * mensaje sí cambia en cada llamada, así que va sin marcar, después.
   */
  return [
    {
      type: "text" as const,
      text: `Catálogo de ejercicios disponible:\n${catalogText}`,
      cache_control: { type: "ephemeral" as const },
    },
    { type: "text" as const, text: rest },
  ];
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
    // Escrito por el usuario con sus palabras. Va justo detrás de la etiqueta
    // porque la matiza: "ganar músculo" no dice lo mismo que "ganar músculo y
    // mejorar mi velocidad para el fútbol".
    profile.goal_notes && `- Lo que quiere conseguir, en sus palabras: "${profile.goal_notes}"`,
    areas?.length && `- Quiere priorizar: ${areas.join(", ")}`,
    profile.experience && `- Experiencia: ${profile.experience}`,
    profile.technique_level &&
      `- Técnica en los básicos (sentadilla, peso muerto, press): ${profile.technique_level}`,
    days?.length && `- Días que entrena: ${days.join(", ")}`,
    profile.session_minutes &&
      `- Minutos por sesión: ${profile.session_minutes} (el volumen tiene que caber aquí)`,
    profile.equipment && `- Material: ${profile.equipment}`,
    // El deporte de fuera ya mete carga que el plan no debería duplicar: quien
    // juega al fútbol dos días llega con las piernas cargadas.
    profile.sport &&
      profile.sport !== "ninguno" &&
      `- Practica ${profile.sport}${
        profile.sport_days ? ` ${profile.sport_days} días por semana` : ""
      } además del gimnasio`,
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
