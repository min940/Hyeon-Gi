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

// Firestore Timestamp(또는 {seconds}) → Date. 없으면 null.
export function tsToDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const obj = ts as { toDate?: () => Date; seconds?: number };
  if (typeof obj.toDate === "function") return obj.toDate();
  if (typeof obj.seconds === "number") return new Date(obj.seconds * 1000);
  return null;
}

// Date → "방금 전" / "N분 전" / "N시간 전" / "M월 D일 HH:MM"
export function timeAgo(date: Date | null): string {
  if (!date) return "기록 없음";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 30) return "방금 전";
  if (diffSec < 60) return `${diffSec}초 전`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
