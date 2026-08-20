/**
 * Cuándo se puede entrenar. Nada de esto decide QUÉ se entrena: eso lo manda
 * el ciclo, y sigue avanzando por entrenamientos hechos, no por días.
 *
 * La separación es la regla importante de este archivo. El calendario solo
 * puede contestar "hoy sí / hoy no"; en cuanto pudiera decir "hoy toca pierna"
 * volveríamos al problema que resolvió `0028_training_cycle.sql`: saltarse un
 * día desfasaba el reparto para siempre.
 *
 * Dos reglas y una es blanda:
 *
 * - **Un entrenamiento por día** (dura). Es objetiva y no depende de lo que el
 *   usuario declarase en su perfil hace meses.
 * - **Los días de descanso avisan, no bloquean** (blanda). `training_days` es
 *   una intención, no un contrato: quien se salta el viernes quiere entrenar el
 *   sábado, y negárselo por respetar un dato que escribió él mismo le arruina
 *   la semana.
 *
 * Todo lo de aquí son funciones puras sobre fechas. Sin React y sin Supabase:
 * es lo que las hace comprobables sin montar media app.
 */

/**
 * Índice = `Date.getDay()`, así que domingo va primero. Es el mismo orden que
 * usa `users_to_remind()` en Postgres; si uno cambia, el otro también.
 */
export const DIAS_SEMANA = [
  "dom",
  "lun",
  "mar",
  "mie",
  "jue",
  "vie",
  "sab",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

const NOMBRE_DIA: Record<DiaSemana, string> = {
  dom: "domingo",
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábado",
};

/** Una sesión ya terminada, tal y como la trae Inicio. */
interface SesionMinima {
  finishedAt: string | null;
}

export const diaDe = (fecha: Date): DiaSemana => DIAS_SEMANA[fecha.getDay()];

const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Si esta fecha cae en uno de los días que el usuario dijo que entrena.
 *
 * Sin días declarados —cuentas antiguas, o quien dejó el campo vacío— todos los
 * días valen. Nunca se bloquea por falta de datos: el silencio no es un "no".
 */
export function esDiaDeEntrenar(
  diasEntreno: string[] | null | undefined,
  fecha: Date
): boolean {
  if (!diasEntreno || diasEntreno.length === 0) return true;

  return diasEntreno.includes(diaDe(fecha));
}

/**
 * El siguiente día de entreno a partir de mañana, con cuántos días faltan.
 *
 * Null si no hay ninguno o si son todos: en los dos casos no hay nada que
 * anunciar. Mira siete días y para; con más, el array o está vacío o repite.
 */
export function proximoDiaDeEntrenar(
  diasEntreno: string[] | null | undefined,
  desde: Date
): { dia: DiaSemana; enDias: number } | null {
  if (!diasEntreno || diasEntreno.length === 0) return null;

  for (let enDias = 1; enDias <= 7; enDias++) {
    const fecha = new Date(desde);
    fecha.setDate(desde.getDate() + enDias);

    if (diasEntreno.includes(diaDe(fecha))) {
      return { dia: diaDe(fecha), enDias };
    }
  }

  return null;
}

/**
 * "mañana", "el jueves". Una semana entera de espera se dice con el número,
 * porque "el jueves" a siete días vista se lee como el jueves de esta semana.
 */
export function nombreProximoDia(proximo: {
  dia: DiaSemana;
  enDias: number;
}): string {
  if (proximo.enDias === 1) return "mañana";
  if (proximo.enDias >= 7) return `dentro de ${proximo.enDias} días`;

  return `el ${NOMBRE_DIA[proximo.dia]}`;
}

/**
 * Si ya terminó algún entrenamiento hoy.
 *
 * Cuenta cualquier sesión, también la de un entrenamiento compartido: si has
 * entrenado, has entrenado. Es la misma condición que usa `users_to_remind()`
 * para no recordarte que entrenes justo después de haber entrenado.
 */
export function haEntrenadoHoy(
  sesiones: SesionMinima[] | undefined,
  ahora: Date
): boolean {
  if (!sesiones) return false;

  return sesiones.some(
    (sesion) =>
      sesion.finishedAt !== null && mismoDia(new Date(sesion.finishedAt), ahora)
  );
}

/**
 * Minutos hasta la medianoche local.
 *
 * A medianoche y no a las 24 horas de terminar. Con un plazo de 24 h, entrenar
 * el lunes a las 20:00 te impide entrenar el martes por la mañana, y eso es
 * penalizar al que madruga. El precio —quien termina a las 00:30 pierde el día
 * nuevo entero— es mucho más raro que el caso que arregla.
 */
export function minutosHastaManana(ahora: Date): number {
  const manana = new Date(ahora);

  // `setHours(24, ...)` cae en las 00:00 del día siguiente en hora local, y
  // sobrevive a los cambios de hora sin sumar milisegundos a mano.
  manana.setHours(24, 0, 0, 0);

  return Math.max(
    0,
    Math.ceil((manana.getTime() - ahora.getTime()) / 60_000)
  );
}

/** "6 h 12 min", "43 min". Sin segundos: es una espera de horas, no un lanzamiento. */
export function cuentaAtras(minutos: number): string {
  if (minutos <= 1) return "menos de un minuto";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/**
 * En qué estado está hoy. Es lo que pinta la tarjeta de Inicio y lo que decide
 * si la pestaña Entrenar puede generar.
 *
 * El orden importa:
 *
 * 1. `hecho` gana a todo. Ya entrenaste; lo demás sobra.
 * 2. `listo` gana al descanso. Si el entrenamiento ya está preparado, decirte
 *    encima que hoy descansas es ruido: esa decisión ya la tomaste.
 * 3. `descanso` solo aparece cuando no hay nada preparado, y deja entrenar.
 */
export type EstadoDeHoy =
  | { estado: "hecho"; minutosRestantes: number }
  | { estado: "listo" }
  | { estado: "descanso"; proximo: { dia: DiaSemana; enDias: number } | null }
  | { estado: "toca" };

export function estadoDeHoy({
  planPendiente,
  sesiones,
  diasEntreno,
  ahora,
}: {
  planPendiente: boolean;
  sesiones: SesionMinima[] | undefined;
  diasEntreno: string[] | null | undefined;
  ahora: Date;
}): EstadoDeHoy {
  if (haEntrenadoHoy(sesiones, ahora)) {
    return { estado: "hecho", minutosRestantes: minutosHastaManana(ahora) };
  }

  if (planPendiente) return { estado: "listo" };

  if (!esDiaDeEntrenar(diasEntreno, ahora)) {
    return { estado: "descanso", proximo: proximoDiaDeEntrenar(diasEntreno, ahora) };
  }

  return { estado: "toca" };
}
