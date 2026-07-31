import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/theme/colors";

interface AthlosButtonProps {
    title: string;
    onPress?: () => void;
}

export function AthlosButton({
    title,
    onPress,
}: AthlosButtonProps) {
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            style={styles.button}
            onPress={onPress}
        >
            <Text style={styles.title}>{title}</Text>

            <View style={styles.circle}>
                <HugeiconsIcon
                    icon={ArrowRight02Icon}
                    size={26}
                    color={Colors.primary}
                    strokeWidth={2.2}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        marginTop: 24,
        height: 58,
        backgroundColor: Colors.primary,
        borderRadius: 31,

        paddingLeft: 24,
        paddingRight: 5,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    title: {
        color: Colors.onPrimary,
        fontSize: 18,
        fontWeight: "600",
    },

    // Círculo oscuro sobre el lima, con la flecha en lima: el contraste va
    // al revés que antes, cuando el botón era naranja y el círculo blanco.
    circle: {
        width: 50,
        height: 50,
        borderRadius: 28,

        backgroundColor: Colors.onPrimary,

        justifyContent: "center",
        alignItems: "center",
    },
});