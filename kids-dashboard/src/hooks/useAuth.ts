import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";

// 앱 시작 시 기존 로그인 상태를 먼저 확인한 뒤 화면을 렌더링하기 위한 훅.
// loading=true 동안에는 로딩 화면을 보여준다.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    // 안전장치: 어떤 이유로든 인증 확인이 지연되면 10초 후 로딩 해제(로그인 화면 표시).
    const timeout = window.setTimeout(() => setLoading(false), 10_000);
    return () => {
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  return { user, loading };
}
