# 🔧 Firebase 설정 안내 (SETUP)

이 문서는 **Firebase 콘솔에서 직접 해야 하는 설정**을 클릭 단위로 안내합니다.
아래 순서대로 따라 하면 됩니다. (소요 시간 약 10분)

> 💡 Firebase는 무료 **Spark 플랜**으로 충분하며 신용카드가 필요 없습니다.

---

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → 구글 계정 로그인
2. **프로젝트 추가** 클릭
3. 프로젝트 이름 입력 (예: `kids-dashboard`) → **계속**
4. Google 애널리틱스는 꺼도 됩니다 → **프로젝트 만들기**

---

## 2. Firestore Database 만들기

1. 왼쪽 메뉴 → **빌드 → Firestore Database** 클릭
2. **데이터베이스 만들기** 클릭
3. **프로덕션 모드에서 시작** 선택 → 다음
4. 위치(리전): **`asia-northeast3` (서울)** 선택 → 사용 설정

---

## 3. 로그인 방법 켜기 (Authentication)

1. 왼쪽 메뉴 → **빌드 → Authentication** 클릭 → **시작하기**
2. **로그인 방법** 탭 → **이메일/비밀번호** 클릭
3. **사용 설정** 토글을 켜고 **저장**

---

## 4. 계정 2개 만들기 (자녀용 / 엄마용)

> ⚠️ 비밀번호는 **PIN + 접미사** 형태입니다.
> `.env` 의 `VITE_AUTH_SUFFIX` 값이 `Fam2026!` 라면,
> 자녀 PIN이 `1234` 일 때 **실제 비밀번호는 `1234Fam2026!`** 입니다.

**Authentication → Users 탭 → 사용자 추가** 를 눌러 2개를 만듭니다.

| 용도   | 이메일                     | 비밀번호 (예시)   |
| ------ | -------------------------- | ----------------- |
| 자녀용 | `kid@kids-dashboard.app`   | `1234Fam2026!`    |
| 엄마용 | `mom@kids-dashboard.app`   | `4321Fam2026!`    |

- 이메일은 `.env` 의 `VITE_KID_EMAIL` / `VITE_MOM_EMAIL` 값과 **반드시 동일**해야 합니다.
- 접미사(`Fam2026!`)는 원하는 값으로 바꿔도 되지만, `.env` 의 `VITE_AUTH_SUFFIX` 와 **항상 일치**시켜야 합니다.
- 자녀/엄마는 앱에서 **숫자 PIN만 입력**하고, 접미사는 앱이 자동으로 붙여줍니다.

---

## 5. 웹 앱 등록 후 config 값 받기

1. 왼쪽 위 **⚙️ → 프로젝트 설정** 클릭
2. 아래로 스크롤 → **내 앱** → **웹(`</>`)** 아이콘 클릭
3. 앱 닉네임 입력 (예: `kids-web`) → **앱 등록**
4. 표시되는 `firebaseConfig` 값에서 아래 4개를 복사해 `.env` 에 붙여넣습니다:

```
apiKey      → VITE_FIREBASE_API_KEY
authDomain  → VITE_FIREBASE_AUTH_DOMAIN
projectId   → VITE_FIREBASE_PROJECT_ID
appId       → VITE_FIREBASE_APP_ID
```

`.env` 예시:

```
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=kids-dashboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kids-dashboard
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

VITE_KID_EMAIL=kid@kids-dashboard.app
VITE_MOM_EMAIL=mom@kids-dashboard.app
VITE_AUTH_SUFFIX=Fam2026!
```

> 🔐 `apiKey` 는 비밀번호가 아니라 **프로젝트 식별자**라서 클라이언트에 노출되어도 정상입니다.
> 실제 보안은 아래 **Firestore 보안 규칙**이 담당합니다.

---

## 6. 보안 규칙 적용하기

1. **Firestore Database → 규칙** 탭으로 이동
2. 이 프로젝트의 `firestore.rules` 파일 내용을 **전체 복사**해 붙여넣기
3. **게시** 클릭

> ⚠️ 규칙 안의 이메일(`mom@kids-dashboard.app`)은
> `.env` 의 `VITE_MOM_EMAIL` 및 4번에서 만든 엄마 계정과 **동일**해야 합니다.
> 엄마 이메일을 바꿨다면 `firestore.rules` 의 이메일도 같이 바꿔서 다시 게시하세요.

규칙 요약:

- 로그인 안 한 사람 → 모든 데이터 접근 **차단** (외부 접속 차단)
- 로그인한 사람(자녀 포함) → **읽기** 가능
- 엄마 계정만 → **쓰기** 가능
- 단, **위치(locations)·정밀요청(commands)·완료기록(completions)** 은 자녀도 기록 가능
  (자녀 기기가 위치를 보고하고, 일정·과제 완료를 체크해야 하므로)

> ⚠️ 통계 기능 사용 시 규칙에 `completions` 가 포함된 최신 `firestore.rules` 를
> 다시 복사해 **게시**하세요. (안 하면 자녀의 완료 체크가 저장되지 않습니다.)

> 📍 위치 추적 기능을 쓰려면 자녀 안드로이드 앱 설정도 필요합니다.
> `kids-dashboard-android/README-android.md` 의 "위치 추적 설정" 을 참고하세요.

---

## 7. 구글 지도 API 키 (위치 지도용)

관리자 페이지의 "위치" 탭에서 자녀 위치를 **구글 지도**로 보려면 API 키가 필요합니다.

> ⚠️ 구글 지도(Maps Platform)는 **결제 계정(신용카드) 등록이 필요**합니다.
> 매월 무료 크레딧($200)이 있어 가정용 사용량에서는 실제 청구가 거의 발생하지 않지만,
> 카드 등록 자체는 필수입니다. (카드 없이 쓰려면 이 단계를 건너뛰고 화면의
> "구글 지도에서 열기" 링크로 대신 확인할 수 있습니다.)

1. https://console.cloud.google.com 접속 (Firebase와 같은 구글 계정)
2. 상단에서 **Firebase 프로젝트와 동일한 프로젝트** 선택
3. **API 및 서비스 → 라이브러리** → **Maps JavaScript API** 검색 → **사용 설정**
4. (안내가 나오면) **결제 계정 만들기**로 카드 등록
5. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
6. 생성된 키를 `.env` 의 `VITE_GOOGLE_MAPS_API_KEY` 에 입력
7. (권장) 그 API 키의 **애플리케이션 제한**을 "HTTP 리퍼러"로 설정하고
   배포 도메인(`https://<project>.web.app/*`)만 허용 → 키 도용 방지

```
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...여기에키...
```

---

## ✅ 설정 끝!

이제 프로젝트 폴더에서 다음을 실행하면 앱이 동작합니다:

```bash
npm install
npm run dev
```

- 메인 페이지(자녀): http://localhost:5173/
- 관리자 페이지(엄마): http://localhost:5173/admin

배포 방법은 [README.md](./README.md) 를 참고하세요.
