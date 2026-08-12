import { Colors } from "@/theme/colors";

/**
 * Las métricas que calcula `achievement_metrics()`. Los nombres coinciden con
 * las columnas que devuelve, en camelCase.
 */
export interface AchievementMetrics {
  sessionsFinished: number;
  totalSets: number;
  totalVolumeKg: number;
  distinctExercises: number;
  distinctMuscleGroups: number;
  maxWeightKg: number;
  weightEntries: number;
  sharedWorkouts: number;
  earlySessions: number;
  lateSessions: number;
  weekendSessions: number;
  longSessions: number;
  cycleLaps: number;
  battlesPlayed: number;
  battlesWon: number;
}

export type MetricKey = keyof AchievementMetrics;

/**
 * Las familias ordenan la pantalla y dan color. Son pocas a propósito: con
 * quince categorías la rejilla deja de leerse de un vistazo.
 */
export const FAMILIES = [
  { key: "primeras", label: "Primeras veces", color: Colors.primary },
  { key: "constancia", label: "Constancia", color: Colors.orange },
  { key: "fuerza", label: "Fuerza", color: Colors.pink },
  { key: "volumen", label: "Volumen", color: Colors.blue },
  { key: "exploracion", label: "Exploración", color: Colors.teal },
  { key: "momentos", label: "Momentos", color: Colors.purple },
  { key: "batallas", label: "Batallas", color: Colors.orange },
] as const;

export type FamilyKey = (typeof FAMILIES)[number]["key"];

export interface Achievement {
  slug: string;
  name: string;
  /** Qué hay que hacer. Se lee bloqueado, así que va en futuro. */
  hint: string;
  family: FamilyKey;
  metric: MetricKey;
  threshold: number;
  /** Nombre del icono de Hugeicons, resuelto en el componente. */
  icon: string;
}

/**
 * El catálogo.
 *
 * Todos siguen la misma forma —una métrica y un umbral— para que añadir uno
 * sea una línea y no un caso especial. Si algún día hace falta un logro que no
 * encaje en "métrica >= número", mejor darle su propio campo que retorcer este.
 *
 * Los umbrales bajos existen a propósito: el primer logro tiene que caer el
 * primer día. Una rejilla entera en gris no motiva a nadie.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // ------------------------------------------------------- primeras veces
  {
    slug: "primer-entrenamiento",
    name: "El primero",
    hint: "Termina tu primer entrenamiento.",
    family: "primeras",
    metric: "sessionsFinished",
    threshold: 1,
    icon: "dumbbell",
  },
  {
    slug: "primer-peso",
    name: "A la báscula",
    hint: "Anota tu peso por primera vez.",
    family: "primeras",
    metric: "weightEntries",
    threshold: 1,
    icon: "scale",
  },
  {
    slug: "primer-compartido",
    name: "En compañía",
    hint: "Haz un entrenamiento que te haya pasado alguien.",
    family: "primeras",
    metric: "sharedWorkouts",
    threshold: 1,
    icon: "share",
  },

  // ----------------------------------------------------------- constancia
  {
    slug: "diez-sesiones",
    name: "Cogiendo el ritmo",
    hint: "Termina 10 entrenamientos.",
    family: "constancia",
    metric: "sessionsFinished",
    threshold: 10,
    icon: "rocket",
  },
  {
    slug: "veinticinco-sesiones",
    name: "Ya es costumbre",
    hint: "Termina 25 entrenamientos.",
    family: "constancia",
    metric: "sessionsFinished",
    threshold: 25,
    icon: "medal",
  },
  {
    slug: "cincuenta-sesiones",
    name: "Medio centenar",
    hint: "Termina 50 entrenamientos.",
    family: "constancia",
    metric: "sessionsFinished",
    threshold: 50,
    icon: "flame",
  },
  {
    slug: "cien-sesiones",
    name: "Centenario",
    hint: "Termina 100 entrenamientos.",
    family: "constancia",
    metric: "sessionsFinished",
    threshold: 100,
    icon: "crown",
  },
  {
    slug: "vuelta-al-ciclo",
    name: "Vuelta completa",
    hint: "Completa tu ciclo entero una vez.",
    family: "constancia",
    metric: "cycleLaps",
    threshold: 1,
    icon: "repeat",
  },
  {
    slug: "cinco-vueltas",
    name: "Cinco vueltas",
    hint: "Completa tu ciclo entero cinco veces.",
    family: "constancia",
    metric: "cycleLaps",
    threshold: 5,
    icon: "refresh",
  },

  // --------------------------------------------------------------- fuerza
  {
    slug: "sesenta-kilos",
    name: "Sesenta",
    hint: "Levanta 60 kg en una serie.",
    family: "fuerza",
    metric: "maxWeightKg",
    threshold: 60,
    icon: "biceps",
  },
  {
    slug: "cien-kilos",
    name: "Tres dígitos",
    hint: "Levanta 100 kg en una serie.",
    family: "fuerza",
    metric: "maxWeightKg",
    threshold: 100,
    icon: "kettlebell",
  },
  {
    slug: "ciento-cuarenta-kilos",
    name: "Bestia",
    hint: "Levanta 140 kg en una serie.",
    family: "fuerza",
    metric: "maxWeightKg",
    threshold: 140,
    icon: "weight",
  },
  {
    slug: "mil-series",
    name: "Mil series",
    hint: "Registra 1.000 series.",
    family: "fuerza",
    metric: "totalSets",
    threshold: 1000,
    icon: "target",
  },

  // -------------------------------------------------------------- volumen
  {
    slug: "una-tonelada",
    name: "Una tonelada",
    hint: "Mueve 1.000 kg en total.",
    family: "volumen",
    metric: "totalVolumeKg",
    threshold: 1000,
    icon: "chart-up",
  },
  {
    slug: "diez-toneladas",
    name: "Diez toneladas",
    hint: "Mueve 10.000 kg en total.",
    family: "volumen",
    metric: "totalVolumeKg",
    threshold: 10000,
    icon: "chart-max",
  },
  {
    slug: "cincuenta-toneladas",
    name: "Cincuenta toneladas",
    hint: "Mueve 50.000 kg en total.",
    family: "volumen",
    metric: "totalVolumeKg",
    threshold: 50000,
    icon: "chart",
  },
  {
    slug: "cien-toneladas",
    name: "Cien toneladas",
    hint: "Mueve 100.000 kg en total.",
    family: "volumen",
    metric: "totalVolumeKg",
    threshold: 100000,
    icon: "award",
  },

  // ---------------------------------------------------------- exploración
  {
    slug: "diez-ejercicios",
    name: "Curioso",
    hint: "Prueba 10 ejercicios distintos.",
    family: "exploracion",
    metric: "distinctExercises",
    threshold: 10,
    icon: "search-focus",
  },
  {
    slug: "veinticinco-ejercicios",
    name: "De todo un poco",
    hint: "Prueba 25 ejercicios distintos.",
    family: "exploracion",
    metric: "distinctExercises",
    threshold: 25,
    icon: "search-visual",
  },
  {
    slug: "cincuenta-ejercicios",
    name: "Lo has probado todo",
    hint: "Prueba 50 ejercicios distintos.",
    family: "exploracion",
    metric: "distinctExercises",
    threshold: 50,
    icon: "search",
  },
  {
    slug: "diez-grupos",
    name: "Cuerpo entero",
    hint: "Trabaja 10 grupos musculares distintos.",
    family: "exploracion",
    metric: "distinctMuscleGroups",
    threshold: 10,
    icon: "body",
  },

  // ------------------------------------------------------------- momentos
  {
    slug: "madrugador",
    name: "Madrugador",
    hint: "Entrena antes de las 7 de la mañana.",
    family: "momentos",
    metric: "earlySessions",
    threshold: 1,
    icon: "sunrise",
  },
  {
    slug: "nocturno",
    name: "Nocturno",
    hint: "Entrena después de las 10 de la noche.",
    family: "momentos",
    metric: "lateSessions",
    threshold: 1,
    icon: "moon",
  },
  {
    slug: "findes",
    name: "Sin excusas",
    hint: "Entrena 10 fines de semana.",
    family: "momentos",
    metric: "weekendSessions",
    threshold: 10,
    icon: "calendar",
  },
  {
    slug: "maraton",
    name: "Maratón",
    hint: "Aguanta más de 90 minutos en una sesión.",
    family: "momentos",
    metric: "longSessions",
    threshold: 1,
    icon: "clock",
  },

  // ------------------------------------------------------------- batallas
  {
    slug: "primer-duelo",
    name: "Primer duelo",
    hint: "Participa en tu primera batalla.",
    family: "batallas",
    metric: "battlesPlayed",
    threshold: 1,
    icon: "sword",
  },
  {
    slug: "habitual-del-ring",
    name: "Habitual del ring",
    hint: "Participa en 5 batallas.",
    family: "batallas",
    metric: "battlesPlayed",
    threshold: 5,
    icon: "flag",
  },
  {
    slug: "primera-victoria",
    name: "Primera victoria",
    hint: "Gana una batalla.",
    family: "batallas",
    metric: "battlesWon",
    threshold: 1,
    icon: "champion",
  },
  {
    slug: "rey-del-ring",
    name: "Rey del ring",
    hint: "Gana 3 batallas.",
    family: "batallas",
    metric: "battlesWon",
    threshold: 3,
    icon: "laurel",
  },
];

export const achievementBySlug = (slug: string): Achievement | undefined =>
  ACHIEVEMENTS.find((achievement) => achievement.slug === slug);

export const familyColor = (family: FamilyKey): string =>
  FAMILIES.find((item) => item.key === family)?.color ?? Colors.primary;

/** Los slugs que las métricas dan por conseguidos, en el orden del catálogo. */
export function earnedSlugs(metrics: AchievementMetrics): string[] {
  return ACHIEVEMENTS.filter(
    (achievement) => metrics[achievement.metric] >= achievement.threshold
  ).map((achievement) => achievement.slug);
}

/**
 * Cuánto falta, de 0 a 1. Sirve para la barra de los bloqueados: "llevas 7 de
 * 10" motiva bastante más que un candado.
 */
export function progressOf(
  achievement: Achievement,
  metrics: AchievementMetrics
): number {
  if (achievement.threshold <= 0) return 1;

  return Math.min(1, metrics[achievement.metric] / achievement.threshold);
}
