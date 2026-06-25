# 🚀 배포 가이드 (GitHub Actions 자동 배포)

`main` 브랜치에 푸시되면 GitHub Actions가 **자동으로 빌드 → Firebase Hosting 배포 + Firestore 규칙 배포**를 수행합니다. 워크플로 파일은 이미 만들어져 있습니다(`.github/workflows/deploy.yml`). 회원님은 아래 **준비 단계**만 한 번 해주시면 됩니다.

---

## ✅ 한눈에 보는 순서

```
1. Firebase 콘솔 설정        (SETUP.md 1~6 단계)
2. 구글 지도 API 키          (SETUP.md 7 단계 — 선택)
3. 서비스 계정 키 만들기     (아래 STEP A)
4. GitHub 비밀값 등록        (아래 STEP B)
5. main 브랜치로 배포        (아래 STEP C)
6. 주소 확인 → 태블릿 등록
```

---

## 1·2단계 — Firebase 준비 (먼저)

`kids-dashboard/SETUP.md` 를 따라 아래를 끝내 주세요. (아직 안 하셨다면 여기부터)

- Firebase 프로젝트 생성 / Firestore 생성 / 이메일·비밀번호 로그인 켜기
- 자녀·엄마 계정 2개 생성
- 웹 앱 등록 후 **config 값** 확보 (apiKey, authDomain, projectId, appId)
- (선택) 구글 지도 API 키 — 위치 지도를 보려면 필요

> 이 값들은 잠시 후 GitHub 비밀값으로 등록합니다. (`.env` 파일은 자동배포에 쓰지 않아요 — GitHub Secrets가 그 역할을 합니다.)

---

## STEP A — 서비스 계정 키 만들기 (배포 권한)

GitHub가 회원님 대신 배포하려면 "서비스 계정 키"가 필요합니다.

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 → **⚙️ 프로젝트 설정**
2. **서비스 계정** 탭 클릭
3. **새 비공개 키 생성** → **키 생성** → `JSON` 파일이 다운로드됩니다
4. 이 JSON 파일 **전체 내용**을 잠시 후 비밀값으로 붙여넣습니다 (파일을 메모장으로 열면 됩니다)

> ⚠️ 이 JSON은 비밀번호와 같습니다. 외부에 공유하지 마세요. (GitHub Secrets에만 넣습니다)

---

## STEP B — GitHub 비밀값(Secrets) 등록

GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret** 에서
아래 **9개**를 하나씩 등록합니다. (이름은 정확히 동일하게)

| 비밀값 이름 | 값 |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | STEP A에서 받은 **JSON 파일 전체 내용** |
| `VITE_FIREBASE_API_KEY` | Firebase config의 apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<프로젝트>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | 프로젝트 ID (예: `hyeon-gi`) |
| `VITE_FIREBASE_APP_ID` | Firebase config의 appId |
| `VITE_KID_EMAIL` | `kid@kids-dashboard.app` |
| `VITE_MOM_EMAIL` | `mom@kids-dashboard.app` |
| `VITE_AUTH_SUFFIX` | 접미사 (예: `Fam2026!`) |
| `VITE_KAKAO_MAPS_KEY` | 카카오 지도 JavaScript 키 (없으면 빈 값으로 등록) |

> 값은 `.env.example` / SETUP.md 에서 쓰던 것과 동일합니다.
> 비밀값은 GitHub에만 저장되고 로그에도 가려져 표시됩니다.

---

## STEP C — 배포 실행

워크플로는 **`main` 브랜치**에 변경이 올라오면 자동 실행됩니다. 두 가지 방법:

**방법 1 — PR 병합 (정석)**
현재 작업 브랜치의 Pull Request를 **main에 Merge** → 자동으로 배포 시작.

**방법 2 — 수동 실행**
GitHub → **Actions 탭 → "Deploy to Firebase Hosting" → Run workflow** 버튼 클릭.
(이 버튼은 워크플로가 `main`에 있은 뒤부터 보입니다)

진행 상황은 **Actions 탭**에서 실시간으로 볼 수 있습니다. 초록 체크 ✅ 가 뜨면 완료.

---

## 6단계 — 주소 확인

배포가 끝나면 접속 주소는:

- 🧒 자녀 페이지: `https://<프로젝트ID>.web.app/`
- 👩 부모 페이지: `https://<프로젝트ID>.web.app/admin`

이 주소를 자녀 태블릿·부모 폰 즐겨찾기에 추가하세요.
(Actions 로그 맨 끝에도 배포된 주소가 출력됩니다.)

---

## 📱 안드로이드 앱은 별도

자녀용 안드로이드 앱(백그라운드 위치 포함)은 PC에서 빌드해야 합니다.
`kids-dashboard-android/README-android.md` 를 참고하세요.
(앱은 위에서 배포한 `https://<프로젝트ID>.web.app/` 주소를 띄웁니다 — `strings.xml` 의 `site_url` 에 입력)

---

## ❓ 문제 해결

- **Actions가 빨간 X로 실패** → Actions 탭에서 실패한 단계 로그 확인.
  대부분 비밀값 이름 오타 / 서비스 계정 JSON 누락 / 프로젝트 ID 불일치입니다.
- **사이트는 떴는데 로그인이 안 됨** → `VITE_FIREBASE_*` 비밀값이 실제 값인지,
  Firebase에서 이메일/비밀번호 로그인을 켰는지, 계정 2개를 만들었는지 확인.
- **위치 지도가 안내문만 보임** → `VITE_KAKAO_MAPS_KEY` 미설정.
  SETUP.md 7단계로 키를 발급해 비밀값에 넣고 다시 배포.
