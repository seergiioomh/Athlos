export type Point = readonly [number, number];

/**
 * Convierte una serie de puntos en una curva suave (Catmull-Rom expresada
 * como curvas de Bézier), en vez de unirlos con segmentos rectos.
 *
 * `tension` controla cuánto se redondean los vértices: 0 devuelve una
 * polilínea recta y 1 es la curva de Catmull-Rom clásica, que con datos muy
 * quebrados puede sobrepasar ligeramente los puntos.
 */
export function smoothPath(points: Point[], tension = 0.85): string {
  if (points.length === 0) return "";

  const [start] = points;
  if (points.length === 1) return `M${start[0]} ${start[1]}`;

  let path = `M${start[0]} ${start[1]}`;

  for (let index = 0; index < points.length - 1; index++) {
    // En los extremos no hay vecino anterior o siguiente: se reutiliza el
    // propio punto, de modo que la curva entra y sale sin tirones.
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;

    const control1X = current[0] + ((next[0] - previous[0]) / 6) * tension;
    const control1Y = current[1] + ((next[1] - previous[1]) / 6) * tension;
    const control2X = next[0] - ((after[0] - current[0]) / 6) * tension;
    const control2Y = next[1] - ((after[1] - current[1]) / 6) * tension;

    path += ` C${control1X} ${control1Y} ${control2X} ${control2Y} ${next[0]} ${next[1]}`;
  }

  return path;
}
