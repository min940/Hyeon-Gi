# CLAUDE.md — 프로젝트 고정 정보

> 이 파일은 **프로젝트 전반의 변하지 않는 정보**를 담습니다.
> 세션별 진행 상황은 `session-handoff.md`를 참고하세요.

## 프로젝트 개요
초등학생 자녀를 위한 **일과 관리 웹앱**("Hyeon-Gi").
- 자녀 화면(`/`): 오늘 일정·과제 체크, 준비물, 용돈 잔액, 이번 주 별, 엄마 전할말
- 엄마 관리자(`/admin`): 일정·전할말, 완료·통계, 위치, 요일 템플릿, 용돈, 설정
- 안드로이드 앱: 웹을 감싸는 WebView 키오스크 + 백그라운드 위치 수집

## 저장소 구조
- `kids-dashboard/` — 웹앱 (React 18 + Vite 6 + TypeScript + Tailwind)
- `kids-dashboard-android/` — 안드로이드 키오스크 앱 (Kotlin, package `app.kidsdashboard.kiosk`)
- `DEPLOY.md`, `kids-dashboard/SETUP.md` — 설정·배포 가이드

## 기술 스택
- **웹**: React 18, Vite 6, TypeScript, Tailwind CSS, React Router(`/`=자녀, `/admin`=엄마)
- **아이콘**: lucide-react (size 16~24, strokeWidth 2.4)
- **폰트**: Pretendard
- **백엔드**: Firebase — Auth(이메일/비밀번호), Firestore(onSnapshot 실시간), Hosting
- **지도**: 카카오 지도 JavaScript SDK (`VITE_KAKAO_MAPS_KEY`)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — main 푸시 시 자동 빌드·배포

## Firebase
- 프로젝트 ID: **hyeong-gi-schedule**
- 라이브: 자녀 https://hyeong-gi-schedule.web.app/ · 엄마 https://hyeong-gi-schedule.web.app/admin
- 리전: asia-northeast3 (Seoul)
- 계정: 엄마(`mom@kids-dashboard.app`) / 자녀(`kid@kids-dashboard.app`)
  - 로그인은 PIN + 접미사(Auth suffix) 형식. **관리자 쓰기는 엄마 계정만 가능**(규칙에서 강제)

### Firestore 컬렉션
- `days/{YYYY-MM-DD}` — 그날의 `{ notice, schedules[], tasks[] }`
- `weekdayTemplates/{mon..sun}` — 요일별 기본 일정·과제 (그날 문서가 없으면 폴백)
- `completions/{YYYY-MM-DD}` — `{ done: { [id]: true } }` (자녀가 체크). id: `sch-i-time-title` / `task-i-time-title` / `sup-si-pi`
- `transactions/{auto}` — 용돈 거래 `{ wallet: main|second|loan, type: in|out, amount, memo, date }`
- `locations/kid` — 자녀 최신 위치, `locationHistory/{auto}` — 이동 경로(30일 TTL, `expireAt`)
- `config/{app|location|scheduleCategories|taskCategories|rewards}`
  - `config/app` = `{ homeTitle, notice }` (notice = 설정 고정 전할말)

## 배포 (GitHub Actions)
- `main` 브랜치에 `kids-dashboard/**` 또는 워크플로가 푸시되면 자동 배포
- 필요한 **GitHub Secrets** (값은 GitHub에만 저장, 코드/문서에 넣지 않음):
  `FIREBASE_SERVICE_ACCOUNT`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_KID_EMAIL`, `VITE_MOM_EMAIL`,
  `VITE_AUTH_SUFFIX`, `VITE_KAKAO_MAPS_KEY`
- **Firestore 규칙 자동 게시**: 서비스 계정 `firebase-adminsdk-fbsvc@hyeong-gi-schedule.iam.gserviceaccount.com`
  에 **편집자(Editor)** 역할을 부여해서 배포 시 `firestore:rules`도 자동 게시됨 (예전엔 콘솔 수동 게시였음)

## 개발 규칙
- **개발 브랜치**: `claude/kids-dashboard-app-2gikw4` 에서 작업 → PR → **main 머지 시 자동 배포**
- 작업 흐름: 코드 수정 → `npm run build`(kids-dashboard) → 커밋 → 푸시 → draft PR → ready → merge → 배포 검증
- 커밋 저자: `Claude <noreply@anthropic.com>` (모델 식별자는 저장소에 넣지 않음)

## 배포 검증 방법 (curl)
```bash
base="https://hyeong-gi-schedule.web.app"
js=$(curl -s "$base/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "$base$js" | grep -oc "찾을 문구"
```
(GitHub Actions `actions_list` 결과가 커서 파일로 저장됨 → python 으로 `workflow_runs[0]` 파싱)

## 보안 / 주의
- **커밋 금지(gitignore)**: `google-services.json`, `secrets.xml`, `*.apk`, `.env`
- `FIREBASE_SERVICE_ACCOUNT`는 비밀번호와 같음 — GitHub Secrets 에만
- API 키는 도메인/리퍼러 제한으로 보호 (카카오 JS 키, Firebase 웹 키 모두 노출돼도 도메인 제한)

## 핵심 로직 메모
- **별(⭐)**: 그날 일정+과제를 **전부** 완료하면 1개(하루 최대 1개), 이번 주 누적(월요일 리셋). **돈과 무관**
- **자녀 화면 일정 폴백**: `days/{today}` 문서가 없으면 요일 템플릿을 표시. **완료·통계도 같은 폴백** 적용
- **엄마 전할말**: 당일 전할말(일정·전할말 탭) 우선 → 없으면 설정 고정 전할말(`config/app.notice`)
- **용돈 지갑**: 메인/세컨드/빌린돈(loan). 빌린돈은 빌림(+)/갚음(−), 자녀 화면엔 0이 아닐 때 표시
- **카카오 지도**: 두 손가락으로 이동/확대 (한 손가락 스크롤 이슈로 여러 방식 시도 후 현재 상태 유지)

## 재사용 UI 키트
`kids-dashboard/src/components/ui/` — Button/Card/Badge/Modal + 팔레트(`colors.ts`) + `cn`.
다른 프로젝트로 폴더째 복사 가능. 색 규칙: 배경 `-50`, 배지 `-100`, 테두리 `-200`, 강조 `-500`, 글자 `-700`.
