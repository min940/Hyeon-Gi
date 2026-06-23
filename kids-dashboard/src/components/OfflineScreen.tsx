// 오프라인 시 보여주는 자녀 친화적 전체화면 안내.
// 복구는 useOnlineStatus 훅이 자동 감지하므로 별도 동작 없이 화면만 표시한다.
export default function OfflineScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-100 to-orange-200 p-8 text-center">
      <div className="text-7xl mb-6 animate-bounce">🌐</div>
      <h1 className="text-3xl font-bold text-slate-700 mb-3">
        인터넷 연결을 확인해 주세요
      </h1>
      <p className="text-xl text-slate-600">
        연결되면 자동으로 다시 시작돼요.
      </p>
      <p className="text-base text-slate-500 mt-2">(30초마다 자동으로 확인 중)</p>
    </div>
  );
}
