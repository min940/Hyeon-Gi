import { useEffect, useMemo, useState } from "react";
import {
  Backpack,
  CalendarClock,
  Check,
  ClipboardCheck,
  Clock3,
  MapPin,
  MessageCircleHeart,
  PiggyBank,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { KID_EMAIL } from "../firebase";
import {
  subscribeDay,
  subscribeTransactions,
  subscribeLocationConfig,
  subscribeAppConfig,
  subscribeCompletion,
  subscribeCompletionsInRange,
  fetchTemplate,
  saveCompletion,
  walletBalance,
} from "../lib/data";
import { DEFAULT_APP_CONFIG } from "../types";
import {
  todayId,
  prettyDate,
  formatNumber,
  weekRangeIds,
  weekdayKey,
} from "../lib/dates";
import { categoryMeta, sortByTime } from "../lib/schedule";
import { useCategories } from "../hooks/useCategories";
import type { DayData, Transaction } from "../types";
import LoginScreen from "../components/LoginScreen";
import LoadingScreen from "../components/LoadingScreen";

// 완료/체크 상태는 로컬 저장(매일 초기화). 자녀가 직접 탭해서 체크.
// 준비물·일정·과제 완료를 하나의 키에 id 네임스페이스로 함께 저장한다.
function useDailyChecks(dateId: string) {
  const key = `daily-check-${dateId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
    // 어제 이전의 체크 데이터 정리 (옛 supplies-check- 키 포함)
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("daily-check-") || k.startsWith("supplies-check-")) &&
          k !== key
        ) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return { checked, toggle };
}

// 일정·과제 완료는 Firestore 에 저장(영구) — 통계·부모 확인에 사용.
function useCompletion(dateId: string) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsub = subscribeCompletion(dateId, setDone);
    return unsub;
  }, [dateId]);

  function toggleDone(id: string) {
    setDone((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      saveCompletion(dateId, next).catch(() => {
        /* 네트워크 일시 오류 시 다음 토글에서 재시도 */
      });
      return next;
    });
  }

  return { done, toggleDone };
}

function Dashboard() {
  const dateId = todayId();
  const [day, setDay] = useState<DayData | null>(null);
  const [dayLoaded, setDayLoaded] = useState(false);
  // 그날 저장된 일정이 없을 때 보여줄 요일 템플릿(자동 적용)
  const [templateDay, setTemplateDay] = useState<DayData | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [shareLocation, setShareLocation] = useState(false);
  const [homeTitle, setHomeTitle] = useState(DEFAULT_APP_CONFIG.homeTitle);
  const [weekDone, setWeekDone] = useState<
    Record<string, Record<string, boolean>>
  >({});

  useEffect(() => subscribeAppConfig((cfg) => setHomeTitle(cfg.homeTitle)), []);
  useEffect(() => {
    const { start, end } = weekRangeIds();
    return subscribeCompletionsInRange(start, end, setWeekDone);
  }, []);

  // 이번 주에 모은 별 = 이번 주 완료 항목 수
  const stars = useMemo(() => {
    let n = 0;
    for (const done of Object.values(weekDone)) {
      for (const v of Object.values(done)) if (v) n++;
    }
    return n;
  }, [weekDone]);

  useEffect(() => {
    const unsubDay = subscribeDay(dateId, (d) => {
      setDay(d);
      setDayLoaded(true);
    });
    const unsubTx = subscribeTransactions(setTxs);
    const unsubCfg = subscribeLocationConfig((cfg) =>
      setShareLocation(cfg.enabled),
    );
    return () => {
      unsubDay();
      unsubTx();
      unsubCfg();
    };
  }, [dateId]);

  // 그날 저장된 문서가 없으면 요일 템플릿을 불러와 자동 적용.
  // (엄마가 날짜별로 저장하지 않아도 자녀 화면에 그날 요일 일정이 보이도록)
  useEffect(() => {
    if (!dayLoaded || day) {
      setTemplateDay(null);
      return;
    }
    let active = true;
    fetchTemplate(weekdayKey(dateId)).then((t) => {
      if (!active) return;
      setTemplateDay(
        t ? { notice: "", schedules: t.schedules, tasks: t.tasks } : null,
      );
    });
    return () => {
      active = false;
    };
  }, [day, dayLoaded, dateId]);

  // 실제로 화면에 쓸 데이터: 저장된 날 > 요일 템플릿
  const view = day ?? templateDay;

  const schedules = useMemo(
    () => (view ? sortByTime(view.schedules) : []),
    [view],
  );

  const tasks = useMemo(() => (view ? sortByTime(view.tasks) : []), [view]);

  // 전체 준비물 평면화 (고유 id = sup-일정index-준비물index)
  const supplyItems = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    schedules.forEach((s, si) => {
      s.supplies.forEach((sup, pi) => {
        items.push({ id: `sup-${si}-${pi}`, name: sup.name });
      });
    });
    return items;
  }, [schedules]);

  const { checked, toggle } = useDailyChecks(dateId);
  const { done, toggleDone } = useCompletion(dateId);
  const scheduleCats = useCategories("schedule");
  const taskCats = useCategories("task");

  const mainBalance = walletBalance(txs, "main");
  const secondBalance = walletBalance(txs, "second");

  if (!dayLoaded) return <LoadingScreen />;

  const hasData =
    !!view &&
    (view.schedules.length > 0 || view.tasks.length > 0 || !!view.notice);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_100%)] pb-12">
      {/* 헤더 */}
      <header className="px-5 pt-8 pb-5">
        <div className="mx-auto flex max-w-2xl items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <Sparkles size={30} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-600">
              {prettyDate(dateId)}
            </p>
            <h1 className="mt-1 break-words text-2xl font-extrabold text-slate-800 sm:text-3xl">
              {homeTitle || DEFAULT_APP_CONFIG.homeTitle}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto flex flex-col gap-6">
        {/* 엄마의 전할말 — 가장 눈에 띄게 (있을 때만) */}
        {view?.notice && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-amber-700 flex items-center gap-2">
              <MessageCircleHeart size={22} strokeWidth={2.4} />
              엄마의 전할말
            </h2>
            <p className="text-xl text-slate-800 mt-2 whitespace-pre-wrap break-words">
              {view.notice}
            </p>
          </section>
        )}

        {/* 두 지갑 잔액 */}
        <section className="grid grid-cols-2 gap-4">
          <WalletCard
            icon={Wallet}
            label="메인지갑"
            balance={mainBalance}
            color="border-sky-200 bg-sky-50 text-sky-700"
          />
          <WalletCard
            icon={PiggyBank}
            label="세컨드지갑"
            balance={secondBalance}
            color="border-emerald-200 bg-emerald-50 text-emerald-700"
          />
        </section>

        {/* 이번 주 별·보상 */}
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-700 flex items-center gap-1">
              <Star size={22} fill="currentColor" strokeWidth={2.2} />
              이번 주에 모은 별
            </h2>
            <span className="text-3xl font-extrabold text-amber-600 tabular-nums">
              {stars}개
            </span>
          </div>
          <p className="text-center text-xs text-amber-600/80 mt-3">
            일정·과제를 완료하면 별이 쌓여요! (매주 월요일 새로 시작)
          </p>
        </section>

        {/* 오늘 일정 타임라인 */}
        <section>
          <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
            <CalendarClock size={24} className="text-sky-600" strokeWidth={2.4} />
            오늘 일정
          </h2>
          {schedules.length === 0 ? (
            <EmptyHint icon={CalendarClock} text="오늘은 등록된 일정이 없어요 🌱" />
          ) : (
            <ul className="flex flex-col gap-3">
              {schedules.map((s, i) => {
                const meta = categoryMeta(scheduleCats, s.type);
                const id = `sch-${i}-${s.time}-${s.title}`;
                const isDone = !!done[id];
                return (
                  <li key={i}>
                    <button
                      onClick={() => toggleDone(id)}
                      className={`w-full text-left rounded-2xl border p-4 shadow-sm transition active:scale-[0.99] ${meta.card} ${
                        isDone ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xl font-bold text-slate-700 tabular-nums">
                          <Clock3 size={18} strokeWidth={2.4} />
                          {s.time}
                        </span>
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-full ${meta.badge}`}
                        >
                          {meta.emoji} {meta.label}
                        </span>
                        {isDone && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-sm font-bold text-white">
                            <Check size={15} strokeWidth={3} />
                            완료
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base border-2 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 text-transparent"
                          }`}
                        >
                          <Check size={17} strokeWidth={3} />
                        </span>
                        <p
                          className={`text-xl font-semibold ${
                            isDone
                              ? "line-through text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {s.title}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 오늘 과제 */}
        {tasks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ClipboardCheck size={24} className="text-emerald-600" strokeWidth={2.4} />
              오늘 과제
            </h2>
            <ul className="flex flex-col gap-3">
              {tasks.map((t, i) => {
                const meta = categoryMeta(taskCats, t.type);
                const id = `task-${i}-${t.time}-${t.title}`;
                const isDone = !!done[id];
                return (
                  <li key={i}>
                    <button
                      onClick={() => toggleDone(id)}
                      className={`w-full text-left rounded-2xl border p-4 shadow-sm transition active:scale-[0.99] ${meta.card} ${
                        isDone ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xl font-bold text-slate-700 tabular-nums">
                          <Clock3 size={18} strokeWidth={2.4} />
                          {t.time}
                        </span>
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-full ${meta.badge}`}
                        >
                          {meta.emoji} {meta.label}
                        </span>
                        {isDone && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-sm font-bold text-white">
                            <Check size={15} strokeWidth={3} />
                            완료
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-base border-2 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 text-transparent"
                          }`}
                        >
                          <Check size={17} strokeWidth={3} />
                        </span>
                        <p
                          className={`text-xl font-semibold ${
                            isDone
                              ? "line-through text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {t.title}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 준비물 체크리스트 */}
        {supplyItems.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Backpack size={24} className="text-rose-600" strokeWidth={2.4} />
              준비물 체크
            </h2>
            <ul className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {supplyItems.map((item) => {
                const isChecked = !!checked[item.id];
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition active:scale-[0.99] ${
                        isChecked ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl border-2 ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        <Check size={20} strokeWidth={3} />
                      </span>
                      <span
                        className={`text-xl ${
                          isChecked
                            ? "line-through text-slate-400"
                            : "text-slate-800"
                        }`}
                      >
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-sm text-slate-400 mt-2">
              체크는 오늘 하루만 저장돼요.
            </p>
          </section>
        )}

        {!hasData && (
          <EmptyHint
            icon={Sparkles}
            text="오늘은 아직 등록된 내용이 없어요. 곧 채워질 거예요! 😊"
          />
        )}

        {shareLocation && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm font-medium text-slate-500">
            <MapPin size={16} className="text-rose-500" strokeWidth={2.4} />
            안전을 위해 위치를 가족과 공유하고 있어요
          </p>
        )}
      </main>
    </div>
  );
}

function WalletCard({
  icon: Icon,
  label,
  balance,
  color,
}: {
  icon: typeof Wallet;
  label: string;
  balance: number;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${color}`}>
      <p className="flex items-center gap-2 text-base font-bold">
        <Icon size={22} strokeWidth={2.4} /> {label}
      </p>
      <p className="text-3xl font-extrabold mt-2 tabular-nums">
        {formatNumber(balance)}
        <span className="text-lg font-bold ml-1">원</span>
      </p>
    </div>
  );
}

function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: typeof Sparkles;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon className="mx-auto mb-3 text-slate-300" size={34} strokeWidth={2.2} />
      <p className="text-xl text-slate-500">{text}</p>
    </div>
  );
}

export default function KidDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)
    return (
      <LoginScreen
        email={KID_EMAIL}
        title="안녕! 비밀번호를 눌러줘"
        emoji="🧒"
        accent="sky"
        notifyAndroid
      />
    );
  return <Dashboard />;
}
