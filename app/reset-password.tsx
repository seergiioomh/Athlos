import { AuthScreen } from "@/features/auth/AuthScreen";

/**
 * Destino del enlace del correo de recuperación.
 *
 * No pinta nada propio: `AuthScreen` ya sabe en qué paso está mirando el
 * estado de la sesión. Esta ruta existe porque expo-router navega al camino
 * del enlace, y sin un archivo aquí enseña "Unmatched Route" por encima de
 * todo aunque la recuperación haya ido bien.
 */
export default function ResetPasswordPage() {
  return <AuthScreen />;
}
