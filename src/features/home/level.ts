import { TrainingStats } from "@/services/home";

/**
 * Reglas de nivel. Son un punto de partida deliberadamente simple y están
 * todas aquí para poder ajustarlas sin tocar la interfaz.
 *
 * Terminar la sesión pesa mucho más que una serie suelta: lo que queremos
 * premiar es la constancia, no el volumen bruto.
 */
export const EXP_PER_SESSION = 50;
export const EXP_PER_SET = 5;
export const EXP_PER_LEVEL = 500;

export interface LevelProgress {
  level: number;
  percent: number;
  /** EXP acumulada dentro del nivel actual, de 0 a EXP_PER_LEVEL. */
  expIntoLevel: number;
  expToNext: number;
  totalExp: number;
}

/**
 * Nombre del rango. Es lo que hace que un número suelto signifique algo:
 * "Nivel 6" no dice nada, "Avanzado" sí.
 */
export function levelName(level: number): string {
  if (level < 3) return "Principiante";
  if (level < 6) return "En progreso";
  if (level < 10) return "Intermedio";
  if (level < 16) return "Avanzado";
  if (level < 25) return "Experto";

  return "Élite";
}

export function levelFromStats(stats: TrainingStats): LevelProgress {
  const totalExp =
    stats.finishedSessions * EXP_PER_SESSION +
    stats.completedSets * EXP_PER_SET;

  // El nivel empieza en 1, no en 0: nadie quiere ser nivel 0 el primer día.
  const level = Math.floor(totalExp / EXP_PER_LEVEL) + 1;
  const intoLevel = totalExp % EXP_PER_LEVEL;

  return {
    level,
    percent: Math.round((intoLevel / EXP_PER_LEVEL) * 100),
    expIntoLevel: intoLevel,
    expToNext: EXP_PER_LEVEL - intoLevel,
    totalExp,
  };
}
