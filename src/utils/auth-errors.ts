import { errorMessage } from "./errors";

/**
 * Traduce los errores de Supabase Auth, que llegan siempre en inglés.
 *
 * Sin esto la pantalla de acceso enseña "Invalid login credentials" tal cual,
 * que es lo que veía el usuario hasta ahora.
 *
 * Se mira primero `code`, que es estable, y solo después el texto del mensaje:
 * los textos de Supabase cambian entre versiones, los códigos no.
 */

const POR_CODIGO: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed:
    "Todavía no has confirmado tu correo. Abre el enlace que te enviamos y vuelve a intentarlo.",
  user_already_exists: "Ya existe una cuenta con este correo.",
  email_exists: "Ya existe una cuenta con este correo.",
  user_not_found: "No hay ninguna cuenta con este correo.",
  otp_expired: "El código ha caducado. Pide uno nuevo.",
  same_password: "La contraseña nueva tiene que ser distinta de la anterior.",
  weak_password: "La contraseña es demasiado débil. Prueba con una más larga.",
  over_email_send_rate_limit:
    "Has pedido demasiados correos seguidos. Espera unos minutos.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento.",
  validation_failed: "Revisa los datos que has escrito.",
  signup_disabled: "El registro está desactivado ahora mismo.",
};

/**
 * Respaldo por texto, para los errores que llegan sin código. El orden importa:
 * se devuelve la primera coincidencia.
 */
const POR_TEXTO: [RegExp, string][] = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/already registered|already exists/i, "Ya existe una cuenta con este correo."],
  [
    /email not confirmed/i,
    "Todavía no has confirmado tu correo. Abre el enlace que te enviamos y vuelve a intentarlo.",
  ],
  [/token has expired|invalid.*token|otp.*expired/i, "El código no es válido o ha caducado. Pide uno nuevo."],
  [/should be different/i, "La contraseña nueva tiene que ser distinta de la anterior."],
  [
    /password should be at least (\d+)/i,
    "La contraseña es demasiado corta.",
  ],
  [/unable to validate email|invalid format/i, "El correo no tiene un formato válido."],
  [
    /for security purposes.*(\d+) seconds/i,
    "Acabas de pedir un código. Espera unos segundos antes de pedir otro.",
  ],
  [/rate limit/i, "Has hecho demasiados intentos. Espera unos minutos."],
  [
    /network request failed|fetch failed/i,
    "No hay conexión. Comprueba tu red e inténtalo de nuevo.",
  ],
];

function codigoDe(error: unknown): string | null {
  if (error && typeof error === "object") {
    const { code } = error as { code?: unknown };
    if (typeof code === "string" && code) return code;
  }

  return null;
}

export function authErrorMessage(
  error: unknown,
  fallback = "No se pudo completar. Inténtalo de nuevo."
): string {
  const codigo = codigoDe(error);
  if (codigo && POR_CODIGO[codigo]) return POR_CODIGO[codigo];

  // `errorMessage` añade hint y código entre corchetes, que aquí sobran: al
  // usuario solo le sirve la frase.
  const texto = errorMessage(error, "");

  for (const [patron, traduccion] of POR_TEXTO) {
    if (patron.test(texto)) return traduccion;
  }

  return texto || fallback;
}

/**
 * Si el correo ya tiene cuenta, la pantalla no se limita a avisar: cambia sola
 * a modo entrar, que es lo que el usuario quería hacer de todas formas.
 */
export function esCorreoYaRegistrado(error: unknown): boolean {
  const codigo = codigoDe(error);
  if (codigo === "user_already_exists" || codigo === "email_exists") return true;

  return /already registered|already exists/i.test(errorMessage(error, ""));
}
