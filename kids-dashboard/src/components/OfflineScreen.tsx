import { WifiOff } from "lucide-react";

// 오프라인 시 보여주는 자녀 친화적 전체화면 안내.
// 복구는 useOnlineStatus 훅이 자동 감지하므로 별도 동작 없이 화면만 표시한다.
export default function OfflineScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 via-white to-slate-100 p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-sm">
        <WifiOff size={40} strokeWidth={2.4} />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-slate-800">
        인터넷 연결을 확인해 주세요
      </h1>
      <p className="text-xl text-slate-600">
        연결되면 자동으로 다시 시작돼요.
      </p>
      <p className="mt-2 text-base text-slate-500">(30초마다 자동으로 확인 중)</p>
    </div>
  );
}
