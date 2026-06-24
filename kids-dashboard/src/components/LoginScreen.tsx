import { useState, type FormEvent } from "react";
import { KeyRound, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { loginWithPin, authErrorMessage } from "../lib/auth";

interface Props {
  email: string;
  title: string;
  emoji: string;
  accent: "sky" | "rose"; // 자녀=하늘색, 엄마=장미색
  // 안드로이드 앱(자녀 기기)에서 로그인 시 PIN을 네이티브로 전달해
  // 백그라운드 위치 서비스 자격증명으로 사용. (자녀 로그인에서만 true)
  notifyAndroid?: boolean;
}

// 안드로이드 WebView 가 주입하는 다리 (없으면 일반 브라우저)
interface AndroidLocationBridge {
  onKidLogin?: (pin: string) => void;
}

const ACCENTS = {
  sky: {
    bg: "from-sky-50 via-white to-amber-50",
    btn: "bg-sky-500 hover:bg-sky-600 active:bg-sky-700",
    ring: "focus:ring-sky-400",
    icon: "bg-sky-100 text-sky-600",
    check: "accent-sky-500",
  },
  rose: {
    bg: "from-rose-50 via-white to-slate-100",
    btn: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700",
    ring: "focus:ring-rose-400",
    icon: "bg-rose-100 text-rose-600",
    check: "accent-rose-500",
  },
};

export default function LoginScreen({
  email,
  title,
  emoji,
  accent,
  notifyAndroid,
}: Props) {
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
      // 안드로이드 앱이면 PIN을 네이티브로 전달(백그라운드 위치 자격증명)
      if (notifyAndroid) {
        const bridge = (window as unknown as {
          AndroidLocation?: AndroidLocationBridge;
        }).AndroidLocation;
        bridge?.onKidLogin?.(pin);
      }
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
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-white bg-white/95 p-8 shadow-xl"
      >
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${a.icon}`}>
          {emoji.length <= 2 ? (
            <span className="text-3xl">{emoji}</span>
          ) : (
            <UserRound size={32} strokeWidth={2.4} />
          )}
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            숫자 비밀번호로 로그인해 주세요
          </p>
        </div>

        <div className="relative w-full">
          <KeyRound
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={22}
            strokeWidth={2.4}
          />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="비밀번호 (숫자)"
            aria-label="비밀번호 입력"
            className={`w-full rounded-2xl bg-slate-100 py-4 pl-12 pr-4 text-center text-3xl tracking-widest outline-none transition focus:ring-4 ${a.ring}`}
          />
        </div>

        <label className="flex items-center gap-3 self-start text-slate-600 text-lg cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className={`h-6 w-6 rounded ${a.check}`}
          />
          <ShieldCheck size={20} strokeWidth={2.4} />
          로그인 상태 유지
        </label>

        {error && (
          <p className="text-rose-500 font-semibold text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || pin.length === 0}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-2xl font-bold text-white shadow-md transition disabled:opacity-50 ${a.btn}`}
        >
          <LogIn size={24} strokeWidth={2.4} />
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
