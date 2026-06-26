import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant =
  | "primary" // 하늘 — 기본 강조
  | "success" // 초록 — 저장/완료
  | "danger" // 분홍 — 삭제/경고
  | "secondary" // 흰 배경 + 테두리
  | "ghost"; // 투명

export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-sky-500 text-white hover:bg-sky-600 shadow-sm",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
  danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm",
  secondary:
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  ghost: "text-slate-500 hover:bg-slate-100",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "px-4 py-2.5 rounded-xl",
  lg: "text-lg px-5 py-4 rounded-2xl",
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// 사용 예: <Button variant="success" leftIcon={<Save size={18} strokeWidth={2.4} />}>저장</Button>
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
