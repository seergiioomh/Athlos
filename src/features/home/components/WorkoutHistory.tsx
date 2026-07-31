import { useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { WeekSession } from "@/services/home";
import { HomeColors } from "../home-theme";

type Props = {
  onPress: () => void;
  sessions: WeekSession[];
};

const DAYS_BACK = 4;
const DAYS_FORWARD = 4;
const TODAY_INDEX = DAYS_BACK;

// Ancho de tarjeta más separación. Hace falta explícito para que la lista
// sepa dónde está cada día sin haberlos renderizado todos.
const CARD_WIDTH = 45;
const CARD_GAP = 6;
const ITEM_SIZE = CARD_WIDTH + CARD_GAP;

const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Cuatro días atrás, hoy, y cuatro por delante. */
const buildDays = (sessions: WeekSession[]) => {
  const today = new Date();

  return Array.from({ length: DAYS_BACK + 1 + DAYS_FORWARD }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + (index - DAYS_BACK));

    const trained = sessions.some(
      (session) =>
        session.finishedAt && isSameDay(new Date(session.startedAt), date)
    );

    return {
      key: date.toISOString().slice(0, 10),
      day: weekdays[date.getDay()],
      date: date.getDate(),
      trained,
      isToday: index === TODAY_INDEX,
    };
  });
};

export function WorkoutHistory({ onPress, sessions }: Props) {
  const days = buildDays(sessions);
  const list = useRef<FlatList>(null);
  const centered = useRef(false);

  /**
   * Centrar hoy necesita saber el ancho visible, que solo se conoce tras el
   * layout. Por eso no se hace en un efecto de montaje: ahí la lista todavía
   * no está medida y el scroll se descarta sin más.
   */
  const centerToday = (viewportWidth: number) => {
    if (centered.current || viewportWidth === 0) return;

    centered.current = true;

    const contentWidth = days.length * ITEM_SIZE - CARD_GAP;
    const target =
      TODAY_INDEX * ITEM_SIZE + CARD_WIDTH / 2 - viewportWidth / 2;

    const offset = Math.min(
      Math.max(target, 0),
      Math.max(contentWidth - viewportWidth, 0)
    );

    // Un fotograma de margen para que el contenido esté medido, no solo
    // el contenedor.
    requestAnimationFrame(() =>
      list.current?.scrollToOffset({ offset, animated: false })
    );
  };

  return <View style={styles.container}>
    <View style={styles.heading}><Text style={styles.title}>Esta semana</Text><TouchableOpacity onPress={onPress}><Text style={styles.link}>Ver progreso</Text></TouchableOpacity></View>
    <FlatList
      ref={list}
      horizontal
      data={days}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      onLayout={(event) => centerToday(event.nativeEvent.layout.width)}
      getItemLayout={(_, index) => ({
        length: ITEM_SIZE,
        offset: ITEM_SIZE * index,
        index,
      })}
      renderItem={({ item }) => <TouchableOpacity activeOpacity={0.8} style={[styles.card, item.isToday && styles.selectedCard]}>
        <Text style={[styles.day, item.isToday && styles.selectedText]}>{item.day}</Text><Text style={[styles.date, item.isToday && styles.selectedText]}>{item.date}</Text>
        <View style={[
          styles.dot,
          { backgroundColor: item.isToday
            // Sobre la tarjeta naranja el verde no se lee: mantenemos la
            // información con blanco lleno o traslúcido.
            ? (item.trained ? HomeColors.onPrimary : "rgba(12,17,2,0.35)")
            : (item.trained ? HomeColors.success : HomeColors.border) },
        ]} />
      </TouchableOpacity>}
    />
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 28 }, heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: HomeColors.text }, link: { fontSize: 14, fontWeight: "600", color: HomeColors.primary },
  list: { gap: CARD_GAP, paddingRight: 16 }, card: { width: CARD_WIDTH, height: 82, backgroundColor: HomeColors.surface, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  selectedCard: { backgroundColor: HomeColors.primary }, selectedText: { color: HomeColors.onPrimary }, day: { fontSize: 14, color: HomeColors.textSecondary, marginBottom: 6 },
  date: { fontSize: 22, fontWeight: "700", color: HomeColors.text }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
