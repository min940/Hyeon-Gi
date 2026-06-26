import type { HTMLAttributes } from "react";
import { cn } from "./cn";
import { SOFT_CARD_CLASSES, type UIColor } from "./colors";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // 색 카드로 쓰고 싶을 때 (예: tone="amber" → 연한 노란 카드)
  tone?: UIColor;
  padded?: boolean;
}

// 사용 예: <Card>...</Card>  /  <Card tone="amber">...</Card>
export function Card({
  tone,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        tone ? SOFT_CARD_CLASSES[tone] : "border-slate-200 bg-white",
        padded && "p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
