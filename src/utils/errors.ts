/**
 * Saca un mensaje legible de cualquier cosa que se haya lanzado.
 *
 * No basta con `error instanceof Error`: los errores de supabase-js son
 * objetos planos (`PostgrestError`, `FunctionsError`) con `message`, `code` y
 * `hint`, y no heredan de Error. Comprobar solo la instancia hacía que todos
 * los fallos de base de datos se mostraran como "error desconocido", que es
 * justo la información que hace falta para arreglarlos.
 */
export function errorMessage(
  error: unknown,
  fallback = "Error desconocido"
): string {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const { message, hint, code } = error as {
      message?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    if (typeof message === "string" && message.length > 0) {
      // El `hint` de PostgREST suele decir exactamente qué falta.
      const detail = typeof hint === "string" && hint ? ` (${hint})` : "";
      const reference = typeof code === "string" && code ? ` [${code}]` : "";

      return `${message}${detail}${reference}`;
    }
  }

  return fallback;
}
