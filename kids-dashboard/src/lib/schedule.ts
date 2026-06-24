import type { ScheduleType } from "../types";

// 일정 종류별 색상/라벨/이모지 (학교=파랑, 학원=초록, 기타=회색)
export const SCHEDULE_META: Record<
  ScheduleType,
  { label: string; emoji: string; dot: string; card: string; badge: string }
> = {
  school: {
    label: "학교",
    emoji: "🏫",
    dot: "bg-blue-500",
    card: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  academy: {
    label: "학원",
    emoji: "📚",
    dot: "bg-emerald-500",
    card: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  etc: {
    label: "기타",
    emoji: "✨",
    dot: "bg-slate-400",
    card: "bg-slate-50 border-slate-200",
    badge: "bg-slate-200 text-slate-600",
  },
};

export const SCHEDULE_TYPES: ScheduleType[] = ["school", "academy", "etc"];

// 시간 문자열("08:30") 기준 정렬
export function sortByTime<T extends { time: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}
