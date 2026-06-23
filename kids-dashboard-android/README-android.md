# 🌈 자녀 전용 키오스크 안드로이드 앱

우리 대시보드 사이트(`https://<project>.web.app`)**만** 열리는 자녀용 안드로이드 앱입니다.
다른 사이트·검색·유튜브·광고 등 외부 인터넷은 앱에서 **차단**되며,
화면 고정(앱 고정)으로 아이가 앱을 벗어나지 못하게 합니다.

> 웹앱 자체는 상위 폴더 [`kids-dashboard/`](../kids-dashboard) 에 있습니다.
> 이 앱은 그 사이트를 감싸는 얇은 WebView "키오스크" 래퍼입니다.

---

## 🧩 동작 방식

- 전체화면 WebView 1개로 우리 사이트를 띄웁니다 (주소창·브라우저 UI 없음).
- **도메인 화이트리스트**(`res/values/strings.xml` 의 `allowed_hosts`)에 있는 주소만 접속 허용.
  그 외 모든 인터넷 요청은 차단됩니다.
- **화면 고정(Lock Task)** 으로 홈·최근앱 버튼을 막아 앱에서 나갈 수 없습니다.

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

## 🔒 4. 화면 고정(앱 고정) 켜기 — 중요

아이가 앱을 못 벗어나게 하려면 안드로이드의 **앱 고정** 기능을 켜야 합니다.

1. 태블릿 **설정 → 보안 (또는 보안 및 개인정보) → 기타 보안 설정 → 앱 고정** 켜기
2. **"앱 고정 해제 시 PIN 요청"** 옵션을 **켜기** ← 엄마만 해제 가능하게 하는 핵심
3. 이제 이 앱을 실행하면 자동으로 화면이 고정됩니다.
   - 해제: **뒤로가기 + 최근앱** 버튼을 동시에 길게 누른 뒤 기기 PIN 입력
   - (제조사마다 메뉴 이름이 조금 다를 수 있습니다: 삼성/샤오미/구글 등)

> 💡 화면 고정을 켜지 않아도 앱은 **우리 사이트만** 띄웁니다(외부 인터넷 차단).
> 다만 홈 버튼으로 빠져나갈 수는 있으므로, 자녀 기기에서는 앱 고정을 함께 켜는 것을 권장합니다.

---

## 🚀 (선택) 부팅 시 자동 실행 / 완전 키오스크

이 태블릿을 "대시보드 전용" 으로만 쓴다면, 앱을 **Device Owner** 로 등록해
부팅 시 자동 실행 + 다른 앱 완전 차단까지 만들 수 있습니다.
단, 기기 **공장초기화 후 계정 추가 전** 상태에서 ADB 로 설정해야 합니다:

```bash
adb shell dpm set-device-owner app.kidsdashboard.kiosk/.DeviceAdminReceiver
```

> 이 "완전 키오스크" 는 추가 코드(DeviceAdminReceiver 등)와 설정이 필요합니다.
> 필요하시면 별도로 구현해 드릴게요. (현재 버전은 "간단 버전 = 화면 고정" 방식)

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
 │   │   ├─ MainActivity.kt          // 전체화면 WebView + 화면 고정
 │   │   └─ KioskWebViewClient.kt    // 도메인 화이트리스트 차단
 │   ├─ res/values/strings.xml       // ⭐ site_url / allowed_hosts 설정
 │   └─ AndroidManifest.xml
 ├─ build.gradle.kts / app/build.gradle.kts
 └─ gradlew (+ wrapper)
```
