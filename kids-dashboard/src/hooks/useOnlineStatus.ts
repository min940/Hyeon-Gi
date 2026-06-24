import { useEffect, useState } from "react";

// 인터넷 연결 상태 감지 훅.
// 기기 네트워크 상태(navigator.onLine)를 신뢰한다.
// (외부 주소로 핑을 보내 확인하던 방식은 키오스크 WebView·일부 네트워크에서
//  실제로는 연결돼 있는데도 실패해 "오프라인"으로 오인하는 문제가 있어 제거함.)
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    // 혹시 이벤트를 놓쳐도 주기적으로 현재 상태에 맞춤
    const interval = window.setInterval(update, 15_000);
    update();

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.clearInterval(interval);
    };
  }, []);

  return online;
}
