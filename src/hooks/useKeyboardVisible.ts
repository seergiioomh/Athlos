import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Si el teclado está abierto. Sirve para retirar el hueco que se reserva a
 * la tab bar flotante: mientras el teclado tapa la tab bar, ese hueco sobra
 * y empuja el contenido hacia arriba.
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // En iOS los eventos `will` se disparan a la vez que la animación, así
    // que el ajuste va sincronizado en vez de a tirones.
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
