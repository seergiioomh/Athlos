import {
  BodyPartMuscleIcon,
  Calendar01Icon,
  ChampionIcon,
  ChartHistogramIcon,
  Clock01Icon,
  Dumbbell01Icon,
  FireIcon,
  Medal01Icon,
  Moon01Icon,
  Refresh01Icon,
  Search01Icon,
  Share01Icon,
  SunriseIcon,
  Target01Icon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react-native";

/**
 * Los iconos de los logros, aparte del `Icon` compartido: aquel es un puñado
 * corto para la navegación y no tiene sentido inflarlo con quince nombres que
 * solo usa esta pantalla.
 */
export const ACHIEVEMENT_ICONS: Record<string, IconSvgElement> = {
  dumbbell: Dumbbell01Icon,
  scale: WeightScale01Icon,
  share: Share01Icon,
  flame: FireIcon,
  trophy: ChampionIcon,
  medal: Medal01Icon,
  refresh: Refresh01Icon,
  weight: WeightScale01Icon,
  target: Target01Icon,
  chart: ChartHistogramIcon,
  search: Search01Icon,
  body: BodyPartMuscleIcon,
  sunrise: SunriseIcon,
  moon: Moon01Icon,
  calendar: Calendar01Icon,
  clock: Clock01Icon,
};

export const achievementIcon = (name: string): IconSvgElement =>
  ACHIEVEMENT_ICONS[name] ?? Medal01Icon;
