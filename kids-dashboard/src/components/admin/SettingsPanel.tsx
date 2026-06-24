import { useState } from "react";
import { changePin, authErrorMessage } from "../../lib/auth";
import type { LogLevel } from "../../hooks/useLog";

// 비밀번호(PIN) 변경. 현재 로그인된 계정(엄마)의 PIN을 변경한다.
// (자녀 PIN 변경은 자녀 계정으로 로그인해 동일 메뉴를 쓰거나 콘솔에서 변경)
export default function SettingsPanel({
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 max-w-md">
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
