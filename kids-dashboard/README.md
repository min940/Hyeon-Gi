# 🌈 초등학생 일일 대시보드 (Kids Dashboard)

초등학교 자녀가 매일 보는 **일일 대시보드**와, 엄마가 일정·준비물·용돈·전할말을
입력하는 **관리자 페이지**로 구성된 웹앱입니다.

- **자녀 페이지 `/`** — 오늘 일정 타임라인, 준비물 체크, 두 지갑 잔액, 엄마의 전할말
- **관리자 페이지 `/admin`** — 날짜별 일정/전할말 입력, 용돈 입출금, **자녀 위치(구글 지도)**, 요일 템플릿, 비밀번호 변경

> 📍 **위치 추적**은 자녀 안드로이드 앱이 백그라운드로 위치를 보고하고, 관리자 페이지 "위치" 탭에서 구글 지도로 확인합니다. 앱 설정은 [`../kids-dashboard-android/README-android.md`](../kids-dashboard-android/README-android.md) 참고.

## 🛠️ 기술 스택

- React + Vite + TypeScript
- Tailwind CSS (초등학생 친화 디자인 — 큰 글씨, 둥근 카드, 밝은 색, 이모지)
- Firebase Firestore (데이터) + Firebase Authentication (로그인)
- Firebase Hosting (배포)

---

## 1. 먼저 할 일 — Firebase 설정

Firebase 콘솔 설정(프로젝트 생성, 계정 생성, config 발급, 보안 규칙)이 **먼저** 필요합니다.

👉 **[SETUP.md](./SETUP.md) 문서를 따라 설정하세요.** (약 10분)

---

## 2. 로컬에서 실행하기

```bash
# 1) 의존성 설치
npm install

# 2) .env 파일에 Firebase 값 채우기
cp .env.example .env   # 이미 .env 가 있다면 생략
#   → SETUP.md 5번을 보고 값 입력

# 3) 개발 서버 실행
npm run dev
```

- 자녀 화면: http://localhost:5173/
- 관리자 화면: http://localhost:5173/admin

> 로그인은 숫자 PIN만 입력합니다. (예: 자녀 `1234`, 엄마 `4321`)
> 접미사는 앱이 자동으로 붙입니다.

---

## 3. GitHub에 올리기

```bash
git init
git add .
# .gitignore 에 의해 .env 는 커밋되지 않습니다 (반드시 확인!)
git commit -m "초등학생 일일 대시보드"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

> ⚠️ `.env` 가 커밋되지 않았는지 `git status` 로 꼭 확인하세요.

---

## 4. Firebase Hosting 으로 배포하기

```bash
# Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 연결 (이미 firebase.json 이 있으므로 hosting 설정만)
firebase init hosting
#   - 기존 프로젝트 선택 (SETUP에서 만든 프로젝트)
#   - public 디렉터리: dist
#   - SPA(single-page app)로 설정: Yes
#   - 기존 index.html 덮어쓰기: No

# 빌드 후 배포
npm run build
firebase deploy
```

배포가 끝나면 `https://<project>.web.app` 주소가 나옵니다.
이 주소를 **자녀 태블릿 즐겨찾기**에 추가하세요. 관리자 화면은 뒤에 `/admin` 을 붙입니다.

### 보안 규칙도 배포하기

```bash
firebase deploy --only firestore:rules
```

> 콘솔에서 직접 규칙을 게시했다면 생략해도 됩니다.

---

## 📂 데이터 구조 (Firestore)

- `days/{YYYY-MM-DD}` — 날짜별 인사말·전할말·일정(준비물 포함)
- `transactions/{auto}` — 용돈 입출금 내역 (잔액은 저장하지 않고 합계로 계산)
- `weekdayTemplates/{mon~sun}` — 요일별 기본 일정 템플릿

## 🔐 보안

- 로그인하지 않으면 데이터에 접근할 수 없습니다 (Firestore 규칙).
- 읽기는 로그인한 사용자(자녀 포함), 쓰기는 엄마 계정만 가능합니다.
- 비밀번호는 코드에 하드코딩하지 않고, PIN + 접미사 조합을 Firebase가 검증합니다.
- 민감 정보(Firebase config, 이메일, 접미사)는 모두 `.env` 에서 로드합니다.

## 📜 스크립트

| 명령            | 설명               |
| --------------- | ------------------ |
| `npm run dev`   | 개발 서버 실행     |
| `npm run build` | 프로덕션 빌드      |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint`  | 타입 검사          |
