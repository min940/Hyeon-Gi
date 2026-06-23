import { useState } from "react";
import type { LogEntry } from "../../hooks/useLog";

const LEVEL_COLOR = {
  INFO: "text-sky-600",
  SUCCESS: "text-emerald-600",
  ERROR: "text-rose-600",
};

// 관리자 전용 접을 수 있는 작업 로그. 자녀 페이지에는 절대 넣지 않는다.
export default function LogPanel({ entries }: { entries: LogEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto mr-4 mb-1 block bg-slate-700 text-white text-sm px-3 py-1.5 rounded-t-lg shadow"
        >
          {open ? "▼ 로그 닫기" : "▲ 작업 로그"}{" "}
          {entries.length > 0 && `(${entries.length})`}
        </button>
        {open && (
          <div className="bg-slate-900 text-slate-100 rounded-t-xl shadow-2xl max-h-64 overflow-y-auto p-3 font-mono text-xs">
            {entries.length === 0 ? (
              <p className="text-slate-500">아직 작업 기록이 없습니다.</p>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="py-0.5 flex gap-2">
                  <span className="text-slate-500">{e.time}</span>
                  <span className={`font-bold ${LEVEL_COLOR[e.level]}`}>
                    [{e.level}]
                  </span>
                  <span className="break-all">{e.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
