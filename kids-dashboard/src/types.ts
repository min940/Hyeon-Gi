// 일정/과제 종류 = 카테고리 key (환경설정에서 관리)
export type ScheduleType = string;

// 카테고리 색상 (고정 팔레트 — Tailwind 클래스가 lib/schedule.ts 에 정의됨)
export type ColorKey =
  | "blue"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "teal"
  | "sky"
  | "slate";

// 일정/과제 종류 한 항목 (환경설정에서 추가·수정)
export interface Category {
  key: string; // 안정적 식별자
  label: string; // "학교"
  emoji: string; // "🏫"
  color: ColorKey;
}

// 기본 카테고리 (config/categories 문서가 없을 때 사용)
export const DEFAULT_CATEGORIES: Category[] = [
  { key: "school", label: "학교", emoji: "🏫", color: "blue" },
  { key: "academy", label: "학원", emoji: "📚", color: "emerald" },
  { key: "etc", label: "기타", emoji: "✨", color: "slate" },
];

// 지갑 종류
export type Wallet = "main" | "second";

// 거래 종류
export type TxType = "in" | "out";

// 준비물 한 항목
export interface Supply {
  name: string;
  checked: boolean;
}

// 일정 한 항목
export interface Schedule {
  time: string; // "08:30"
  title: string; // "학교 등교"
  type: ScheduleType;
  supplies: Supply[];
}

// 과제 한 항목 (일정처럼 시간 + 종류 + 제목)
export interface Task {
  time: string; // "18:00"
  title: string; // "수학 문제집 5쪽"
  type: ScheduleType;
}

// days 컬렉션 문서 (문서 ID = YYYY-MM-DD)
export interface DayData {
  notice: string;
  schedules: Schedule[];
  tasks: Task[];
}

// transactions 컬렉션 문서
export interface Transaction {
  id?: string;
  wallet: Wallet;
  type: TxType;
  amount: number;
  memo: string;
  date: string; // YYYY-MM-DD
  createdAt?: unknown; // Firestore Timestamp
}

// 요일 키
export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// weekdayTemplates 컬렉션 문서
export interface WeekdayTemplate {
  schedules: Schedule[];
  tasks: Task[];
}

export const EMPTY_DAY: DayData = {
  notice: "",
  schedules: [],
  tasks: [],
};

// completions 컬렉션 문서 (문서 ID = YYYY-MM-DD)
// done[id] = true 인 항목만 저장. id 네임스페이스: "sch-..." / "task-..."
export interface DayCompletion {
  done: Record<string, boolean>;
}

// ---------- 위치 추적 ----------

// 위치 출처: background(주기 자동) / foreground(앱 사용 중) / manual(정밀 1회 요청)
export type LocationSource = "background" | "foreground" | "manual";

// locations/kid 문서 — 자녀의 최신 위치
export interface KidLocation {
  lat: number;
  lng: number;
  accuracy: number; // 미터
  source: LocationSource;
  battery?: number; // 0~100 (있을 때만)
  updatedAt?: unknown; // Firestore Timestamp
}

// config/location 문서 — 부모가 설정하는 수집 옵션
export interface LocationConfig {
  enabled: boolean;
  intervalMinutes: number; // 백그라운드 수집 간격(분)
}

export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  enabled: true,
  intervalMinutes: 15,
};

// commands/locationRequest 문서 — 부모의 정밀 위치 1회 요청(하이브리드)
export interface LocationRequest {
  status: "pending" | "done";
  requestedAt?: unknown; // Firestore Timestamp
  fulfilledAt?: unknown; // Firestore Timestamp
}
