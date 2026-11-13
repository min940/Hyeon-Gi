import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  LocateFixed,
  Radio,
  Satellite,
  ShieldCheck,
  Smartphone,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { tsToDate, timeAgo } from "../../lib/dates";
import type { KidDeviceStatus, LocationConfig } from "../../types";

// 자녀 기기 상태 카드 — 위치가 안 잡힐 때 "왜"인지 바로 보이게 한다.
// 자녀 앱(v1.3+)이 주기적으로 보내는 생존 신호(locations/kidStatus)를 표시.

type Level = "ok" | "warn" | "bad";

const LEVEL_STYLE: Record<Level, { text: string; icon: LucideIcon; iconCls: string }> = {
  ok: { text: "text-emerald-700", icon: CheckCircle2, iconCls: "text-emerald-500" },
  warn: { text: "text-amber-700", icon: AlertTriangle, iconCls: "text-amber-500" },
  bad: { text: "text-rose-700", icon: XCircle, iconCls: "text-rose-500" },
};

const BADGE: Record<Level, { label: string; cls: string }> = {
  ok: { label: "정상", cls: "bg-emerald-100 text-emerald-700" },
  warn: { label: "확인 필요", cls: "bg-amber-100 text-amber-700" },
  bad: { label: "연결 끊김", cls: "bg-rose-100 text-rose-700" },
};

const CARD: Record<Level, string> = {
  ok: "border-slate-200 bg-white",
  warn: "border-amber-200 bg-amber-50/60",
  bad: "border-rose-200 bg-rose-50/60",
};

const APP_NAME = "오늘의 하루";

// 마지막 신호가 얼마나 지났는지로 연결 상태 판정
// (신호 주기의 2배+5분까지 정상, 그 뒤 1시간(또는 주기 4배)까지 지연, 이후 끊김)
function connectionLevel(status: KidDeviceStatus, now: number): Level {
  const hb = tsToDate(status.heartbeatAt);
  if (!hb) return "bad";
  const ageMin = (now - hb.getTime()) / 60_000;
  const hbMin = status.heartbeatMinutes ?? 15;
  if (ageMin <= hbMin * 2 + 5) return "ok";
  if (ageMin <= Math.max(60, hbMin * 4)) return "warn";
  return "bad";
}

interface Row {
  icon: LucideIcon;
  label: string;
  value: string;
  level: Level;
}

export default function DeviceStatusCard({
  status,
  loaded,
  config,
  now,
}: {
  status: KidDeviceStatus | null;
  loaded: boolean;
  config: LocationConfig;
  now: number; // 주기적으로 갱신되는 현재 시각(ms) — 경과 시간 재계산용
}) {
  if (!loaded) return null;

  // 신호 문서가 없음 = 자녀 폰 앱이 아직 구버전(v1.3 미만)이거나 한 번도 실행 안 됨
  if (!status) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
          <Smartphone size={20} className="text-slate-500" strokeWidth={2.4} />
          자녀 기기 상태
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
            앱 업데이트 필요
          </span>
        </h3>
        <p className="text-sm text-slate-500">
          자녀 폰에 새 앱(v1.3 이상)을 설치하고 한 번 열면, 앱 연결·위치 권한·절전
          상태가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  const hb = tsToDate(status.heartbeatAt);
  const conn = connectionLevel(status, now);
  const rows: Row[] = [];
  const tips: string[] = [];

  // ① 앱 연결
  rows.push({
    icon: Radio,
    label: "앱 연결",
    value:
      conn === "ok"
        ? `정상 · ${timeAgo(hb)} 신호`
        : conn === "warn"
          ? `신호 지연 · 마지막 ${timeAgo(hb)}`
          : `신호 끊김 · 마지막 ${timeAgo(hb)}`,
    level: conn,
  });
  if (conn === "warn") {
    tips.push(
      "폰이 절전 중이면 신호가 늦을 수 있어요. 계속되면 자녀 폰에서 앱을 한 번 열어 주세요.",
    );
  } else if (conn === "bad") {
    tips.push(
      `자녀 폰에서 「${APP_NAME}」 앱을 한 번 열어 주세요. 폰 전원과 인터넷(데이터·와이파이)도 확인해 주세요.`,
    );
  }

  // ② 위치 서비스 (워치독이 대신 보고한 경우)
  if (status.serviceRunning === false) {
    rows.push({
      icon: Satellite,
      label: "위치 서비스",
      value: "꺼짐 (점검 기능이 대신 보고 중)",
      level: "warn",
    });
    tips.push("자녀 폰에서 앱을 한 번 열면 위치 서비스가 다시 시작됩니다.");
  } else if (config.enabled && status.collecting === false) {
    rows.push({
      icon: Satellite,
      label: "위치 수집",
      value: "멈춤",
      level: "warn",
    });
  }

  // ③ 위치 권한
  if (status.permission) {
    const p = status.permission;
    rows.push({
      icon: ShieldCheck,
      label: "위치 권한",
      value:
        p === "always" ? "항상 허용" : p === "foreground" ? "앱 사용 중에만 허용" : "권한 없음",
      level: p === "always" ? "ok" : p === "foreground" ? "warn" : "bad",
    });
    if (p === "foreground") {
      tips.push(
        `자녀 폰 설정 → 앱 → ${APP_NAME} → 권한 → 위치 → '항상 허용'으로 바꿔 주세요. (지금은 폰을 껐다 켜면 앱을 열기 전까지 수집이 멈춥니다)`,
      );
    } else if (p === "none") {
      tips.push(`자녀 폰 설정 → 앱 → ${APP_NAME} → 권한 → 위치를 '항상 허용'으로 켜 주세요.`);
    }
  }

  // ④ 폰 위치(GPS)
  if (typeof status.locationEnabled === "boolean") {
    rows.push({
      icon: LocateFixed,
      label: "폰 위치(GPS)",
      value: status.locationEnabled ? "켜짐" : "꺼짐",
      level: status.locationEnabled ? "ok" : "bad",
    });
    if (!status.locationEnabled) {
      tips.push("자녀 폰 화면 위를 쓸어내려 '위치'를 켜 주세요.");
    }
  }

  // ⑤ 배터리 절전 제외
  if (typeof status.batteryExempt === "boolean") {
    rows.push({
      icon: BatteryCharging,
      label: "배터리 절전",
      value: status.batteryExempt ? "제외됨 (제한 없음)" : "절전 대상",
      level: status.batteryExempt ? "ok" : "warn",
    });
    if (!status.batteryExempt) {
      tips.push(
        `자녀 폰 설정 → 앱 → ${APP_NAME} → 배터리 → '제한 없음'으로 바꿔 주세요. (절전 대상이면 폰이 위치 서비스를 자주 끕니다)`,
      );
    }
  }

  // 전체 상태 = 가장 나쁜 항목. 연결이 끊기면 무조건 "연결 끊김"
  const overall: Level =
    conn === "bad"
      ? "bad"
      : rows.some((r) => r.level !== "ok")
        ? "warn"
        : "ok";

  // 최근 24시간 이내 오류만 표시
  const errAt = tsToDate(status.lastErrorAt);
  const showError =
    !!status.lastError && !!errAt && now - errAt.getTime() < 24 * 3_600_000;

  const footer = [
    status.appVersion ? `앱 v${status.appVersion}` : null,
    status.model || null,
    typeof status.battery === "number" ? `배터리 ${status.battery}%` : null,
  ].filter(Boolean);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-sm ${CARD[overall]}`}
    >
      <h3 className="flex items-center gap-1.5 font-bold text-slate-600">
        <Smartphone size={20} className="text-sky-600" strokeWidth={2.4} />
        자녀 기기 상태
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[overall].cls}`}
        >
          {BADGE[overall].label}
        </span>
      </h3>

      {conn !== "ok" && (
        <p className="text-xs text-slate-500">
          아래 항목은 마지막 신호 때의 상태입니다.
        </p>
      )}

      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => {
          const st = LEVEL_STYLE[r.level];
          const StateIcon = st.icon;
          return (
            <li key={r.label} className="flex min-w-0 items-start gap-2 text-sm">
              <r.icon
                size={16}
                className="mt-0.5 shrink-0 text-slate-400"
                strokeWidth={2.4}
              />
              <span className="w-[5.5rem] shrink-0 text-slate-500">{r.label}</span>
              <span className={`flex min-w-0 flex-1 items-start gap-1 font-bold ${st.text}`}>
                <StateIcon
                  size={15}
                  className={`mt-0.5 shrink-0 ${st.iconCls}`}
                  strokeWidth={2.4}
                />
                <span className="min-w-0 break-keep">{r.value}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {tips.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-white/80 p-3 text-sm text-slate-600">
          {tips.map((t) => (
            <li key={t} className="flex gap-1.5">
              <span className="font-bold text-amber-600">→</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}

      {showError && (
        <p className="text-xs text-slate-500">
          최근 오류: {status.lastError} ({timeAgo(errAt)})
        </p>
      )}

      {footer.length > 0 && (
        <p className="text-xs text-slate-400">{footer.join(" · ")}</p>
      )}
    </div>
  );
}
