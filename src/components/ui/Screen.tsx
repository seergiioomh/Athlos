import { Colors } from "@/theme/colors";
import { SafeAreaView, StyleSheet } from "react-native";

type Props = {
  children: React.ReactNode;
};

export function Screen({ children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
});