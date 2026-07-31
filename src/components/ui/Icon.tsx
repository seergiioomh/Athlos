import {
  AnalyticsUpIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  Dumbbell01Icon,
  Home01Icon,
  PlayIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  HugeiconsIcon,
  type IconSvgElement,
} from "@hugeicons/react-native";

import { Colors } from "@/theme/colors";

type IconName =
  | "home"
  | "dumbbell"
  | "coach"
  | "progress"
  | "profile"
  | "clock"
  | "play"
  | "arrow-right"
  | "arrow-left";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

const icons: Record<IconName, IconSvgElement> = {
  home: Home01Icon,
  dumbbell: Dumbbell01Icon,
  coach: SparklesIcon,
  progress: AnalyticsUpIcon,
  profile: UserCircleIcon,
  clock: Clock01Icon,
  play: PlayIcon,
  "arrow-left": ArrowLeft01Icon,
  "arrow-right": ArrowRight01Icon,
};

export function Icon({
  name,
  size = 22,
  color = Colors.textSecondary,
}: Props) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      color={color}
      strokeWidth={1.8}
    />
  );
}
