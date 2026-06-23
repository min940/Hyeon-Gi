import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { KID_EMAIL } from "../firebase";
import {
  subscribeDay,
  subscribeTransactions,
  walletBalance,
} from "../lib/data";
import { todayId, prettyDate, formatNumber } from "../lib/dates";
import { SCHEDULE_META, sortByTime } from "../lib/schedule";
import type { DayData, Transaction } from "../types";
import LoginScreen from "../components/LoginScreen";
import LoadingScreen from "../components/LoadingScreen";

// 준비물 체크 상태는 로컬 저장(매일 초기화). 자녀가 직접 탭해서 체크.
function useSuppliesCheck(dateId: string, total: number) {
  const key = `supplies-check-${dateId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
    // 어제 이전의 체크 데이터 정리
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("supplies-check-") && k !== key) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore */
    }
  }, [key, total]);

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

function Dashboard() {
  const dateId = todayId();
  const [day, setDay] = useState<DayData | null>(null);
  const [dayLoaded, setDayLoaded] = useState(false);
  const [txs, setTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    const unsubDay = subscribeDay(dateId, (d) => {
      setDay(d);
      setDayLoaded(true);
    });
    const unsubTx = subscribeTransactions(setTxs);
    return () => {
      unsubDay();
      unsubTx();
    };
  }, [dateId]);

  const schedules = useMemo(
    () => (day ? sortByTime(day.schedules) : []),
    [day],
  );

  // 전체 준비물 평면화 (고유 id = 일정index-준비물index)
  const supplyItems = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    schedules.forEach((s, si) => {
      s.supplies.forEach((sup, pi) => {
        items.push({ id: `${si}-${pi}`, name: sup.name });
      });
    });
    return items;
  }, [schedules]);

  const { checked, toggle } = useSuppliesCheck(dateId, supplyItems.length);

  const mainBalance = walletBalance(txs, "main");
  const secondBalance = walletBalance(txs, "second");

  if (!dayLoaded) return <LoadingScreen />;

  const hasData =
    day && (day.schedules.length > 0 || day.greeting || day.notice);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 pb-12">
      {/* 헤더 */}
      <header className="px-5 pt-8 pb-6 text-center">
        <p className="text-lg font-semibold text-sky-600">
          {prettyDate(dateId)}
        </p>
        <h1 className="text-3xl font-extrabold text-slate-800 mt-1 flex items-center justify-center gap-2">
          <span className="text-4xl">🌈</span>
          {day?.greeting ? day.greeting : "오늘도 즐거운 하루!"}
        </h1>
      </header>

      <main className="px-5 max-w-2xl mx-auto flex flex-col gap-6">
        {/* 엄마의 전할말 — 가장 눈에 띄게 (있을 때만) */}
        {day?.notice && (
          <section className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-amber-700 flex items-center gap-2">
              💌 엄마의 전할말
            </h2>
            <p className="text-xl text-slate-800 mt-2 whitespace-pre-wrap break-words">
              {day.notice}
            </p>
          </section>
        )}

        {/* 두 지갑 잔액 */}
        <section className="grid grid-cols-2 gap-4">
          <WalletCard
            emoji="👛"
            label="메인지갑"
            balance={mainBalance}
            color="bg-violet-100 text-violet-700"
          />
          <WalletCard
            emoji="🐷"
            label="세컨드지갑"
            balance={secondBalance}
            color="bg-teal-100 text-teal-700"
          />
        </section>

        {/* 오늘 일정 타임라인 */}
        <section>
          <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
            ⏰ 오늘 일정
          </h2>
          {schedules.length === 0 ? (
            <EmptyHint text="오늘은 등록된 일정이 없어요 🌱" />
          ) : (
            <ul className="flex flex-col gap-3">
              {schedules.map((s, i) => {
                const meta = SCHEDULE_META[s.type];
                return (
                  <li
                    key={i}
                    className={`rounded-2xl border-2 p-4 shadow-sm ${meta.card}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-700 tabular-nums">
                        {s.time}
                      </span>
                      <span
                        className={`text-sm font-bold px-2.5 py-1 rounded-full ${meta.badge}`}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <p className="text-xl font-semibold text-slate-800 mt-1">
                      {s.title}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 준비물 체크리스트 */}
        {supplyItems.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-700 mb-3 flex items-center gap-2">
              🎒 준비물 체크
            </h2>
            <ul className="bg-white rounded-3xl p-3 shadow-sm flex flex-col gap-1">
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
                        ✓
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
          <EmptyHint text="오늘은 아직 등록된 내용이 없어요. 곧 채워질 거예요! 😊" />
        )}
      </main>
    </div>
  );
}

function WalletCard({
  emoji,
  label,
  balance,
  color,
}: {
  emoji: string;
  label: string;
  balance: number;
  color: string;
}) {
  return (
    <div className={`rounded-3xl p-5 shadow-sm ${color}`}>
      <p className="text-base font-semibold flex items-center gap-1">
        <span className="text-2xl">{emoji}</span> {label}
      </p>
      <p className="text-3xl font-extrabold mt-2 tabular-nums">
        {formatNumber(balance)}
        <span className="text-lg font-bold ml-1">원</span>
      </p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
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
      />
    );
  return <Dashboard />;
}
