import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import { SharedWorkoutScreen } from "@/features/workout/SharedWorkoutScreen";
import { decodeWorkout } from "@/features/workout/share";

/**
 * Destino del enlace de "compartir entrenamiento".
 *
 * El entrenamiento viaja dentro del propio enlace, así que se descodifica
 * aquí sin consultar nada: las tablas tienen permisos por usuario y el móvil
 * que recibe no podría leer el plan del que lo comparte ni aunque supiera su
 * id.
 */
export default function SharedWorkoutPage() {
  const params = useLocalSearchParams<{ w?: string }>();

  const shared = useMemo(() => {
    if (!params.w) return null;

    // `decodeWorkout` espera la URL entera porque también se le llama desde
    // el escuchador de enlaces; aquí se le reconstruye una equivalente.
    return decodeWorkout(
      `athlos://shared-workout?w=${encodeURIComponent(params.w)}`
    );
  }, [params.w]);

  return <SharedWorkoutScreen shared={shared} />;
}
