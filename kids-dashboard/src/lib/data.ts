import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  documentId,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  DayData,
  DayCompletion,
  Task,
  Category,
  CategoryKind,
  Transaction,
  WeekdayKey,
  WeekdayTemplate,
  Wallet,
  KidLocation,
  LocationConfig,
  LocationRequest,
} from "../types";
import {
  DEFAULT_LOCATION_CONFIG,
  DEFAULT_SCHEDULE_CATEGORIES,
  DEFAULT_TASK_CATEGORIES,
} from "../types";

// ---------- days ----------

// 특정 날짜 데이터 실시간 구독
export function subscribeDay(
  dateId: string,
  cb: (data: DayData | null) => void,
): () => void {
  return onSnapshot(doc(db, "days", dateId), (snap) => {
    cb(snap.exists() ? normalizeDay(snap.data()) : null);
  });
}

// 특정 날짜 데이터 1회 조회
export async function fetchDay(dateId: string): Promise<DayData | null> {
  const snap = await getDoc(doc(db, "days", dateId));
  return snap.exists() ? normalizeDay(snap.data()) : null;
}

// 옛 과제({title}만 있던 형태)도 시간·종류 기본값으로 채움
function normalizeTask(t: Partial<Task>): Task {
  return {
    time: t.time ?? "18:00",
    title: t.title ?? "",
    type: t.type ?? "academy",
  };
}

// 옛 문서(예: tasks 필드 없음, 과제 형태 변경)도 안전하게 기본값 채움
function normalizeDay(raw: unknown): DayData {
  const d = (raw ?? {}) as Partial<DayData>;
  return {
    notice: d.notice ?? "",
    schedules: d.schedules ?? [],
    tasks: (d.tasks ?? []).map(normalizeTask),
  };
}

// 특정 날짜 데이터 저장 (엄마만 가능 — 규칙에서 강제)
// notice/schedules/tasks 만 명시적으로 기록 (옛 문서의 greeting 잔재 제거).
export async function saveDay(dateId: string, data: DayData): Promise<void> {
  await setDoc(doc(db, "days", dateId), {
    notice: data.notice ?? "",
    schedules: data.schedules ?? [],
    tasks: data.tasks ?? [],
  });
}

// ---------- completions (일정·과제 완료 기록) ----------

// 특정 날짜 완료 기록 실시간 구독
export function subscribeCompletion(
  dateId: string,
  cb: (done: Record<string, boolean>) => void,
): () => void {
  return onSnapshot(doc(db, "completions", dateId), (snap) => {
    cb(snap.exists() ? ((snap.data() as DayCompletion).done ?? {}) : {});
  });
}

// 완료 기록 저장 (자녀·엄마 가능 — 규칙에서 허용)
export async function saveCompletion(
  dateId: string,
  done: Record<string, boolean>,
): Promise<void> {
  await setDoc(doc(db, "completions", dateId), { done });
}

// 기간 내 날짜 데이터 일괄 조회 (통계용). 문서 ID(YYYY-MM-DD) 범위로 질의.
export async function fetchDaysInRange(
  startId: string,
  endId: string,
): Promise<{ id: string; data: DayData }[]> {
  const q = query(
    collection(db, "days"),
    where(documentId(), ">=", startId),
    where(documentId(), "<=", endId),
    orderBy(documentId()),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: normalizeDay(d.data()) }));
}

// 기간 내 완료 기록 일괄 조회 (통계용)
export async function fetchCompletionsInRange(
  startId: string,
  endId: string,
): Promise<Record<string, Record<string, boolean>>> {
  const q = query(
    collection(db, "completions"),
    where(documentId(), ">=", startId),
    where(documentId(), "<=", endId),
    orderBy(documentId()),
  );
  const snap = await getDocs(q);
  const out: Record<string, Record<string, boolean>> = {};
  snap.docs.forEach((d) => {
    out[d.id] = (d.data() as DayCompletion).done ?? {};
  });
  return out;
}

// ---------- categories (일정 종류 / 과제 종류, 환경설정에서 분리 관리) ----------

// 종류별 Firestore 문서 ID
function catDocId(kind: CategoryKind): string {
  return kind === "task" ? "taskCategories" : "scheduleCategories";
}

// 종류별 기본 목록
function catDefault(kind: CategoryKind): Category[] {
  return kind === "task"
    ? DEFAULT_TASK_CATEGORIES
    : DEFAULT_SCHEDULE_CATEGORIES;
}

// 종류 목록 실시간 구독 (없으면 기본값)
export function subscribeCategories(
  kind: CategoryKind,
  cb: (list: Category[]) => void,
): () => void {
  return onSnapshot(doc(db, "config", catDocId(kind)), (snap) => {
    const list = snap.exists()
      ? (snap.data() as { list?: Category[] }).list
      : undefined;
    cb(list && list.length ? list : catDefault(kind));
  });
}

// 종류 목록 1회 조회
export async function fetchCategories(
  kind: CategoryKind,
): Promise<Category[]> {
  const snap = await getDoc(doc(db, "config", catDocId(kind)));
  const list = snap.exists()
    ? (snap.data() as { list?: Category[] }).list
    : undefined;
  return list && list.length ? list : catDefault(kind);
}

// 종류 목록 저장 (엄마만 — config 규칙에서 강제)
export async function saveCategories(
  kind: CategoryKind,
  list: Category[],
): Promise<void> {
  await setDoc(doc(db, "config", catDocId(kind)), { list });
}

// ---------- weekdayTemplates ----------

export async function fetchTemplate(
  key: WeekdayKey,
): Promise<WeekdayTemplate | null> {
  const snap = await getDoc(doc(db, "weekdayTemplates", key));
  if (!snap.exists()) return null;
  const d = snap.data() as Partial<WeekdayTemplate>;
  return {
    schedules: d.schedules ?? [],
    tasks: (d.tasks ?? []).map(normalizeTask),
  };
}

export async function saveTemplate(
  key: WeekdayKey,
  template: WeekdayTemplate,
): Promise<void> {
  await setDoc(doc(db, "weekdayTemplates", key), {
    schedules: template.schedules ?? [],
    tasks: template.tasks ?? [],
  });
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
