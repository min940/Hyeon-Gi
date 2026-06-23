import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updatePassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, AUTH_SUFFIX } from "../firebase";

// PIN + 접미사로 비밀번호를 조합해 로그인.
// setPersistence 는 반드시 signInWithEmailAndPassword 호출 전에 실행한다.
export async function loginWithPin(
  email: string,
  pin: string,
  rememberMe: boolean,
): Promise<void> {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
  await signInWithEmailAndPassword(auth, email, pin + AUTH_SUFFIX);
}

// 현재 로그인한 사용자의 PIN 변경 (접미사 자동 부착)
export async function changePin(newPin: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  await updatePassword(user, newPin + AUTH_SUFFIX);
}

export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

// Firebase 오류 코드 → 한국어 메시지
export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials":
      return "비밀번호가 올바르지 않습니다.";
    case "auth/user-not-found":
      return "등록된 계정이 없습니다. SETUP.md 를 확인해 주세요.";
    case "auth/too-many-requests":
      return "잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "인터넷 연결을 확인해 주세요.";
    case "auth/weak-password":
      return "비밀번호(PIN)가 너무 짧습니다.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인한 뒤 변경해 주세요.";
    default:
      return "로그인에 문제가 생겼어요. 다시 시도해 주세요.";
  }
}
