import type { ReactNode } from "react";
import { cn } from "./cn";
import { BADGE_CLASSES, type UIColor } from "./colors";

export interface BadgeProps {
  color?: UIColor;
  emoji?: string;
  className?: string;
  children: ReactNode;
}

// 사용 예: <Badge color="sky" emoji="🔤">영어학원</Badge>
export function Badge({
  color = "slate",
  emoji,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold",
        BADGE_CLASSES[color],
        className,
      )}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      {children}
    </span>
  );
}
