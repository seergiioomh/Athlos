import {
  Award01Icon,
  BicepsFlexedIcon,
  BodyPartMuscleIcon,
  Calendar01Icon,
  ChampionIcon,
  ChartBarIncreasingIcon,
  ChartHistogramIcon,
  ChartMaximumIcon,
  Clock01Icon,
  CrownIcon,
  Dumbbell01Icon,
  FireIcon,
  Flag01Icon,
  KettlebellIcon,
  LaurelWreath01Icon,
  Medal01Icon,
  Moon01Icon,
  Refresh01Icon,
  RepeatIcon,
  Rocket01Icon,
  Search01Icon,
  SearchFocusIcon,
  SearchVisualIcon,
  Share01Icon,
  SunriseIcon,
  Sword01Icon,
  Target01Icon,
  WeightIcon,
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
  rocket: Rocket01Icon,
  medal: Medal01Icon,
  crown: CrownIcon,
  refresh: Refresh01Icon,
  repeat: RepeatIcon,
  weight: WeightIcon,
  biceps: BicepsFlexedIcon,
  kettlebell: KettlebellIcon,
  target: Target01Icon,
  chart: ChartHistogramIcon,
  "chart-up": ChartBarIncreasingIcon,
  "chart-max": ChartMaximumIcon,
  award: Award01Icon,
  search: Search01Icon,
  "search-focus": SearchFocusIcon,
  "search-visual": SearchVisualIcon,
  body: BodyPartMuscleIcon,
  sunrise: SunriseIcon,
  moon: Moon01Icon,
  calendar: Calendar01Icon,
  clock: Clock01Icon,
  sword: Sword01Icon,
  flag: Flag01Icon,
  champion: ChampionIcon,
  laurel: LaurelWreath01Icon,
};

export const achievementIcon = (name: string): IconSvgElement =>
  ACHIEVEMENT_ICONS[name] ?? Medal01Icon;
