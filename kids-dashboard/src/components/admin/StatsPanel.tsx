import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  Check,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import {
  fetchDaysInRange,
  fetchCompletionsInRange,
  subscribeDay,
  subscribeCompletion,
} from "../../lib/data";
import { todayId, toDateId, prettyDate } from "../../lib/dates";
import { categoryMeta, sortByTime } from "../../lib/schedule";
import { useCategories } from "../../hooks/useCategories";
import type { Category, DayData } from "../../types";
import type { LogLevel } from "../../hooks/useLog";

type Period = "7" | "30" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "최근 7일" },
  { key: "30", label: "최근 30일" },
  { key: "all", label: "전체" },
];

interface DayRow {
  dateId: string;
  schDone: number;
  schTotal: number;
  taskDone: number;
  taskTotal: number;
}

// 기간 시작 날짜 ID 계산
function startIdFor(period: Period): string {
  if (period === "all") return "2000-01-01";
  const days = period === "7" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return toDateId(d);
}

// done 맵에서 접두사로 시작하는 완료 개수 (전체 개수로 상한)
function countDone(
  done: Record<string, boolean>,
  prefix: string,
  total: number,
): number {
  let n = 0;
  for (const [id, v] of Object.entries(done)) {
    if (v && id.startsWith(prefix)) n++;
  }
  return Math.min(n, total);
}

// 완료 통계 탭 — 기간별 일정·과제 완료율 집계.
export default function StatsPanel({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [period, setPeriod] = useState<Period>("7");
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const endId = todayId();
    const startId = startIdFor(period);
    (async () => {
      try {
        const [days, comps] = await Promise.all([
          fetchDaysInRange(startId, endId),
          fetchCompletionsInRange(startId, endId),
        ]);
        if (!active) return;
        const result: DayRow[] = days
          .map(({ id, data }: { id: string; data: DayData }) => {
            const done = comps[id] ?? {};
            return {
              dateId: id,
              schTotal: data.schedules.length,
              taskTotal: data.tasks.length,
              schDone: countDone(done, "sch-", data.schedules.length),
              taskDone: countDone(done, "task-", data.tasks.length),
            };
          })
          // 일정도 과제도 없는 날은 통계에서 제외
          .filter((r) => r.schTotal > 0 || r.taskTotal > 0);
        setRows(result);
      } catch (e) {
        log("ERROR", `통계 불러오기 실패: ${(e as Error).message}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [period, log]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        schDone: acc.schDone + r.schDone,
        schTotal: acc.schTotal + r.schTotal,
        taskDone: acc.taskDone + r.taskDone,
        taskTotal: acc.taskTotal + r.taskTotal,
      }),
      { schDone: 0, schTotal: 0, taskDone: 0, taskTotal: 0 },
    );
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      {/* 오늘 자녀 완료 현황 (읽기 전용) */}
      <TodayProgress />

      {/* ── 기간별 통계 ── */}
      <div className="flex flex-col gap-5">
        <h3 className="flex items-center gap-1.5 font-bold text-slate-700">
          <BarChart3 size={20} className="text-sky-600" strokeWidth={2.4} />
          기간별 완료율
        </h3>
        {/* 기간 선택 */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
              period === p.key
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-8">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          이 기간에 기록된 일정·과제가 없습니다.
        </p>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              icon={CalendarClock}
              label="일정 완료율"
              done={totals.schDone}
              total={totals.schTotal}
              color="sky"
            />
            <SummaryCard
              icon={ClipboardCheck}
              label="과제 완료율"
              done={totals.taskDone}
              total={totals.taskTotal}
              color="emerald"
            />
          </div>

          {/* 날짜별 표 */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2 font-semibold">날짜</th>
                  <th className="px-3 py-2 font-semibold">일정</th>
                  <th className="px-3 py-2 font-semibold">과제</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => {
                  const schAll = r.schTotal > 0 && r.schDone === r.schTotal;
                  const taskAll = r.taskTotal > 0 && r.taskDone === r.taskTotal;
                  return (
                    <tr key={r.dateId} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-700">
                        {prettyDate(r.dateId)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {r.schTotal === 0 ? (
                          <span className="text-slate-300">–</span>
                        ) : (
                          <span
                            className={
                              schAll
                                ? "text-emerald-600 font-bold"
                                : "text-slate-600"
                            }
                          >
                            {r.schDone}/{r.schTotal}
                            {schAll && " 완료"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {r.taskTotal === 0 ? (
                          <span className="text-slate-300">–</span>
                        ) : (
                          <span
                            className={
                              taskAll
                                ? "text-emerald-600 font-bold"
                                : "text-slate-600"
                            }
                          >
                            {r.taskDone}/{r.taskTotal}
                            {taskAll && " 완료"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-400">
            완료 기록은 자녀가 화면에서 체크한 내용을 바탕으로 합니다.
          </p>
        </>
      )}
      </div>
    </div>
  );
}

// ── 오늘 자녀 완료 현황 (읽기 전용) ──────────────────
function TodayProgress() {
  const dateId = todayId();
  const [day, setDay] = useState<DayData | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const scheduleCats = useCategories("schedule");
  const taskCats = useCategories("task");

  useEffect(() => {
    const u1 = subscribeDay(dateId, setDay);
    const u2 = subscribeCompletion(dateId, setDone);
    return () => {
      u1();
      u2();
    };
  }, [dateId]);

  const schedules = useMemo(
    () => (day ? sortByTime(day.schedules) : []),
    [day],
  );
  const tasks = useMemo(() => (day ? sortByTime(day.tasks) : []), [day]);

  const empty = schedules.length === 0 && tasks.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-bold text-slate-700">
        오늘 완료 현황{" "}
        <span className="text-sm font-normal text-slate-400">
          {prettyDate(dateId)}
        </span>
      </h3>

      {empty ? (
        <p className="text-slate-400 text-center py-4 bg-white rounded-2xl">
          오늘은 등록된 일정·과제가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {schedules.length > 0 && (
            <ProgressList
              icon="⏰"
              label="일정"
              items={schedules}
              cats={scheduleCats}
              done={done}
              prefix="sch"
            />
          )}
          {tasks.length > 0 && (
            <ProgressList
              icon="📝"
              label="과제"
              items={tasks}
              cats={taskCats}
              done={done}
              prefix="task"
            />
          )}
        </div>
      )}
    </div>
  );
}

// 완료/미완료 목록 (읽기 전용)
function ProgressList({
  icon,
  label,
  items,
  cats,
  done,
  prefix,
}: {
  icon: string;
  label: string;
  items: { time: string; title: string; type: string }[];
  cats: Category[];
  done: Record<string, boolean>;
  prefix: "sch" | "task";
}) {
  const doneCount = items.filter(
    (it, i) => done[`${prefix}-${i}-${it.time}-${it.title}`],
  ).length;

  return (
    <div>
      <p className="text-sm font-bold text-slate-500 mb-2">
        <span aria-hidden>{icon}</span> {label}{" "}
        <span className="text-emerald-600">
          {doneCount}/{items.length} 완료
        </span>
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((it, i) => {
          const meta = categoryMeta(cats, it.type);
          const isDone = !!done[`${prefix}-${i}-${it.time}-${it.title}`];
          return (
            <li
              key={i}
              className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                isDone
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base border-2 ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 text-slate-300"
                }`}
              >
                <Check size={17} strokeWidth={3} />
              </span>
              <span className="text-sm font-bold text-slate-600 tabular-nums">
                {it.time}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}
              >
                {meta.emoji} {meta.label}
              </span>
              <span
                className={`flex-1 ${
                  isDone ? "line-through text-slate-400" : "text-slate-800"
                }`}
              >
                {it.title}
              </span>
              <span
                className={`text-xs font-bold flex-shrink-0 ${
                  isDone ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {isDone ? "완료" : "미완료"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  done,
  total,
  color,
}: {
  icon: LucideIcon;
  label: string;
  done: number;
  total: number;
  color: "sky" | "emerald";
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = color === "sky" ? "bg-sky-500" : "bg-emerald-500";
  const tint = color === "sky" ? "bg-sky-50" : "bg-emerald-50";
  return (
    <div className={`rounded-2xl border border-white p-4 shadow-sm ${tint}`}>
      <p className="text-sm font-semibold text-slate-600 flex items-center gap-1">
        <Icon size={19} strokeWidth={2.4} /> {label}
      </p>
      <p className="text-3xl font-extrabold text-slate-800 mt-1 tabular-nums">
        {pct}%
      </p>
      <p className="text-xs text-slate-500 tabular-nums">
        완료 {done} / 전체 {total}
      </p>
      <div className="mt-2 h-2.5 rounded-full bg-white overflow-hidden">
        <div
          className={`h-full ${bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
