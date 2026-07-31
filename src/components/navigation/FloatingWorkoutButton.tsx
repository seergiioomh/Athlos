import { Dumbbell01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";

import { Colors as HomeColors } from "@/theme/colors";

interface Props {
  focused: boolean;
  onPress: () => void;
}

export function FloatingWorkoutButton({
  focused,
  onPress,
}: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(focused ? 1.08 : 1),
      },
    ],
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.button,
          focused && styles.focusedButton,
          animatedStyle,
        ]}
      >
        <HugeiconsIcon
          icon={Dumbbell01Icon}
          size={28}
          strokeWidth={focused ? 2.2 : 1.8}
          color={focused ? HomeColors.primary : HomeColors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  focusedButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  
});
