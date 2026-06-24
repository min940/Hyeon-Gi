import { useEffect, useState } from "react";
import {
  Baby,
  BarChart3,
  CalendarDays,
  Coins,
  LayoutTemplate,
  LogOut,
  MapPin,
  RotateCcw,
  Save,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
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
import { Dashboard as KidView } from "./KidDashboard";
import ScheduleEditor from "../components/admin/ScheduleEditor";
import TaskEditor from "../components/admin/TaskEditor";
import AllowanceManager from "../components/admin/AllowanceManager";
import TemplateManager from "../components/admin/TemplateManager";
import SettingsPanel from "../components/admin/SettingsPanel";
import LocationPanel from "../components/admin/LocationPanel";
import StatsPanel from "../components/admin/StatsPanel";
import LogPanel from "../components/admin/LogPanel";

type Tab = "day" | "money" | "stats" | "location" | "template" | "settings";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "day", label: "일정·전할말", icon: CalendarDays },
  { key: "stats", label: "완료·통계", icon: BarChart3 },
  { key: "location", label: "위치", icon: MapPin },
  { key: "template", label: "요일 템플릿", icon: LayoutTemplate },
  { key: "money", label: "용돈", icon: Coins },
  { key: "settings", label: "설정", icon: Settings },
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateId}
            onChange={(e) => setDateId(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          />
          <span className="text-lg font-semibold text-slate-600">
            {prettyDate(dateId)}
          </span>
          <button
            onClick={() => setDateId(todayId())}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
          >
            <RotateCcw size={16} strokeWidth={2.4} />
            오늘로
          </button>
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-slate-400 shadow-sm">
          불러오는 중…
        </p>
      ) : (
        <>
          {/* 전할말 */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="font-bold text-slate-600">엄마의 전할말</label>
            <textarea
              value={data.notice}
              onChange={(e) =>
                setData((d) => ({ ...d, notice: e.target.value }))
              }
              placeholder="예: 오늘 우산 꼭 챙기렴!"
              rows={3}
              className="rounded-xl border border-slate-300 px-3 py-2 text-lg resize-y outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </div>

          {/* 일정 편집 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="font-bold text-slate-600">오늘 일정</label>
            <div className="mt-2">
              <ScheduleEditor
                schedules={data.schedules}
                onChange={setSchedules}
              />
            </div>
          </div>

          {/* 과제 편집 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="font-bold text-slate-600">오늘 과제</label>
            <div className="mt-2">
              <TaskEditor tasks={data.tasks} onChange={setTasks} />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
          >
            <Save size={22} strokeWidth={2.4} />
            {busy ? "저장 중…" : "저장하기"}
          </button>
        </>
      )}
    </div>
  );
}

function AdminApp() {
  const { log, entries } = useLog();
  const [tab, setTab] = useState<Tab>("day");
  // 상단 뷰: 엄마 관리자 / 자녀 화면(미리보기)
  const [view, setView] = useState<"admin" | "kid">("admin");

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <UserRound size={22} strokeWidth={2.4} />
          </div>
          {/* 상단 뷰 탭: 엄마 관리자 / 자녀 화면 */}
          <button
            onClick={() => setView("admin")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
              view === "admin"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <UserRound size={16} strokeWidth={2.4} />
            엄마 관리자
          </button>
          <button
            onClick={() => setView("kid")}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
              view === "kid"
                ? "border-sky-300 bg-sky-50 text-sky-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Baby size={16} strokeWidth={2.4} />
            자녀 화면
          </button>
          <button
            onClick={() => logout()}
            className="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut size={16} strokeWidth={2.4} />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
        {/* 관리자 섹션 탭 (자녀 화면 미리보기 중엔 숨김) */}
        {view === "admin" && (
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-3 pb-3">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    tab === t.key
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.4} />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {view === "admin" ? (
        <main className="max-w-3xl mx-auto px-4 py-5">
          {tab === "day" && <DayEditor log={log} />}
          {tab === "money" && <AllowanceManager log={log} />}
          {tab === "stats" && <StatsPanel log={log} />}
          {tab === "location" && <LocationPanel log={log} />}
          {tab === "template" && <TemplateManager log={log} />}
          {tab === "settings" && <SettingsPanel log={log} />}
        </main>
      ) : (
        <div>
          <p className="mx-auto max-w-2xl px-5 pt-4 text-center text-sm text-slate-400">
            👀 자녀에게 보이는 화면 미리보기입니다. (체크는 자녀 기기에서만 됩니다)
          </p>
          <KidView readOnly />
        </div>
      )}

      <LogPanel entries={entries} />
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  // 엄마 계정으로 로그인된 경우에만 관리자 사용 가능.
  // (자녀 계정 세션이면 용돈·일정 쓰기가 규칙에서 막히므로 엄마 로그인을 요구)
  if (!user || user.email !== MOM_EMAIL)
    return (
      <LoginScreen
        email={MOM_EMAIL}
        title="엄마 관리자 로그인"
        emoji="관리자"
        accent="rose"
      />
    );
  return <AdminApp />;
}
