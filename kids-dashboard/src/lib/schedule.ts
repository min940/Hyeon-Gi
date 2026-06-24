import type { Category, ColorKey } from "../types";

// 색상 팔레트 → Tailwind 클래스 (모두 리터럴이어야 purge 안 됨)
export const COLOR_META: Record<
  ColorKey,
  { dot: string; card: string; badge: string }
> = {
  blue: {
    dot: "bg-blue-500",
    card: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  emerald: {
    dot: "bg-emerald-500",
    card: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    dot: "bg-amber-500",
    card: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  violet: {
    dot: "bg-violet-500",
    card: "bg-violet-50 border-violet-200",
    badge: "bg-violet-100 text-violet-700",
  },
  rose: {
    dot: "bg-rose-500",
    card: "bg-rose-50 border-rose-200",
    badge: "bg-rose-100 text-rose-700",
  },
  teal: {
    dot: "bg-teal-500",
    card: "bg-teal-50 border-teal-200",
    badge: "bg-teal-100 text-teal-700",
  },
  sky: {
    dot: "bg-sky-500",
    card: "bg-sky-50 border-sky-200",
    badge: "bg-sky-100 text-sky-700",
  },
  slate: {
    dot: "bg-slate-400",
    card: "bg-slate-50 border-slate-200",
    badge: "bg-slate-200 text-slate-600",
  },
};

// 색상 선택 드롭다운용 라벨
export const COLOR_OPTIONS: { key: ColorKey; label: string }[] = [
  { key: "blue", label: "파랑" },
  { key: "emerald", label: "초록" },
  { key: "amber", label: "노랑" },
  { key: "violet", label: "보라" },
  { key: "rose", label: "분홍" },
  { key: "teal", label: "청록" },
  { key: "sky", label: "하늘" },
  { key: "slate", label: "회색" },
];

// 카테고리 key → 표시 메타(라벨·이모지·색상 클래스). 없는 key는 회색 "기타"로.
export function categoryMeta(categories: Category[], key: string) {
  const c = categories.find((x) => x.key === key);
  const color: ColorKey = c && c.color in COLOR_META ? c.color : "slate";
  return {
    label: c?.label ?? "기타",
    emoji: c?.emoji ?? "✨",
    ...COLOR_META[color],
  };
}

// 학원 우선 기본 종류 key (없으면 첫 카테고리)
export function defaultTypeKey(categories: Category[]): string {
  return (
    categories.find((c) => c.key === "academy")?.key ??
    categories[0]?.key ??
    "academy"
  );
}

// 시간 문자열("08:30") 기준 정렬
export function sortByTime<T extends { time: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}
