import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLog } from "../hooks/useLog";
import { MOM_EMAIL } from "../firebase";
import { logout } from "../lib/auth";
import { fetchDay, saveDay, fetchTemplate } from "../lib/data";
import { todayId, prettyDate, weekdayKey } from "../lib/dates";
import type { DayData, Schedule, Task } from "../types";
import { EMPTY_DAY } from "../types";
import LoginScreen from "../components/LoginScreen";
import LoadingScreen from "../components/LoadingScreen";
import ScheduleEditor from "../components/admin/ScheduleEditor";
import TaskEditor from "../components/admin/TaskEditor";
import AllowanceManager from "../components/admin/AllowanceManager";
import TemplateManager from "../components/admin/TemplateManager";
import SettingsPanel from "../components/admin/SettingsPanel";
import LocationPanel from "../components/admin/LocationPanel";
import LogPanel from "../components/admin/LogPanel";

type Tab = "day" | "money" | "location" | "template" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "day", label: "📅 일정·전할말" },
  { key: "money", label: "💰 용돈" },
  { key: "location", label: "📍 위치" },
  { key: "template", label: "🗓️ 요일 템플릿" },
  { key: "settings", label: "⚙️ 설정" },
];

function DayEditor({
  log,
}: {
  log: (level: "INFO" | "SUCCESS" | "ERROR", msg: string) => void;
}) {
  const [dateId, setDateId] = useState(todayId());
  const [data, setData] = useState<DayData>(EMPTY_DAY);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // 날짜 변경 시 데이터 로드. 없으면 요일 템플릿으로 일정 자동 채움.
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const existing = await fetchDay(dateId);
      if (!active) return;
      if (existing) {
        setData(existing);
        log("INFO", `${dateId} 데이터 불러옴`);
      } else {
        const tpl = await fetchTemplate(weekdayKey(dateId));
        if (!active) return;
        if (tpl && (tpl.schedules.length > 0 || tpl.tasks.length > 0)) {
          setData({
            ...EMPTY_DAY,
            schedules: tpl.schedules,
            tasks: tpl.tasks,
          });
          log("INFO", `${dateId}: 요일 템플릿으로 일정·과제 자동 채움`);
        } else {
          setData(EMPTY_DAY);
          log("INFO", `${dateId}: 새 날짜 (빈 양식)`);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dateId, log]);

  function setSchedules(schedules: Schedule[]) {
    setData((d) => ({ ...d, schedules }));
  }

  function setTasks(tasks: Task[]) {
    setData((d) => ({ ...d, tasks }));
  }

  async function handleSave() {
    setBusy(true);
    try {
      await saveDay(dateId, data);
      log("SUCCESS", `${dateId} 저장 완료 — 자녀 화면에 실시간 반영`);
    } catch (e) {
      log("ERROR", `저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 날짜 선택 */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={dateId}
          onChange={(e) => setDateId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
        <span className="text-lg font-semibold text-slate-600">
          {prettyDate(dateId)}
        </span>
        <button
          onClick={() => setDateId(todayId())}
          className="ml-auto text-sm text-sky-600 font-semibold hover:underline"
        >
          오늘로
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-8">불러오는 중…</p>
      ) : (
        <>
          {/* 전할말 */}
          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-600">엄마의 전할말</label>
            <textarea
              value={data.notice}
              onChange={(e) =>
                setData((d) => ({ ...d, notice: e.target.value }))
              }
              placeholder="예: 오늘 우산 꼭 챙기렴!"
              rows={3}
              className="rounded-lg border border-slate-300 px-3 py-2 text-lg resize-y"
            />
          </div>

          {/* 일정 편집 */}
          <div>
            <label className="font-bold text-slate-600">오늘 일정</label>
            <div className="mt-2">
              <ScheduleEditor
                schedules={data.schedules}
                onChange={setSchedules}
              />
            </div>
          </div>

          {/* 과제 편집 */}
          <div>
            <label className="font-bold text-slate-600">오늘 과제</label>
            <div className="mt-2">
              <TaskEditor tasks={data.tasks} onChange={setTasks} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={busy}
            className="bg-rose-500 hover:bg-rose-600 text-white text-lg font-bold py-4 rounded-2xl shadow-md disabled:opacity-50"
          >
            {busy ? "저장 중…" : "💾 저장하기"}
          </button>
        </>
      )}
    </div>
  );
}

function AdminApp() {
  const { log, entries } = useLog();
  const [tab, setTab] = useState<Tab>("day");

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-700">
            👩 엄마 관리자
          </h1>
          <button
            onClick={() => logout()}
            className="ml-auto text-sm text-slate-500 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-100"
          >
            로그아웃
          </button>
        </div>
        {/* 탭 */}
        <div className="max-w-3xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-3 py-2 text-sm font-semibold border-b-2 ${
                tab === t.key
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {tab === "day" && <DayEditor log={log} />}
        {tab === "money" && <AllowanceManager log={log} />}
        {tab === "location" && <LocationPanel log={log} />}
        {tab === "template" && <TemplateManager log={log} />}
        {tab === "settings" && <SettingsPanel log={log} />}
      </main>

      <LogPanel entries={entries} />
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)
    return (
      <LoginScreen
        email={MOM_EMAIL}
        title="엄마 관리자 로그인"
        emoji="👩"
        accent="rose"
      />
    );
  return <AdminApp />;
}
