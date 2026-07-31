import { Colors } from "@/theme/colors";

export interface StreakTier {
  /** Racha mínima para entrar en el escalón. */
  from: number;
  name: string;
  hint: string;
  background: string;
  border: string;
  flame: string;
  text: string;
  glow: string;
  glowOpacity: number;
  /**
   * Solo el escalón final. Cuando está presente, el distintivo pinta este
   * degradado en lugar del color plano de `background`.
   */
  gradient?: readonly [string, string, ...string[]];
}

/**
 * Los escalones siguen una escala de temperatura: arranca apagado, se
 * enciende en el lima de la marca, pasa por el naranja, el rojo y el oro, y
 * termina en azul, que es el color de la llama más caliente. El salto de gama al final es
 * deliberado: a los tres meses el distintivo tiene que dejar de parecerse
 * al de la primera semana.
 *
 * Van de mayor a menor para poder resolver el escalón con un `find`.
 */
export const STREAK_TIERS: StreakTier[] = [
  {
    from: 250,
    name: "Mítico",
    hint: "Doscientos cincuenta. Ya no hay escalón por encima.",
    // Iridiscente: recorre toda la escala anterior de golpe, del lima del
    // principio al azul del final.
    gradient: [Colors.primary, "#FF2D95", Colors.purple, "#22D3EE"],
    background: "#FF2D95",
    border: "rgba(255,255,255,0.85)",
    flame: "#FFFFFF",
    text: "#FFFFFF",
    glow: "#FF2D95",
    glowOpacity: 1,
  },
  {
    from: 150,
    name: "Leyenda",
    hint: "Ciento cincuenta seguidos. Esto ya no lo hace casi nadie.",
    background: "#2A1040",
    border: "#C084FC",
    flame: "#E9D5FF",
    text: "#F3E8FF",
    glow: "#A855F7",
    glowOpacity: 0.9,
  },
  {
    from: 85,
    name: "Llama azul",
    hint: "Ochenta y cinco sin fallar. El fuego más caliente.",
    background: "#10243F",
    border: "#4DA6FF",
    flame: "#7FC4FF",
    text: "#CFE7FF",
    glow: "#3B82F6",
    glowOpacity: 0.85,
  },
  {
    from: 50,
    name: "Esmeralda",
    hint: "Cincuenta entrenamientos. Ya no dependes de las ganas.",
    background: "#0B3B2E",
    border: "#34D399",
    flame: "#6EE7B7",
    text: "#A7F3D0",
    glow: "#10B981",
    glowOpacity: 0.75,
  },
  {
    from: 30,
    name: "Oro",
    hint: "Treinta seguidos. Esto ya no es motivación, es hábito.",
    background: "#6A3A05",
    border: "#FFC24D",
    flame: "#FFD066",
    text: "#FFE9B8",
    glow: "#FFC24D",
    glowOpacity: 0.7,
  },
  {
    from: 18,
    name: "Al rojo",
    hint: "Dieciocho seguidos. Ahora sí que se nota.",
    background: "#5E1B0B",
    border: "#FF3B1F",
    flame: "#FF7A5A",
    text: "#FFC7B8",
    glow: "#FF3B1F",
    glowOpacity: 0.6,
  },
  {
    from: 10,
    name: "Imparable",
    hint: "Diez seguidos. Aguanta el ritmo.",
    background: "rgba(255,159,10,0.18)",
    border: Colors.primary,
    flame: Colors.orange,
    text: "#FFCF8A",
    glow: Colors.primary,
    glowOpacity: 0.5,
  },
  {
    from: 6,
    name: "En marcha",
    hint: "Ya es una rutina, no una excepción.",
    background: "rgba(198,244,50,0.16)",
    border: Colors.primary,
    flame: Colors.primary,
    text: Colors.primary,
    glow: Colors.primary,
    glowOpacity: 0.3,
  },
  {
    from: 3,
    name: "Encendido",
    hint: "Tres seguidos. Lo difícil ya pasó.",
    background: Colors.primarySoft,
    border: "rgba(198,244,50,0.35)",
    flame: "#A8CC3A",
    text: "#A8CC3A",
    glow: Colors.primary,
    glowOpacity: 0.15,
  },
  {
    from: 1,
    name: "Chispa",
    hint: "Ha empezado. Vuelve pronto y no la pierdas.",
    background: Colors.primarySoft,
    border: "transparent",
    flame: "#7E9A2E",
    text: "#7E9A2E",
    glow: Colors.primary,
    glowOpacity: 0,
  },
  {
    from: 0,
    name: "Sin racha",
    hint: "Completa un entrenamiento para empezarla.",
    background: Colors.surfaceElevated,
    border: Colors.border,
    flame: Colors.textTertiary,
    text: Colors.textSecondary,
    glow: "#000000",
    glowOpacity: 0,
  },
];

export const streakTier = (streak: number): StreakTier =>
  STREAK_TIERS.find((tier) => streak >= tier.from) ?? STREAK_TIERS[STREAK_TIERS.length - 1];

/**
 * Los escalones de menor a mayor, con el tope de cada uno calculado a partir
 * del siguiente. El tope no se declara para que no pueda quedar descuadrado
 * al mover un `from`.
 */
export function tiersAscending(): (StreakTier & { to: number | null })[] {
  const ascending = [...STREAK_TIERS].reverse();

  return ascending.map((tier, index) => ({
    ...tier,
    to: index < ascending.length - 1 ? ascending[index + 1].from - 1 : null,
  }));
}

/** "6 – 9 días", "250+ días". */
export function rangeLabel(tier: { from: number; to: number | null }): string {
  if (tier.to === null) return `${tier.from}+ días`;
  if (tier.from === tier.to) return `${tier.from} ${tier.from === 1 ? "día" : "días"}`;

  return `${tier.from} – ${tier.to} días`;
}

/** Cuánto falta para el siguiente escalón, o null si ya está en el último. */
export const nextTier = (streak: number): StreakTier | null => {
  const higher = STREAK_TIERS.filter((tier) => tier.from > streak);

  return higher.length > 0 ? higher[higher.length - 1] : null;
};
