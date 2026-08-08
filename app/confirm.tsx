import { AuthScreen } from "@/features/auth/AuthScreen";

/**
 * Destino del enlace del correo de confirmación de cuenta.
 *
 * Igual que `reset-password`, existe porque expo-router navega al camino del
 * enlace: sin un archivo aquí enseña "Unmatched Route" por encima de todo
 * aunque la confirmación haya ido bien.
 *
 * Normalmente no llega a verse. Al confirmar, la sesión queda abierta y el
 * layout raíz manda al usuario a la bienvenida o a la app.
 */
export default function ConfirmPage() {
  return <AuthScreen />;
}
