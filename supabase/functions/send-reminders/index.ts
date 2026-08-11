// Manda el recordatorio del día a quien le toca entrenar y aún no lo ha hecho.
//
// La pregunta "¿a quién aviso?" la responde entera `users_to_remind()` en la
// base: es la que sabe la hora local de cada uno, sus días de entrenamiento y
// si ya ha terminado hoy. Aquí solo se recoge esa lista y se manda a Expo.
//
// La llama un cron cada hora, no la app. Va protegida por `CRON_SECRET`
// porque una función que manda notificaciones a todo el mundo no puede quedar
// abierta a quien conozca la URL.
//
// Desplegar:
//   supabase functions deploy send-reminders --use-api --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo acepta como mucho 100 mensajes por petición.
const BATCH_SIZE = 100;

const MENSAJES = [
  "Hoy toca entrenar. ¿Lo dejamos hecho?",
  "Tu entrenamiento de hoy te está esperando.",
  "Un rato y lo tienes. Hoy toca sesión.",
];

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

  const { data: usuarios, error } = await supabase.rpc("users_to_remind");

  if (error) {
    console.error("Fallo leyendo a quién avisar", error);
    return json({ error: "No se pudo leer la lista" }, 500);
  }

  const destinatarios = (usuarios ?? []) as {
    user_id: string;
    display_name: string | null;
    tokens: string[];
  }[];

  if (destinatarios.length === 0) {
    return json({ sent: 0 }, 200);
  }

  const mensajes = destinatarios.flatMap((usuario) => {
    // Rotar el texto por usuario evita que quien entrena cinco días vea la
    // misma frase cinco veces por semana.
    const cuerpo = MENSAJES[Math.floor(Math.random() * MENSAJES.length)];
    const nombre = usuario.display_name?.split(" ")[0];

    return usuario.tokens.map((token) => ({
      to: token,
      sound: "default",
      title: nombre ? `${nombre}, hoy toca` : "Hoy toca entrenar",
      body: cuerpo,
      // Lo lee el móvil al tocar la notificación para abrir la pantalla
      // correcta en vez de dejar al usuario en Inicio.
      data: { screen: "workout" },
    }));
  });

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

      // Expo contesta un recibo por mensaje, en el mismo orden que se enviaron.
      (resultado.data ?? []).forEach((recibo: {
        status: string;
        details?: { error?: string };
      }, indice: number) => {
        if (recibo.status === "ok") {
          enviados++;
          return;
        }

        // El móvil desinstaló la app o el token cambió: guardarlo solo sirve
        // para volver a fallar mañana.
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

  return json({ sent: enviados, pruned: caducados.length }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
