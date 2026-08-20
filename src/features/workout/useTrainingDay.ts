import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useRecentSessions } from "@/features/home/queries";
import { useProfile } from "@/features/onboarding/queries";
import { estadoDeHoy, type EstadoDeHoy } from "./schedule";
import { useLatestPlan } from "./queries";

/**
 * En qué punto del día está el usuario: si ya entrenó, si le toca descansar, si
 * tiene el entrenamiento listo o si le toca prepararlo.
 *
 * Lo usan Inicio y la pestaña Entrenar, y tienen que coincidir: si la tarjeta
 * de Inicio esconde el botón pero la pestaña sigue generando, la regla no
 * existe. Toda la lógica vive en `schedule.ts`; aquí solo se reúnen los datos y
 * se lleva la hora.
 *
 * No hace ninguna consulta nueva: las tres que necesita ya están cargadas y
 * React Query las comparte por clave.
 */
export function useTrainingDay(): { estado: EstadoDeHoy; cargando: boolean } {
  const { data: profile, isPending: perfilPendiente } = useProfile();
  const { data: plan, isPending: planPendiente } = useLatestPlan();
  const { data: sesiones, isPending: sesionesPendientes } = useRecentSessions();

  const [ahora, setAhora] = useState(() => new Date());

  const estado = estadoDeHoy({
    planPendiente: Boolean(plan && !plan.completedAt),
    sesiones,
    diasEntreno: profile?.training_days,
    ahora,
  });

  // La cuenta atrás avanza por minutos. Al segundo sería un reloj de bomba en
  // la pantalla de inicio, y ocho horas de re-renders por nada.
  const contando = estado.estado === "hecho";

  useEffect(() => {
    if (!contando) return;

    const id = setInterval(() => setAhora(new Date()), 60_000);

    return () => clearInterval(id);
  }, [contando]);

  // Con la app en segundo plano los intervalos no corren, así que a las 00:05
  // la tarjeta seguiría diciendo que faltan minutos para mañana. Al volver se
  // vuelve a mirar la hora, y de paso se recalcula el día.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") setAhora(new Date());
    });

    return () => sub.remove();
  }, []);

  return {
    estado,
    // Mientras falten datos no se enseña nada definitivo: sin las sesiones,
    // "ya entrenaste hoy" se leería primero como "toca entrenar" y la tarjeta
    // cambiaría sola delante del usuario.
    cargando: perfilPendiente || planPendiente || sesionesPendientes,
  };
}
