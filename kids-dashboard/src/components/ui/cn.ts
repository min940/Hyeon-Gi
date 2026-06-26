// 조건부 클래스 합치기 (clsx 없이 가볍게)
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
