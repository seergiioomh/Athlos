import { StyleSheet } from "react-native";
import { Card } from "./Card";
import { Text } from "./Text";

type Props = {
  title: string;
  value: string;
  subtitle?: string;
};

export function MetricCard({
  title,
  value,
  subtitle,
}: Props) {
  return (
    <Card>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.value}>{value}</Text>

      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    opacity: 0.6,
  },

  value: {
    fontSize: 34,
    fontWeight: "700",
    marginTop: 8,
  },

  subtitle: {
    marginTop: 4,
    opacity: 0.6,
  },
});