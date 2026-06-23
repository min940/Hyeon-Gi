import type { WeekdayKey } from "../types";

const WEEKDAY_KEYS: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// Date → "YYYY-MM-DD" (로컬 타임존 기준)
export function toDateId(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 오늘 날짜 ID
export function todayId(): string {
  return toDateId(new Date());
}

// "YYYY-MM-DD" → Date (로컬 정오 기준, 타임존 오차 방지)
export function parseDateId(id: string): Date {
  const [y, m, d] = id.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// "YYYY-MM-DD" → 요일 키
export function weekdayKey(id: string): WeekdayKey {
  return WEEKDAY_KEYS[parseDateId(id).getDay()];
}

// "YYYY-MM-DD" → "6월 24일 화요일"
export function prettyDate(id: string): string {
  const date = parseDateId(id);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

// 숫자 → "1,000"
export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}
