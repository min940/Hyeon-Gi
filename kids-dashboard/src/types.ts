// 일정 종류 (색상 구분용)
export type ScheduleType = "school" | "academy" | "etc";

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

// 과제 한 항목
export interface Task {
  title: string; // "수학 문제집 5쪽"
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
