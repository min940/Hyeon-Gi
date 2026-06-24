import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  DayData,
  Transaction,
  WeekdayKey,
  WeekdayTemplate,
  Wallet,
  KidLocation,
  LocationConfig,
  LocationRequest,
} from "../types";
import { EMPTY_DAY, DEFAULT_LOCATION_CONFIG } from "../types";

// ---------- days ----------

// 특정 날짜 데이터 실시간 구독
export function subscribeDay(
  dateId: string,
  cb: (data: DayData | null) => void,
): () => void {
  return onSnapshot(doc(db, "days", dateId), (snap) => {
    cb(snap.exists() ? (snap.data() as DayData) : null);
  });
}

// 특정 날짜 데이터 1회 조회
export async function fetchDay(dateId: string): Promise<DayData | null> {
  const snap = await getDoc(doc(db, "days", dateId));
  return snap.exists() ? (snap.data() as DayData) : null;
}

// 특정 날짜 데이터 저장 (엄마만 가능 — 규칙에서 강제)
export async function saveDay(dateId: string, data: DayData): Promise<void> {
  await setDoc(doc(db, "days", dateId), { ...EMPTY_DAY, ...data });
}

// ---------- weekdayTemplates ----------

export async function fetchTemplate(
  key: WeekdayKey,
): Promise<WeekdayTemplate | null> {
  const snap = await getDoc(doc(db, "weekdayTemplates", key));
  return snap.exists() ? (snap.data() as WeekdayTemplate) : null;
}

export async function saveTemplate(
  key: WeekdayKey,
  template: WeekdayTemplate,
): Promise<void> {
  await setDoc(doc(db, "weekdayTemplates", key), template);
}

// ---------- transactions ----------

// 모든 거래 내역 실시간 구독 (최신순)
export function subscribeTransactions(
  cb: (txs: Transaction[]) => void,
): () => void {
  const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const txs: Transaction[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Transaction, "id">),
    }));
    cb(txs);
  });
}

export async function addTransaction(
  tx: Omit<Transaction, "id" | "createdAt">,
): Promise<void> {
  await addDoc(collection(db, "transactions"), {
    ...tx,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, "transactions", id));
}

// 거래 내역 합계로 지갑별 잔액 계산 (잔액은 저장하지 않음)
export function walletBalance(txs: Transaction[], wallet: Wallet): number {
  return txs
    .filter((t) => t.wallet === wallet)
    .reduce((sum, t) => sum + (t.type === "in" ? t.amount : -t.amount), 0);
}

// ---------- 위치 추적 ----------

// 자녀 최신 위치 실시간 구독
export function subscribeLocation(
  cb: (loc: KidLocation | null) => void,
): () => void {
  return onSnapshot(doc(db, "locations", "kid"), (snap) => {
    cb(snap.exists() ? (snap.data() as KidLocation) : null);
  });
}

// 위치 수집 설정 실시간 구독 (없으면 기본값)
export function subscribeLocationConfig(
  cb: (cfg: LocationConfig) => void,
): () => void {
  return onSnapshot(doc(db, "config", "location"), (snap) => {
    cb(
      snap.exists()
        ? { ...DEFAULT_LOCATION_CONFIG, ...(snap.data() as LocationConfig) }
        : DEFAULT_LOCATION_CONFIG,
    );
  });
}

// 위치 수집 설정 저장 (엄마만 — 규칙에서 강제)
export async function saveLocationConfig(cfg: LocationConfig): Promise<void> {
  await setDoc(doc(db, "config", "location"), cfg);
}

// 정밀 위치 1회 요청 (하이브리드) — 자녀 앱이 받아 고정밀 측정 후 응답
export async function requestPreciseLocation(): Promise<void> {
  await setDoc(doc(db, "commands", "locationRequest"), {
    status: "pending",
    requestedAt: serverTimestamp(),
  } as LocationRequest);
}

// 정밀 위치 요청 상태 구독
export function subscribeLocationRequest(
  cb: (req: LocationRequest | null) => void,
): () => void {
  return onSnapshot(doc(db, "commands", "locationRequest"), (snap) => {
    cb(snap.exists() ? (snap.data() as LocationRequest) : null);
  });
}
