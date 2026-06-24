import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config 값은 .env 에서 로드합니다 (하드코딩 금지).
// apiKey 는 비밀이 아니라 프로젝트 식별자이므로 클라이언트 노출이 정상이며,
// 실제 보안은 Firestore 규칙(firestore.rules)이 담당합니다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// .env 값이 비어있는지 확인 (개발 편의용 경고)
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// 페이지별 고정 이메일 / 접미사
export const KID_EMAIL = import.meta.env.VITE_KID_EMAIL;
export const MOM_EMAIL = import.meta.env.VITE_MOM_EMAIL;
export const AUTH_SUFFIX = import.meta.env.VITE_AUTH_SUFFIX;
