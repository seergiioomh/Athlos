import {
    Text as RNText,
    StyleSheet,
    TextProps,
} from "react-native";

import { Colors } from "@/theme/colors";

export function Text(props: TextProps) {
  return (
    <RNText
      {...props}
      style={[styles.text, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: Colors.text,
    fontSize: 16,
  },
});