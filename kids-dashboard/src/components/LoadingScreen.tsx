export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50">
      <div className="text-6xl animate-pulse">🌈</div>
      <p className="mt-4 text-xl text-slate-500">불러오는 중…</p>
    </div>
  );
}
