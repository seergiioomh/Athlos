import { Colors } from "@/theme/colors";

/**
 * Alias histórico. La paleta vive en `@/theme/colors`; esto existe solo para
 * que los componentes que ya importaban `HomeColors` sigan funcionando sin
 * tener que tocarlos todos a la vez.
 *
 * Para código nuevo, importa `Colors` directamente.
 */
export const HomeColors = Colors;
