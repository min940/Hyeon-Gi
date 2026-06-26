// 디자인 시스템 색상 팔레트 → Tailwind 클래스 매핑.
// ⚠️ 반드시 "문자열 리터럴"로 적어둘 것 (동적 조합은 Tailwind purge 로 삭제됨).

export type UIColor =
  | "sky"
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "teal"
  | "slate";

// 배지/칩: 연한 배경 + 진한 글자 (-100 / -700)
export const BADGE_CLASSES: Record<UIColor, string> = {
  sky: "bg-sky-100 text-sky-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
  slate: "bg-slate-200 text-slate-600",
};

// 부드러운 색 카드: 아주 연한 배경 + 연한 테두리 (-50 / -200)
export const SOFT_CARD_CLASSES: Record<UIColor, string> = {
  sky: "bg-sky-50 border-sky-200",
  blue: "bg-blue-50 border-blue-200",
  emerald: "bg-emerald-50 border-emerald-200",
  amber: "bg-amber-50 border-amber-200",
  violet: "bg-violet-50 border-violet-200",
  rose: "bg-rose-50 border-rose-200",
  teal: "bg-teal-50 border-teal-200",
  slate: "bg-slate-50 border-slate-200",
};

// 강조 점/도트 (-500)
export const DOT_CLASSES: Record<UIColor, string> = {
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  slate: "bg-slate-400",
};
