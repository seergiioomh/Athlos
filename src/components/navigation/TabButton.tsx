import {
    AnalyticsUpIcon,
    Dumbbell01Icon,
    Home01Icon,
    SparklesIcon,
    UserIcon,
} from "@hugeicons/core-free-icons";
import {
    HugeiconsIcon,
    type IconSvgElement,
} from "@hugeicons/react-native";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    withSpring,
} from "react-native-reanimated";

import { Colors } from "@/theme/colors";

interface Props {
    route: string;
    focused: boolean;
    onPress: () => void;
}

const icons: Record<string, IconSvgElement> = {
    index: Home01Icon,
    coach: SparklesIcon,
    workout: Dumbbell01Icon,
    progress: AnalyticsUpIcon,
    profile: UserIcon,
};

export function TabButton({
    route,
    focused,
    onPress,
}: Props) {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(focused ? 1.12 : 1),
                },
            ],
        };
    });

    return (
        <Pressable onPress={onPress} style={styles.pressable}>
            <Animated.View style={[styles.container, animatedStyle]}>
                <HugeiconsIcon
                    icon={icons[route]}
                    size={24}
                    strokeWidth={focused ? 2.2 : 1.8}
                    color={
                        focused
                            ? Colors.primary
                            : "#8E8E93"
                    }
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pressable: {
        flex: 1,
        alignSelf: "stretch",

        justifyContent: "center",
        alignItems: "center",
    },

    container: {
        width: 48,
        height: 48,

        justifyContent: "center",
        alignItems: "center",
    },
});
