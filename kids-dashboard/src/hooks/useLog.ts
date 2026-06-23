import { useCallback, useState } from "react";

export type LogLevel = "INFO" | "SUCCESS" | "ERROR";

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  time: string; // HH:MM:SS
}

// 관리자 페이지 하단 미니 로그 영역용 훅.
export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const log = useCallback((level: LogLevel, message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("ko-KR", { hour12: false });
    setEntries((prev) =>
      [{ id: now.getTime() + Math.random(), level, message, time }, ...prev].slice(
        0,
        50,
      ),
    );
  }, []);

  return { entries, log };
}
