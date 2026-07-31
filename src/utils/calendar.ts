export type WorkoutStatus = "today" | "completed" | "none";

export interface WorkoutDay {
  day: string;
  date: number;
  fullDate: Date;
  status: WorkoutStatus;
  isSelected: boolean;
}

const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function generateWorkoutDays(): WorkoutDay[] {
  const today = new Date();

  const days: WorkoutDay[] = [];

  for (let i = -15; i <= 15; i++) {
    const date = new Date(today);

    date.setDate(today.getDate() + i);

    days.push({
      day: weekdays[date.getDay()],
      date: date.getDate(),
      fullDate: date,
      status: i === 0 ? "today" : "none",
      isSelected: i === 0,
    });
  }

  return days;
}