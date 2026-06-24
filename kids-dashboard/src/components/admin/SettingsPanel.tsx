import { useEffect, useState } from "react";
import { changePin, authErrorMessage } from "../../lib/auth";
import {
  fetchCategories,
  saveCategories,
  fetchAppConfig,
  saveAppConfig,
  fetchRewards,
  saveRewards,
} from "../../lib/data";
import { COLOR_OPTIONS, COLOR_META } from "../../lib/schedule";
import { DEFAULT_APP_CONFIG } from "../../types";
import type { Category, CategoryKind, ColorKey, Reward } from "../../types";
import type { LogLevel } from "../../hooks/useLog";

// 환경설정: ① 자녀 홈 타이틀 ② 일정 종류 ③ 과제 종류 ④ 비밀번호 변경.
export default function SettingsPanel({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <HomeTitleSetting log={log} />
      <RewardManager log={log} />
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-slate-600">자녀 홈 타이틀</h3>
      <p className="text-sm text-slate-500">
        자녀 화면 맨 위(🌈)에 보이는 문구입니다.
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
          className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
      )}
      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {busy ? "저장 중…" : "타이틀 저장"}
      </button>
    </div>
  );
}

// ── 보상 목표 관리 ──────────────────────────────────
function RewardManager({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRewards().then((r) => {
      if (active) {
        setRewards(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function update(i: number, patch: Partial<Reward>) {
    setRewards((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function add() {
    setRewards((rs) => [
      ...rs,
      { key: `rw${Date.now()}`, label: "", emoji: "🎁", stars: 10 },
    ]);
  }

  function remove(i: number) {
    setRewards((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const cleaned = rewards
      .map((r) => ({
        ...r,
        label: r.label.trim(),
        emoji: r.emoji.trim(),
        stars: Math.max(1, Math.round(r.stars) || 1),
      }))
      .filter((r) => r.label || r.emoji);
    setBusy(true);
    try {
      await saveRewards(cleaned);
      setRewards(cleaned);
      log("SUCCESS", "보상 목표 저장 완료 — 자녀 화면에 바로 반영");
    } catch (e) {
      log("ERROR", `보상 저장 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-slate-600">보상 목표 (별 모으기)</h3>
      <p className="text-sm text-slate-500">
        자녀가 일정·과제를 완료하면 별 ⭐ 을 모읍니다. 여기서 정한 보상이 자녀
        화면에 목표로 표시돼요. (별은 매주 월요일 새로 시작)
      </p>

      {loading ? (
        <p className="text-slate-400 text-center py-4">불러오는 중…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rewards.map((r, i) => (
            <div
              key={r.key}
              className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-2"
            >
              <input
                type="text"
                value={r.emoji}
                onChange={(e) => update(i, { emoji: e.target.value })}
                placeholder="🍦"
                className="w-12 text-center rounded-lg border border-slate-300 px-2 py-2 text-lg"
              />
              <input
                type="text"
                value={r.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="보상 이름 (예: 아이스크림)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <div className="flex items-center gap-1">
                <span className="text-amber-500">⭐</span>
                <input
                  type="number"
                  min={1}
                  value={r.stars}
                  onChange={(e) =>
                    update(i, { stars: Number(e.target.value) })
                  }
                  className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center tabular-nums"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-rose-400 px-2 py-1 rounded hover:bg-rose-50"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 font-bold hover:bg-amber-50"
          >
            + 보상 추가
          </button>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {busy ? "저장 중…" : "보상 저장"}
      </button>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-slate-600">{title}</h3>
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
                className={`flex items-center gap-2 rounded-xl border-2 p-2 ${meta.card}`}
              >
                <input
                  type="text"
                  value={c.emoji}
                  onChange={(e) => update(i, { emoji: e.target.value })}
                  placeholder="🏫"
                  className="w-12 text-center rounded-lg border border-slate-300 px-2 py-2 text-lg"
                />
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="종류 이름 (예: 학교)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                />
                <select
                  value={c.color}
                  onChange={(e) =>
                    update(i, { color: e.target.value as ColorKey })
                  }
                  className="rounded-lg border border-slate-300 px-2 py-2 bg-white"
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
                  className="text-rose-400 px-2 py-1 rounded hover:bg-rose-50"
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={add}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-600 font-bold hover:bg-sky-50"
          >
            + 종류 추가
          </button>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={busy || loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3">
      <h3 className="font-bold text-slate-600">비밀번호(PIN) 변경</h3>
      <p className="text-sm text-slate-500">
        현재 로그인한 계정(엄마)의 PIN을 변경합니다. 접미사는 자동으로 붙습니다.
      </p>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="새 PIN (숫자)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
      />
      <input
        type="password"
        inputMode="numeric"
        value={pin2}
        onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
        placeholder="새 PIN 다시 입력"
        className="rounded-lg border border-slate-300 px-3 py-2 text-lg"
      />
      {msg && <p className="text-sm font-semibold text-slate-600">{msg}</p>}
      <button
        onClick={handleChange}
        disabled={busy}
        className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {busy ? "변경 중…" : "비밀번호 변경"}
      </button>
    </div>
  );
}
