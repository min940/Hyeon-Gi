import { useState, type FormEvent } from "react";
import { loginWithPin, authErrorMessage } from "../lib/auth";

interface Props {
  email: string;
  title: string;
  emoji: string;
  accent: "sky" | "rose"; // 자녀=하늘색, 엄마=장미색
}

const ACCENTS = {
  sky: {
    bg: "from-sky-100 to-blue-200",
    btn: "bg-sky-500 hover:bg-sky-600 active:bg-sky-700",
    ring: "focus:ring-sky-400",
  },
  rose: {
    bg: "from-rose-100 to-pink-200",
    btn: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700",
    ring: "focus:ring-rose-400",
  },
};

export default function LoginScreen({ email, title, emoji, accent }: Props) {
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const a = ACCENTS[accent];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await loginWithPin(email, pin, remember);
      // 성공 시 onAuthStateChanged 가 화면을 전환한다.
    } catch (err) {
      setError(authErrorMessage(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-b ${a.bg} p-6`}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6"
      >
        <div className="text-6xl">{emoji}</div>
        <h1 className="text-2xl font-bold text-slate-700">{title}</h1>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="비밀번호 (숫자)"
          aria-label="비밀번호 입력"
          className={`w-full text-center text-3xl tracking-widest py-4 rounded-2xl bg-slate-100 outline-none focus:ring-4 ${a.ring}`}
        />

        <label className="flex items-center gap-3 self-start text-slate-600 text-lg cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-6 h-6 accent-sky-500"
          />
          로그인 상태 유지
        </label>

        {error && (
          <p className="text-rose-500 font-semibold text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || pin.length === 0}
          className={`w-full text-white text-2xl font-bold py-4 rounded-2xl shadow-md transition disabled:opacity-50 ${a.btn}`}
        >
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
