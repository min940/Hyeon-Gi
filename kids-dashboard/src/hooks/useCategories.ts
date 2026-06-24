import { useEffect, useState } from "react";
import { subscribeCategories } from "../lib/data";
import {
  DEFAULT_SCHEDULE_CATEGORIES,
  DEFAULT_TASK_CATEGORIES,
} from "../types";
import type { Category, CategoryKind } from "../types";

// 일정/과제 종류 목록 실시간 구독 (없으면 종류별 기본값)
export function useCategories(kind: CategoryKind): Category[] {
  const [cats, setCats] = useState<Category[]>(
    kind === "task" ? DEFAULT_TASK_CATEGORIES : DEFAULT_SCHEDULE_CATEGORIES,
  );
  useEffect(() => subscribeCategories(kind, setCats), [kind]);
  return cats;
}
