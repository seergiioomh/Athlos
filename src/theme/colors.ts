/**
 * Paleta única de la app, en oscuro.
 *
 * Inspirada en Apple Fitness: negro real de fondo, superficies muy oscuras y
 * un acento principal muy saturado, acompañado de una familia de acentos
 * secundarios que dan variedad sin que cada pantalla parezca de otra app.
 *
 * Antes había dos paletas —una clara en este archivo y una oscura en
 * `features/home/home-theme`— y los componentes mezclaban las dos, así que
 * convivían dos naranjas distintos. Ahora esta es la única, y `HomeColors`
 * reexporta desde aquí.
 */
export const Colors = {
  // ------------------------------------------------------------- acento
  /** Verde lima. Sobre él el texto va en `onPrimary`, nunca en blanco. */
  primary: "#C6F432",
  primaryPressed: "#B0DD24",
  /** Versión translúcida, para fondos de insignias y tarjetas de acento. */
  primarySoft: "rgba(198,244,50,0.14)",
  /** Lima apagado: botones deshabilitados o en curso. */
  primaryMuted: "rgba(198,244,50,0.32)",
  /** Casi negro. Es el color del texto y los iconos sobre el lima. */
  onPrimary: "#0C1102",

  // --------------------------------------------------------- secundarios
  // Cada uno tiene su papel: rosa para el esfuerzo, violeta para la IA,
  // azul para lo informativo, naranja para avisos, turquesa para descanso.
  pink: "#FF375F",
  pinkSoft: "rgba(255,55,95,0.16)",
  purple: "#BF5AF2",
  purpleSoft: "rgba(191,90,242,0.16)",
  blue: "#0A84FF",
  blueSoft: "rgba(10,132,255,0.16)",
  orange: "#FF9F0A",
  /** Naranja más vivo, reservado para el avance de las rachas. */
  orangeStrong: "#FF7A00",
  orangeSoft: "rgba(255,159,10,0.16)",
  teal: "#40D6C8",
  tealSoft: "rgba(64,214,200,0.16)",

  // ------------------------------------------------------------- fondos
  background: "#000000",
  surface: "#141416",
  surfaceElevated: "#1E1E22",
  /** Superficie de énfasis sutil, para señalar el día actual. */
  surfaceHighlight: "#2A2A2E",

  // -------------------------------------------------------------- texto
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  /** Para texto de tercer nivel: pistas, marcas de agua, ejes. */
  textTertiary: "#5A5A60",

  // ------------------------------------------------------------ estados
  success: "#32D74B",
  warning: "#FF9F0A",
  error: "#FF453A",
  /** Texto de error sobre fondo oscuro: el rojo puro no se lee bien. */
  errorText: "#FF8A80",
  errorSoft: "rgba(255,69,58,0.14)",

  // ------------------------------------------------- bordes y gráficas
  border: "#2A2A2E",
  chartGrid: "#232327",

  /** Nombre antiguo, se mantiene para no romper importaciones. */
  primaryLight: "rgba(198,244,50,0.14)",
};
