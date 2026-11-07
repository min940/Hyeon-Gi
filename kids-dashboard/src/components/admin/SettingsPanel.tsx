import { useEffect, useState } from "react";
import {
  Gift,
  KeyRound,
  MessageCircleHeart,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Tags,
  Undo2,
  X,
} from "lucide-react";
import { changePin, authErrorMessage } from "../../lib/auth";
import {
  fetchCategories,
  saveCategories,
  fetchAppConfig,
  saveAppConfig,
  subscribeStarGoal,
  saveStarGoal,
} from "../../lib/data";
import { subscribeEarnedStars, shownStars } from "../../lib/stars";
import { COLOR_OPTIONS, COLOR_META } from "../../lib/schedule";
import { DEFAULT_APP_CONFIG, DEFAULT_STAR_GOAL } from "../../types";
import type {
  Category,
  CategoryKind,
  ColorKey,
  StarGoal,
  StarGoalHistory,
} from "../../types";
import type { LogLevel } from "../../hooks/useLog";

// 환경설정: ① 자녀 홈 타이틀 ② 고정 전할말 ③ 별 목표·보상 ④ 일정/과제 종류 ⑤ 비밀번호 변경.
export default function SettingsPanel({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <HomeTitleSetting log={log} />
      <NoticeSetting log={log} />
      <StarGoalSetting log={log} />
      <CategoryManager
        kind="schedule"
        title="일정 종류 (일정 추가 드롭박스)"
        log={log}
      />
      <CategoryManager
        kind="task"
        title="과제 종류 (과제 추가 드롭박스)"
        log={log}
      />
      <PinChanger log={log} />
    </div>
  );
}

// ── 자녀 홈 타이틀 ──────────────────────────────────
function HomeTitleSetting({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAppConfig().then((c) => {
      if (active) {
        setTitle(c.homeTitle);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    const t = title.trim() || DEFAULT_APP_CONFIG.homeTitle;
    setBusy(true);
    try {
      await saveAppConfig({ homeTitle: t });
      setTitle(t);
      log("SUCCESS", "자녀 홈 타이틀 저장 완료 — 자녀 화면에 실시간 반영");
    } catch (e) {
      log("ERROR", `홈 타이틀 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <Sparkles size={20} className="text-sky-600" strokeWidth={2.4} />
        자녀 홈 타이틀
      </h3>
      <p className="text-sm text-slate-500">
        자녀 화면 맨 위에 보이는 문구입니다.
      </p>
      {loading ? (
        <p className="text-slate-400 text-center py-2">불러오는 중…</p>
      ) : (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={DEFAULT_APP_CONFIG.homeTitle}
          maxLength={40}
          className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      )}
      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        <Save size={18} strokeWidth={2.4} />
        {busy ? "저장 중…" : "타이틀 저장"}
      </button>
    </div>
  );
}

// ── 엄마 전할말(고정) ───────────────────────────────
// 자녀 화면에 항상 표시되는 기본 전할말. 특정 날짜에 "일정·전할말" 탭에서
// 따로 적은 전할말이 있으면 그날은 그게 우선 표시된다.
function NoticeSetting({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAppConfig().then((c) => {
      if (active) {
        setNotice(c.notice);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setBusy(true);
    try {
      await saveAppConfig({ notice: notice.trim() });
      log("SUCCESS", "고정 전할말 저장 완료 — 자녀 화면에 실시간 반영");
    } catch (e) {
      log("ERROR", `전할말 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <MessageCircleHeart size={20} className="text-amber-600" strokeWidth={2.4} />
        엄마 전할말 (고정)
      </h3>
      <p className="text-sm text-slate-500">
        자녀 화면에 늘 표시되는 기본 메시지입니다. 특정 날짜에 "일정·전할말"
        탭에서 따로 적은 전할말이 있으면 그날은 그게 우선 표시됩니다.
      </p>
      {loading ? (
        <p className="text-slate-400 text-center py-2">불러오는 중…</p>
      ) : (
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="예: 오늘도 사랑해 ❤️ 학교 잘 다녀와!"
          rows={3}
          maxLength={200}
          className="resize-y rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
        />
      )}
      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        <Save size={18} strokeWidth={2.4} />
        {busy ? "저장 중…" : "전할말 저장"}
      </button>
    </div>
  );
}

// ── 별 목표 · 보상 ──────────────────────────────────────
// 모은 별(표시값) = 누적 획득(earned) - 차감(redeemed).
// 보상 1번 완료: redeemed += 목표 / 전체 초기화: 0/4·기본 보상으로 / 되돌리기: 직전 상태 복원.
function StarGoalSetting({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [goal, setGoal] = useState<StarGoal>(DEFAULT_STAR_GOAL);
  const [earned, setEarned] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [goalStarsInput, setGoalStarsInput] = useState("4");
  const [goalLabelInput, setGoalLabelInput] = useState(
    DEFAULT_STAR_GOAL.goalLabel,
  );
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      subscribeStarGoal((g) => {
        setGoal(g);
        setGoalStarsInput(String(g.goalStars));
        setGoalLabelInput(g.goalLabel);
        setLoaded(true);
      }),
    [],
  );
  useEffect(() => subscribeEarnedStars(setEarned), []);

  const shown = shownStars(earned, goal.redeemed);
  const goalStars = Math.max(1, goal.goalStars);
  const lastAction = goal.history[goal.history.length - 1];
  const dirty =
    Number(goalStarsInput) !== goal.goalStars ||
    goalLabelInput.trim() !== goal.goalLabel;

  // 현재 상태를 history 에 쌓고 새 상태로 저장
  async function commit(next: Partial<StarGoal>, action: string, msg: string) {
    const snapshot: StarGoalHistory = {
      goalStars: goal.goalStars,
      goalLabel: goal.goalLabel,
      redeemed: goal.redeemed,
      action,
      at: Date.now(),
    };
    setBusy(true);
    try {
      await saveStarGoal({
        ...goal,
        ...next,
        history: [...goal.history, snapshot].slice(-10),
      });
      log("SUCCESS", msg);
    } catch (e) {
      log("ERROR", `별 목표 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    const n = Math.max(1, Math.min(99, Math.floor(Number(goalStarsInput) || 0)));
    const label = goalLabelInput.trim() || DEFAULT_STAR_GOAL.goalLabel;
    await commit(
      { goalStars: n, goalLabel: label },
      `목표 변경 (${goal.goalStars}개·${goal.goalLabel} → ${n}개·${label})`,
      `별 목표 저장: ${n}개 · ${label}`,
    );
  }

  async function handleRedeem() {
    if (shown < goalStars) return;
    const after = shown - goalStars;
    if (
      !window.confirm(
        `보상 1번 완료 처리할까요?\n(${goal.goalLabel})\n\n모은 별 ${shown} → ${after} / 목표 ${goalStars}`,
      )
    )
      return;
    await commit(
      { redeemed: goal.redeemed + goalStars },
      `보상 1번 완료 (${shown}/${goalStars} → ${after}/${goalStars})`,
      `보상 1번 완료 — 모은 별 ${shown} → ${after}`,
    );
  }

  async function handleResetAll() {
    if (
      !window.confirm(
        `전체 초기화할까요?\n\n모은 별 ${shown} / 목표 ${goalStars} → 0 / 목표 ${DEFAULT_STAR_GOAL.goalStars}\n보상 내용 → "${DEFAULT_STAR_GOAL.goalLabel}"\n\n실수했다면 '되돌리기'로 복구할 수 있어요.`,
      )
    )
      return;
    await commit(
      {
        goalStars: DEFAULT_STAR_GOAL.goalStars,
        goalLabel: DEFAULT_STAR_GOAL.goalLabel,
        redeemed: earned, // 표시값 0
      },
      `전체 초기화 (${shown}/${goalStars} → 0/${DEFAULT_STAR_GOAL.goalStars})`,
      "별 목표 전체 초기화 완료 (0 / 4, 1만원 지급)",
    );
  }

  async function handleUndo() {
    if (!lastAction) return;
    if (
      !window.confirm(
        `직전 작업을 되돌릴까요?\n\n되돌릴 작업: ${lastAction.action}\n복원 후: 모은 별 ${shownStars(earned, lastAction.redeemed)} / 목표 ${lastAction.goalStars} · ${lastAction.goalLabel}`,
      )
    )
      return;
    setBusy(true);
    try {
      await saveStarGoal({
        goalStars: lastAction.goalStars,
        goalLabel: lastAction.goalLabel,
        redeemed: lastAction.redeemed,
        history: goal.history.slice(0, -1),
      });
      log("SUCCESS", `되돌리기 완료: ${lastAction.action}`);
    } catch (e) {
      log("ERROR", `되돌리기 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <Star size={20} className="text-amber-500" strokeWidth={2.4} />
        별 목표 · 보상
      </h3>
      <p className="text-sm text-slate-500">
        그날 일정·과제를 모두 완료하면 별 1개. 별은 계속 쌓이고, 목표만큼
        모으면 보상을 줍니다.
      </p>

      {/* 현재 상태 */}
      <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
        <span className="font-bold text-amber-700">내가 모은 별</span>
        <span className="text-2xl font-extrabold text-amber-600 tabular-nums">
          {loaded ? shown : "…"}
          <span className="text-base font-bold text-amber-500/80">
            {" "}
            / 목표 {goalStars}
          </span>
        </span>
      </div>

      {/* 목표/보상 입력 */}
      <div className="grid grid-cols-[6.5rem_1fr] gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
          목표 별 개수
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={goalStarsInput}
            onChange={(e) => setGoalStarsInput(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-lg font-bold text-slate-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
          보상 내용
          <input
            type="text"
            value={goalLabelInput}
            onChange={(e) => setGoalLabelInput(e.target.value)}
            placeholder="예: 1만원 지급"
            maxLength={40}
            className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </label>
      </div>
      <button
        onClick={handleSave}
        disabled={busy || !loaded || !dirty}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        <Save size={18} strokeWidth={2.4} />
        {busy ? "저장 중…" : "목표·보상 저장"}
      </button>

      {/* 보상 완료 / 초기화 / 되돌리기 */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={handleRedeem}
          disabled={busy || !loaded || shown < goalStars}
          title={
            shown < goalStars
              ? `목표(${goalStars}개)를 채우면 눌러요`
              : "분자에서 목표 개수만큼 뺍니다"
          }
          className={`${btn} border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100`}
        >
          <Gift size={16} strokeWidth={2.4} />
          보상 1번 완료
        </button>
        <button
          onClick={handleResetAll}
          disabled={busy || !loaded}
          className={`${btn} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
        >
          <RotateCcw size={16} strokeWidth={2.4} />
          전체 초기화
        </button>
        <button
          onClick={handleUndo}
          disabled={busy || !loaded || !lastAction}
          title={lastAction ? `되돌릴 작업: ${lastAction.action}` : "되돌릴 작업 없음"}
          className={`${btn} border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100`}
        >
          <Undo2 size={16} strokeWidth={2.4} />
          되돌리기
        </button>
      </div>
      <p className="text-xs text-slate-400">
        {lastAction
          ? `되돌리기 대상: ${lastAction.action}`
          : "보상 1번 완료 = 모은 별에서 목표 개수만큼 빼기 · 전체 초기화 = 0 / 4, 1만원 지급으로"}
      </p>
    </div>
  );
}

// ── 일정/과제 종류 관리 (kind 별) ──────────────────────
function CategoryManager({
  kind,
  title,
  log,
}: {
  kind: CategoryKind;
  title: string;
  log: (level: LogLevel, msg: string) => void;
}) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCategories(kind).then((c) => {
      if (active) {
        setCats(c);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [kind]);

  function update(i: number, patch: Partial<Category>) {
    setCats((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function add() {
    const key = `cat${Date.now()}`;
    setCats((cs) => [...cs, { key, label: "", emoji: "📌", color: "sky" }]);
  }

  function remove(i: number) {
    const label = cats[i]?.label?.trim();
    if (
      !window.confirm(
        label ? `"${label}" 종류를 삭제할까요?` : "이 종류를 삭제할까요?",
      )
    )
      return;
    setCats((cs) => cs.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const cleaned = cats
      .map((c) => ({ ...c, label: c.label.trim(), emoji: c.emoji.trim() }))
      .filter((c) => c.label || c.emoji);
    if (cleaned.length === 0) {
      log("ERROR", "종류는 최소 1개 이상이어야 합니다.");
      return;
    }
    setBusy(true);
    try {
      await saveCategories(kind, cleaned);
      setCats(cleaned);
      log("SUCCESS", `${title} 저장 완료 — 드롭박스에 바로 반영`);
    } catch (e) {
      log("ERROR", `종류 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const target = kind === "task" ? "과제 추가" : "일정 추가";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <Tags size={20} className="text-sky-600" strokeWidth={2.4} />
        {title}
      </h3>
      <p className="text-sm text-slate-500">
        여기서 추가한 종류는 <b>{target}</b> 드롭박스에 바로 나타납니다.
      </p>

      {loading ? (
        <p className="text-slate-400 text-center py-4">불러오는 중…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => {
            const meta = COLOR_META[c.color] ?? COLOR_META.slate;
            return (
              <div
                key={c.key}
                className={`flex items-center gap-2 rounded-xl border p-2 ${meta.card}`}
              >
                <input
                  type="text"
                  value={c.emoji}
                  onChange={(e) => update(i, { emoji: e.target.value })}
                  placeholder="🏫"
                  className="w-12 text-center rounded-xl border border-slate-300 px-2 py-2 text-lg outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="종류 이름 (예: 학교)"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
                <Palette
                  size={17}
                  className="hidden flex-shrink-0 text-slate-400 sm:block"
                  strokeWidth={2.4}
                />
                <select
                  value={c.color}
                  onChange={(e) =>
                    update(i, { color: e.target.value as ColorKey })
                  }
                  className="rounded-xl border border-slate-300 bg-white px-2 py-2 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  {COLOR_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-50"
                >
                  <X size={16} strokeWidth={2.6} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={add}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-300 py-2.5 font-bold text-sky-700 transition hover:bg-sky-50"
          >
            <Plus size={17} strokeWidth={2.6} />
            종류 추가
          </button>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        <Save size={18} strokeWidth={2.4} />
        {busy ? "저장 중…" : "종류 저장"}
      </button>
    </div>
  );
}

// ── 비밀번호(PIN) 변경 ──────────────────────────────
function PinChanger({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleChange() {
    setMsg("");
    if (pin.length < 4) {
      setMsg("PIN은 4자리 이상으로 입력하세요.");
      return;
    }
    if (pin !== pin2) {
      setMsg("두 번 입력한 PIN이 서로 달라요.");
      return;
    }
    setBusy(true);
    try {
      await changePin(pin);
      log("SUCCESS", "비밀번호(PIN) 변경 완료");
      setMsg("✅ 비밀번호가 변경되었습니다.");
      setPin("");
      setPin2("");
    } catch (e) {
      const m = authErrorMessage(e);
      setMsg(m);
      log("ERROR", `비밀번호 변경 실패: ${m}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <KeyRound size={20} className="text-slate-700" strokeWidth={2.4} />
        비밀번호(PIN) 변경
      </h3>
      <p className="text-sm text-slate-500">
        현재 로그인한 계정(엄마)의 PIN을 변경합니다. 접미사는 자동으로 붙습니다.
      </p>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="새 PIN (숫자)"
        className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
      />
      <input
        type="password"
        inputMode="numeric"
        value={pin2}
        onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
        placeholder="새 PIN 다시 입력"
        className="rounded-xl border border-slate-300 px-3 py-2 text-lg outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
      />
      {msg && <p className="text-sm font-semibold text-slate-600">{msg}</p>}
      <button
        onClick={handleChange}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        <Save size={18} strokeWidth={2.4} />
        {busy ? "변경 중…" : "비밀번호 변경"}
      </button>
    </div>
  );
}
