import { useEffect, useState } from "react";
import { subscribeCategories } from "../lib/data";
import { DEFAULT_CATEGORIES } from "../types";
import type { Category } from "../types";

// 일정/과제 종류 목록 실시간 구독 (없으면 기본값)
export function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATEGORIES);
  useEffect(() => subscribeCategories(setCats), []);
  return cats;
}
