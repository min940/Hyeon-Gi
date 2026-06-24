import { useEffect, useState } from "react";

// 인터넷 연결 상태 감지 훅.
// navigator.onLine + 실제 fetch 확인 + online/offline 이벤트 + 30초 주기 재시도.
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // navigator.onLine 이 false 면 확실히 오프라인
      if (!navigator.onLine) {
        if (!cancelled) setOnline(false);
        return;
      }
      try {
        // 같은 출처(우리 호스팅)로 확인 — 키오스크 WebView 도메인 화이트리스트·CORS 문제 없음.
        // 외부(gstatic) 요청은 일부 환경/키오스크에서 막혀 오프라인으로 오인되므로 사용하지 않음.
        await fetch(`${window.location.origin}/favicon.svg?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    check();

    const handleOnline = () => check();
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 30초 간격 자동 재시도
    const interval = window.setInterval(check, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
    };
  }, []);

  return online;
}
