import { useEffect, useState } from "react";
import {
  Battery,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  MapPin,
  Radar,
  Satellite,
  Smartphone,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  subscribeLocation,
  subscribeLocationConfig,
  saveLocationConfig,
  requestPreciseLocation,
  subscribeLocationRequest,
  fetchLocationHistory,
} from "../../lib/data";
import { tsToDate, timeAgo } from "../../lib/dates";
import type {
  KidLocation,
  LocationConfig,
  LocationRequest,
  LocationSource,
} from "../../types";
import { DEFAULT_LOCATION_CONFIG } from "../../types";
import type { LogLevel } from "../../hooks/useLog";
import GoogleMap from "./GoogleMap";

const SOURCE_META: Record<LocationSource, { label: string; icon: LucideIcon }> = {
  background: { label: "자동 수집", icon: Satellite },
  foreground: { label: "앱 사용 중", icon: Smartphone },
  manual: { label: "정밀 요청", icon: Crosshair },
};

const INTERVAL_OPTIONS = [5, 10, 15, 30, 60];

type PathMode = "current" | "today" | "7d" | "30d";

const PATH_MODES: { key: PathMode; label: string }[] = [
  { key: "current", label: "현재 위치" },
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
];

// 모드 → 조회 시작 시각(ms)
function sinceMsFor(mode: PathMode): number {
  const now = Date.now();
  if (mode === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (mode === "7d") return now - 7 * 86_400_000;
  if (mode === "30d") return now - 30 * 86_400_000;
  return now;
}

export default function LocationPanel({
  log,
}: {
  log: (level: LogLevel, msg: string) => void;
}) {
  const [loc, setLoc] = useState<KidLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);
  const [config, setConfig] = useState<LocationConfig>(DEFAULT_LOCATION_CONFIG);
  const [request, setRequest] = useState<LocationRequest | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [pathMode, setPathMode] = useState<PathMode>("current");
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);
  const [pathLoading, setPathLoading] = useState(false);

  async function selectPathMode(mode: PathMode) {
    setPathMode(mode);
    if (mode === "current") {
      setPath([]);
      return;
    }
    setPathLoading(true);
    try {
      const pts = await fetchLocationHistory(sinceMsFor(mode));
      setPath(pts.map((p) => ({ lat: p.lat, lng: p.lng })));
      log("INFO", `이동 경로 ${pts.length}개 지점 불러옴 (${mode})`);
    } catch (e) {
      log("ERROR", `이동 경로 불러오기 실패: ${(e as Error).message}`);
      setPath([]);
    } finally {
      setPathLoading(false);
    }
  }

  useEffect(() => {
    const u1 = subscribeLocation((l) => {
      setLoc(l);
      setLocLoaded(true);
    });
    const u2 = subscribeLocationConfig(setConfig);
    const u3 = subscribeLocationRequest(setRequest);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  async function updateConfig(patch: Partial<LocationConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    try {
      await saveLocationConfig(next);
      log("SUCCESS", `위치 설정 저장: ${next.enabled ? "켜짐" : "꺼짐"}, ${next.intervalMinutes}분`);
    } catch (e) {
      log("ERROR", `위치 설정 저장 실패: ${(e as Error).message}`);
    }
  }

  async function handlePreciseRequest() {
    setRequesting(true);
    try {
      await requestPreciseLocation();
      log("INFO", "정밀 위치 요청 보냄 — 자녀 기기 응답 대기 중");
    } catch (e) {
      log("ERROR", `정밀 위치 요청 실패: ${(e as Error).message}`);
    } finally {
      setRequesting(false);
    }
  }

  const updatedAt = tsToDate(loc?.updatedAt);
  const requestedAt = tsToDate(request?.requestedAt);
  const fulfilledAt = tsToDate(request?.fulfilledAt);
  // 요청 후 아직 응답이 안 온 상태 판정
  const awaitingFix =
    request?.status === "pending" ||
    (requestedAt != null &&
      (fulfilledAt == null || fulfilledAt.getTime() < requestedAt.getTime()));
  const SourceIcon = loc ? SOURCE_META[loc.source]?.icon : Satellite;

  return (
    <div className="flex flex-col gap-5">
      {/* 이동 경로 기간 선택 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600">
          <MapPin size={16} className="text-sky-600" strokeWidth={2.4} />
          이동 경로
        </span>
        {PATH_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => selectPathMode(m.key)}
            className={`rounded-xl border px-3.5 py-1.5 text-sm font-bold transition ${
              pathMode === m.key
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            {m.label}
          </button>
        ))}
        {pathLoading && (
          <span className="text-sm text-slate-400">불러오는 중…</span>
        )}
        {pathMode !== "current" && !pathLoading && (
          <span className="text-sm text-slate-400">
            {path.length > 0
              ? `${path.length}개 지점`
              : "이 기간 기록 없음"}
          </span>
        )}
      </div>

      {/* 지도 (구글 지도 JavaScript API) */}
      {locLoaded && loc ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <GoogleMap
            lat={loc.lat}
            lng={loc.lng}
            path={pathMode === "current" ? undefined : path}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          {locLoaded
            ? "아직 수집된 위치가 없어요. 자녀가 앱에 로그인하고 위치 권한을 허용하면 표시됩니다."
            : "위치 불러오는 중…"}
        </div>
      )}

      {/* 현재 위치 정보 */}
      {loc && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <Timer size={15} strokeWidth={2.4} />
              마지막 확인
            </p>
            <p className="text-lg font-bold text-slate-700">
              {timeAgo(updatedAt)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">방식</p>
            <p className="flex items-center gap-1.5 text-lg font-semibold text-slate-700">
              {SourceIcon && <SourceIcon size={18} strokeWidth={2.4} />}
              {SOURCE_META[loc.source]?.label}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <Radar size={15} strokeWidth={2.4} />
              정확도
            </p>
            <p className="text-lg font-semibold text-slate-700">
              약 {Math.round(loc.accuracy)}m
            </p>
          </div>
          {typeof loc.battery === "number" && (
            <div>
              <p className="flex items-center gap-1.5 text-sm text-slate-400">
                <Battery size={15} strokeWidth={2.4} />
                배터리
              </p>
              <p className="text-lg font-semibold text-slate-700">
                {loc.battery}%
              </p>
            </div>
          )}
          <a
            href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-sky-200 px-3 py-2 font-bold text-sky-700 transition hover:bg-sky-50"
          >
            구글 지도에서 열기
            <ExternalLink size={15} strokeWidth={2.4} />
          </a>
        </div>
      )}

      {/* 정밀 위치 1회 요청 */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 font-bold text-slate-600">
          <Crosshair size={20} className="text-sky-600" strokeWidth={2.4} />
          정밀 위치 요청
        </h3>
        <p className="text-sm text-slate-500">
          지금 정확한 위치가 필요할 때 누르세요. 자녀 기기가 GPS로 한 번
          정밀하게 측정해 보고합니다. (앱이 실행/백그라운드 동작 중이어야 함)
        </p>
        <button
          onClick={handlePreciseRequest}
          disabled={requesting}
          className="inline-flex self-start items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
        >
          <Crosshair size={17} strokeWidth={2.4} />
          지금 정밀 위치 요청
        </button>
        {request && (
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            {awaitingFix
              ? "요청 보냄 — 응답 대기 중…"
              : `완료 (${timeAgo(fulfilledAt)})`}
            {!awaitingFix && (
              <CheckCircle2 size={16} className="text-emerald-600" />
            )}
          </p>
        )}
      </div>

      {/* 수집 설정 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold text-slate-600">위치 수집 설정</h3>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="w-6 h-6 accent-sky-500"
          />
          <span className="text-lg text-slate-700">
            위치 수집 {config.enabled ? "켜짐" : "꺼짐"}
          </span>
        </label>

        <div>
          <p className="text-sm text-slate-500 mb-2">
            백그라운드 수집 간격 (짧을수록 최신이지만 배터리를 더 씁니다)
          </p>
          <div className="flex flex-wrap gap-2">
            {INTERVAL_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => updateConfig({ intervalMinutes: m })}
                className={`rounded-xl border px-4 py-2 font-semibold transition ${
                  config.intervalMinutes === m
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {m}분
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            권장: 10~15분 (등하교 동선 파악에 충분하며 배터리 하루 약 2~5%)
          </p>
        </div>
      </div>
    </div>
  );
}
