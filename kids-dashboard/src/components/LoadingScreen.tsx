import { LoaderCircle, Sparkles } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sky-50">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-sky-600 shadow-sm">
        <Sparkles size={34} strokeWidth={2.4} />
        <LoaderCircle
          className="absolute -right-2 -top-2 animate-spin text-amber-500"
          size={24}
          strokeWidth={2.4}
        />
      </div>
      <p className="mt-4 text-xl font-semibold text-slate-500">불러오는 중…</p>
    </div>
  );
}
