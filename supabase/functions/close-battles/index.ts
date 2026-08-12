// Cierra las batallas cuyo plazo ha vencido y avisa del resultado.
//
// Quién gana lo decide entero `close_due_battles()` en la base: cierra las
// vencidas, calcula la clasificación con la misma fórmula que ve la app y
// guarda el ganador. Aquí solo se recoge lo que ha cerrado y se avisa.
//
// De paso caducan las salas de espera que llevan más de una semana sin
// arrancar, para que su creador no se quede sin poder crear otra.
//
// La llama un cron cada hora, no la app. Va protegida por `CRON_SECRET` igual
// que `send-reminders`: cerrar batallas ajenas no puede quedar al alcance de
// quien conozca la URL.
//
// Desplegar:
//   supabase functions deploy close-battles --use-api --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Primero lo barato, y aparte: que falle avisar no debe impedir la limpieza.
  const { error: caducarError } = await supabase.rpc("expire_stale_lobbies");
  if (caducarError) {
    console.error("Fallo caducando salas de espera", caducarError);
  }

  const { data: cerradas, error } = await supabase.rpc("close_due_battles");

  if (error) {
    console.error("Fallo cerrando batallas", error);
    return json({ error: "No se pudieron cerrar" }, 500);
  }

  const batallas = (cerradas ?? []) as { battle: string; winner: string | null }[];

  if (batallas.length === 0) {
    return json({ closed: 0, sent: 0 }, 200);
  }

  const mensajes: { to: string; sound: string; title: string; body: string; data: unknown }[] = [];

  for (const batalla of batallas) {
    const { data: participantes } = await supabase
      .from("battle_participants")
      .select("user_id")
      .eq("battle_id", batalla.battle);

    const ids = (participantes ?? []).map((fila) => fila.user_id as string);
    if (ids.length === 0) continue;

    const { data: nombre } = await supabase
      .from("battles")
      .select("name")
      .eq("id", batalla.battle)
      .maybeSingle();

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, user_id")
      .in("user_id", ids);

    for (const fila of tokens ?? []) {
      const gano = fila.user_id === batalla.winner;

      mensajes.push({
        to: fila.token as string,
        sound: "default",
        title: gano ? "¡Has ganado!" : "Batalla terminada",
        body: gano
          ? `Primero en "${nombre?.name ?? "la batalla"}". Bien jugado.`
          : `Ya está el resultado de "${nombre?.name ?? "la batalla"}".`,
        data: { screen: "battles" },
      });
    }
  }

  let enviados = 0;
  const caducados: string[] = [];

  for (let i = 0; i < mensajes.length; i += BATCH_SIZE) {
    const lote = mensajes.slice(i, i + BATCH_SIZE);

    try {
      const respuesta = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lote),
      });

      const resultado = await respuesta.json();

      (resultado.data ?? []).forEach((recibo: {
        status: string;
        details?: { error?: string };
      }, indice: number) => {
        if (recibo.status === "ok") {
          enviados++;
          return;
        }

        if (recibo.details?.error === "DeviceNotRegistered") {
          caducados.push(lote[indice].to);
        }
      });
    } catch (fallo) {
      console.error("Fallo mandando un lote a Expo", fallo);
    }
  }

  if (caducados.length > 0) {
    await supabase.from("push_tokens").delete().in("token", caducados);
  }

  return json({ closed: batallas.length, sent: enviados }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
