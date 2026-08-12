/** Días que quedan, redondeando hacia arriba: medio día sigue siendo un día. */
export function daysLeft(endsAt: string | null): number {
  if (!endsAt) return 0;

  const ms = new Date(endsAt).getTime() - Date.now();

  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function daysLeftLabel(endsAt: string | null): string {
  const dias = daysLeft(endsAt);

  if (dias === 0) return "Termina hoy";
  if (dias === 1) return "Queda 1 día";

  return `Quedan ${dias} días`;
}

export const points = (value: number) => value.toLocaleString("es-ES");

/** "María G." → "M". Para el círculo del participante. */
export const initial = (name: string) =>
  name.trim().charAt(0).toUpperCase() || "?";
