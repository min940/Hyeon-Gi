// 앱 테마 — CSS 변수로 accent 색상을 갈아끼움.
// Tailwind 의 `accent-*` 클래스(tailwind.config.js)가 이 변수들을 참조한다.
// 값은 Tailwind 팔레트의 RGB (예: blue-500 = 59 130 246).

export type ThemeKey =
  | "blue"
  | "sky"
  | "emerald"
  | "violet"
  | "rose"
  | "amber";

interface ThemeDef {
  label: string;
  emoji: string;
  // CSS 변수 값: 50/100/200/400/500/600/700 단계 (R G B)
  vars: Record<string, string>;
}

export const DEFAULT_THEME: ThemeKey = "blue";

export const THEMES: Record<ThemeKey, ThemeDef> = {
  blue: {
    label: "파랑",
    emoji: "💙",
    vars: {
      "--ac-50": "239 246 255",
      "--ac-100": "219 234 254",
      "--ac-200": "191 219 254",
      "--ac-400": "96 165 250",
      "--ac-500": "59 130 246",
      "--ac-600": "37 99 235",
      "--ac-700": "29 78 216",
    },
  },
  sky: {
    label: "하늘",
    emoji: "🩵",
    vars: {
      "--ac-50": "240 249 255",
      "--ac-100": "224 242 254",
      "--ac-200": "186 230 253",
      "--ac-400": "56 189 248",
      "--ac-500": "14 165 233",
      "--ac-600": "2 132 199",
      "--ac-700": "3 105 161",
    },
  },
  emerald: {
    label: "초록",
    emoji: "💚",
    vars: {
      "--ac-50": "236 253 245",
      "--ac-100": "209 250 229",
      "--ac-200": "167 243 208",
      "--ac-400": "52 211 153",
      "--ac-500": "16 185 129",
      "--ac-600": "5 150 105",
      "--ac-700": "4 120 87",
    },
  },
  violet: {
    label: "보라",
    emoji: "💜",
    vars: {
      "--ac-50": "245 243 255",
      "--ac-100": "237 233 254",
      "--ac-200": "221 214 254",
      "--ac-400": "167 139 250",
      "--ac-500": "139 92 246",
      "--ac-600": "124 58 237",
      "--ac-700": "109 40 217",
    },
  },
  rose: {
    label: "분홍",
    emoji: "🩷",
    vars: {
      "--ac-50": "255 241 242",
      "--ac-100": "255 228 230",
      "--ac-200": "254 205 211",
      "--ac-400": "251 113 133",
      "--ac-500": "244 63 94",
      "--ac-600": "225 29 72",
      "--ac-700": "190 18 60",
    },
  },
  amber: {
    label: "주황",
    emoji: "🧡",
    vars: {
      "--ac-50": "255 251 235",
      "--ac-100": "254 243 199",
      "--ac-200": "253 230 138",
      "--ac-400": "251 191 36",
      "--ac-500": "245 158 11",
      "--ac-600": "217 119 6",
      "--ac-700": "180 83 9",
    },
  },
};

export const THEME_OPTIONS = (
  Object.keys(THEMES) as ThemeKey[]
).map((key) => ({ key, ...THEMES[key] }));

// 문서 루트에 테마 CSS 변수 적용 (모르는 값이면 기본 테마)
export function applyTheme(key: string | undefined): void {
  const theme = THEMES[(key as ThemeKey) ?? DEFAULT_THEME] ?? THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
}
