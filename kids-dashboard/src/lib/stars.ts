// 별 계산 공용 로직 — 자녀 화면 · 완료통계 · 설정이 함께 사용.
// 규칙: 그날 일정+과제를 "전부" 완료한 날 = 별 1개 (하루 최대 1개), 누적.
// 그날 저장 문서(days)가 없으면 요일 템플릿을 총 개수로 사용(자녀 화면과 동일).
import {
  fetchDaysInRange,
  fetchTemplate,
  subscribeCompletionsInRange,
} from "./data";
import { todayId, weekdayKey } from "./dates";
import type { DayData, WeekdayKey, WeekdayTemplate } from "../types";

const EPOCH = "2000-01-01";
const WEEKDAYS: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type TemplateMap = Partial<Record<WeekdayKey, WeekdayTemplate | null>>;

async function loadTemplates(): Promise<TemplateMap> {
  const entries = await Promise.all(
    WEEKDAYS.map(async (wd) => [wd, await fetchTemplate(wd)] as const),
  );
  return Object.fromEntries(entries);
}

function doneCount(done: Record<string, boolean>): number {
  let n = 0;
  for (const [id, v] of Object.entries(done)) {
    if (v && (id.startsWith("sch-") || id.startsWith("task-"))) n++;
  }
  return n;
}

// 완료 기록(comps)이 있는 날 ∪ 날짜 문서가 있는 날 중, 전부 완료한 날 수
export function countFullyDoneDays(
  days: { id: string; data: DayData }[],
  comps: Record<string, Record<string, boolean>>,
  tpls: TemplateMap,
): number {
  const byId = new Map(days.map((d) => [d.id, d.data]));
  const dates = new Set<string>([...byId.keys(), ...Object.keys(comps)]);
  let n = 0;
  for (const id of dates) {
    const saved = byId.get(id);
    const total = saved
      ? saved.schedules.length + saved.tasks.length
      : (() => {
          const t = tpls[weekdayKey(id)];
          return t ? t.schedules.length + t.tasks.length : 0;
        })();
    if (total <= 0) continue;
    if (doneCount(comps[id] ?? {}) >= total) n++;
  }
  return n;
}

// 누적 획득 별(earned) 실시간 구독 — 완료 기록이 바뀔 때마다 다시 계산.
export function subscribeEarnedStars(cb: (earned: number) => void): () => void {
  let seq = 0;
  const unsub = subscribeCompletionsInRange(EPOCH, todayId(), (comps) => {
    const my = ++seq;
    (async () => {
      const ids = Object.keys(comps);
      const startId = ids.length ? ids.reduce((a, b) => (a < b ? a : b)) : todayId();
      const [days, tpls] = await Promise.all([
        fetchDaysInRange(startId, todayId()),
        loadTemplates(),
      ]);
      if (my !== seq) return; // 더 최신 스냅샷이 있으면 버림
      cb(countFullyDoneDays(days, comps, tpls));
    })().catch(() => {
      /* 일시 오류 시 다음 스냅샷에서 재계산 */
    });
  });
  return unsub;
}

// 화면 표시용 모은 별 (음수 방지)
export function shownStars(earned: number, redeemed: number): number {
  return Math.max(0, earned - redeemed);
}
