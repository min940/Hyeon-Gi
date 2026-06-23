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

// days 컬렉션 문서 (문서 ID = YYYY-MM-DD)
export interface DayData {
  greeting: string;
  notice: string;
  schedules: Schedule[];
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
}

export const EMPTY_DAY: DayData = {
  greeting: "",
  notice: "",
  schedules: [],
};
