# 🌈 자녀 전용 키오스크 안드로이드 앱

우리 대시보드 사이트(`https://<project>.web.app`)**만** 열리는 자녀용 안드로이드 앱입니다.
다른 사이트·검색·유튜브·광고 등 외부 인터넷은 앱에서 **차단**됩니다.

> 앱 자체는 보통 앱처럼 **자유롭게 실행하고 닫을 수 있습니다.**
> (기기의 **키즈 모드**로 사용 시간·앱 접근을 관리하는 것을 전제로 합니다.)

> 웹앱 자체는 상위 폴더 [`kids-dashboard/`](../kids-dashboard) 에 있습니다.
> 이 앱은 그 사이트를 감싸는 얇은 WebView 래퍼입니다.

---

## 🧩 동작 방식

- WebView 1개로 우리 사이트를 띄웁니다 (주소창·브라우저 UI 없음).
- **도메인 화이트리스트**(`res/values/strings.xml` 의 `allowed_hosts`)에 있는 주소만 접속 허용.
  그 외 모든 인터넷 요청은 차단됩니다.
- 홈·최근앱 버튼으로 **앱을 자유롭게 나가고 닫을 수 있습니다** (화면 고정 없음).
  첫 화면에서 뒤로가기를 누르면 앱이 닫힙니다.

기본 허용 도메인: `web.app`, `firebaseapp.com`, `googleapis.com`(Firestore·로그인), `gstatic.com`(연결 확인).

---

## ⚙️ 1. 설정 (필수)

`app/src/main/res/values/strings.xml` 을 열고 **사이트 주소**를 바꿉니다:

```xml
<string name="site_url">https://여기에-프로젝트.web.app/</string>
```

→ Firebase Hosting 배포 후 받은 실제 주소(`https://<project>.web.app/`)로 교체하세요.
(`kids-dashboard/README.md` 의 배포 단계 참고)

호스팅 주소가 `web.app`/`firebaseapp.com` 이면 `allowed_hosts` 는 그대로 두면 됩니다.
커스텀 도메인을 쓴다면 그 도메인을 `allowed_hosts` 에 추가하세요.

---

## 📍 1-2. 위치 추적 설정 (필수 — 빌드 전에)

이 앱은 자녀 위치를 백그라운드로 수집해 부모 관리 페이지(`/admin` → 📍위치 탭)에서
구글 지도로 보여줍니다. 백그라운드 서비스가 Firebase 에 직접 기록하므로 아래 2가지가 필요합니다.

### (1) `google-services.json` 추가
1. [Firebase 콘솔](https://console.firebase.google.com) → 우리 프로젝트 → **⚙️ 프로젝트 설정**
2. **내 앱 → 앱 추가 → Android** 선택
3. **패키지 이름**에 `app.kidsdashboard.kiosk` 입력 후 등록
4. 다운로드된 **`google-services.json`** 파일을 이 프로젝트의 **`app/`** 폴더에 넣기
   (`kids-dashboard-android/app/google-services.json`)

### (2) `secrets.xml` 만들기
`app/src/main/res/values/secrets.xml.example` 을 같은 폴더에 **`secrets.xml`** 로 복사하고
값을 채웁니다. (웹앱 `.env` 의 값과 **동일**해야 함)
```xml
<string name="kid_email">kid@kids-dashboard.app</string>
<string name="auth_suffix">Fam2026!</string>
```
→ 백그라운드 서비스가 이 자녀 계정으로 로그인해 위치를 기록합니다.
PIN 은 자녀가 앱에서 **한 번 로그인**하면 기기에 암호화 저장됩니다.

> 두 파일(`google-services.json`, `secrets.xml`)은 `.gitignore` 로 커밋되지 않습니다.

### 위치는 어떻게 동작하나요?
- **수집 간격·켜기/끄기**는 부모가 `/admin` → 📍위치 탭에서 설정합니다. (기본 15분)
- **정밀 위치**가 필요하면 부모가 "🎯 지금 정밀 위치 요청"을 누르면 자녀 기기가 GPS로 1회 측정해 보고합니다.
- 자녀 화면 하단에 "📍 위치를 가족과 공유하고 있어요" 안내가 표시됩니다(투명성).
- **배터리**: 균형 정확도 + 10~15분 간격 기준 하루 약 2~5% 수준.
- **비용**: 위치 측정·Firestore 는 무료. 지도는 **구글 지도 API**로 표시하며,
  Maps Platform 은 카드 등록이 필요합니다(월 $200 무료 크레딧으로 가정용은 사실상 무과금).
  키 설정은 웹앱 `kids-dashboard/SETUP.md` 의 "구글 지도 API 키" 단계 참고.

### 위치 권한 (자녀 기기에서 1회)
앱을 처음 켜면 위치 권한을 묻습니다. 백그라운드 동작을 위해 **"항상 허용"** 으로 설정해야 합니다.
(설정 → 앱 → 오늘의 하루 → 권한 → 위치 → **항상 허용**)

---

## 🔨 2. 빌드 (APK 만들기)

> **준비물**: PC에 **Android Studio**(또는 Android SDK + JDK 17) 설치.
> Android SDK 가 필요하므로 이 빌드는 사용자 PC에서 진행합니다.

### 방법 A — Android Studio (권장)
1. Android Studio 실행 → **Open** → 이 `kids-dashboard-android` 폴더 선택
2. Gradle 동기화가 끝나길 기다림 (SDK 자동 설치)
3. 상단 메뉴 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. 완료 알림의 **locate** 클릭 → `app/build/outputs/apk/debug/app-debug.apk`

### 방법 B — 명령줄
```bash
# ANDROID_HOME(SDK 경로)이 설정된 환경에서
./gradlew assembleDebug
# 결과물: app/build/outputs/apk/debug/app-debug.apk
```

> 가정용이라면 **debug APK** 로 충분합니다(별도 서명 키 불필요).

---

## 📲 3. 태블릿에 설치

1. 만든 `app-debug.apk` 를 태블릿으로 옮깁니다 (USB·이메일·클라우드 등).
2. 태블릿: **설정 → 보안 → 출처를 알 수 없는 앱(또는 이 출처 허용)** 켜기.
3. 파일 관리자로 APK 를 탭해 설치.
4. (USB 디버깅이 켜져 있다면 PC에서 `adb install app-debug.apk` 로도 가능)

---

## 🧒 4. 사용 방법

- 홈 화면의 **"오늘의 하루 🌈"** 아이콘을 탭하면 실행됩니다.
- 홈·최근앱 버튼으로 **언제든 닫을 수 있습니다** (보통 앱과 동일).
- 사용 시간·다른 앱 접근 관리는 기기의 **키즈 모드**로 하면 됩니다.
  - 삼성: 설정 → 디지털 웰빙·키즈 / 키즈 홈
  - 구글: Family Link / Kids Space

> 💡 앱을 벗어나도 이 앱 자체는 **우리 사이트 외 인터넷을 차단**하므로,
> 앱 안에서는 유튜브·검색 등 다른 사이트로 빠질 수 없습니다.

> 🔒 만약 아이가 앱을 못 벗어나게 "화면 고정(키오스크)"까지 원하시면
> 다시 켜 드릴 수 있습니다 — 말씀만 주세요.

---

## ❓ 자주 묻는 질문

**Q. 사이트가 안 열리고 빈 화면이에요.**
→ `strings.xml` 의 `site_url` 이 실제 배포 주소인지, 끝에 `/` 가 있는지 확인하세요.
   커스텀 도메인이면 `allowed_hosts` 에 추가해야 합니다.

**Q. 로그인이 안 돼요.**
→ Firebase 설정(`kids-dashboard/SETUP.md`)이 끝나야 합니다. 웹 브라우저에서 같은 주소로 로그인이 되는지 먼저 확인하세요.

**Q. 다른 사이트도 막혔는지 어떻게 확인하나요?**
→ 사이트 안에 외부 링크를 넣어 눌러봐도 열리지 않으면 정상입니다.

---

## 📂 구조
```
kids-dashboard-android/
 ├─ app/src/main/
 │   ├─ java/app/kidsdashboard/kiosk/
 │   │   ├─ MainActivity.kt          // WebView 화면 (자유롭게 열고 닫기)
 │   │   └─ KioskWebViewClient.kt    // 도메인 화이트리스트 차단
 │   ├─ res/values/strings.xml       // ⭐ site_url / allowed_hosts 설정
 │   └─ AndroidManifest.xml
 ├─ build.gradle.kts / app/build.gradle.kts
 └─ gradlew (+ wrapper)
```
