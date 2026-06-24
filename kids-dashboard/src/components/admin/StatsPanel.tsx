import { useEffect, useMemo, useState } from "react";
import { fetchDaysInRange, fetchCompletionsInRange } from "../../lib/data";
import { todayId, toDateId, prettyDate } from "../../lib/dates";
import type { DayData } from "../../types";
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
    <div className="flex flex-col gap-5">
      {/* 기간 선택 */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-full text-sm font-bold ${
              period === p.key
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-500"
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
              emoji="⏰"
              label="일정 완료율"
              done={totals.schDone}
              total={totals.schTotal}
              color="sky"
            />
            <SummaryCard
              emoji="📝"
              label="과제 완료율"
              done={totals.taskDone}
              total={totals.taskTotal}
              color="emerald"
            />
          </div>

          {/* 날짜별 표 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                            {schAll && " ✓"}
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
                            {taskAll && " ✓"}
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
  );
}

function SummaryCard({
  emoji,
  label,
  done,
  total,
  color,
}: {
  emoji: string;
  label: string;
  done: number;
  total: number;
  color: "sky" | "emerald";
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = color === "sky" ? "bg-sky-500" : "bg-emerald-500";
  const tint = color === "sky" ? "bg-sky-50" : "bg-emerald-50";
  return (
    <div className={`rounded-2xl p-4 ${tint}`}>
      <p className="text-sm font-semibold text-slate-600 flex items-center gap-1">
        <span className="text-xl">{emoji}</span> {label}
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
