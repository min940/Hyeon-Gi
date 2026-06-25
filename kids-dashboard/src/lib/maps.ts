// 카카오맵 앱으로 위치 열기 (+ 스토어/웹 폴백)
//
// - 안드로이드: Intent URL → 앱 설치 시 앱, 미설치 시 플레이스토어로 자동 폴백
// - 아이폰: 앱 스킴 호출 후 일정 시간 내 전환 없으면 앱스토어로 이동(타이머 방식)
// - 그 외(PC): 카카오맵 웹

const KAKAO_ANDROID_PKG = "net.daum.android.map";
const KAKAO_IOS_APPSTORE = "https://apps.apple.com/app/id304608425";
const KAKAO_PLAYSTORE = `https://play.google.com/store/apps/details?id=${KAKAO_ANDROID_PKG}`;

function webUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/map/현재위치,${lat},${lng}`;
}

export function openKakaoMap(lat: number, lng: number): void {
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // 카카오맵 앱: 지도에 지점 표시
  const scheme = `kakaomap://look?p=${lat},${lng}`;

  if (isAndroid) {
    // 설치 시 앱 실행, 미설치 시 browser_fallback_url(플레이스토어)로 자동 이동
    const intent =
      `intent://look?p=${lat},${lng}#Intent;scheme=kakaomap;` +
      `package=${KAKAO_ANDROID_PKG};` +
      `S.browser_fallback_url=${encodeURIComponent(KAKAO_PLAYSTORE)};end`;
    window.location.href = intent;
    return;
  }

  if (isIOS) {
    // 앱 스킴 호출 → 일정 시간 내 화면 전환(앱 열림) 없으면 앱스토어로
    const start = Date.now();
    const timer = setTimeout(() => {
      // 앱이 열렸다면 보통 백그라운드 전환으로 이 코드가 늦게/안 실행됨
      if (Date.now() - start < 2000 && !document.hidden) {
        window.location.href = KAKAO_IOS_APPSTORE;
      }
    }, 1500);
    const cancel = () => {
      if (document.hidden) clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", cancel, { once: true });
    window.location.href = scheme;
    return;
  }

  // PC 등: 앱이 없으므로 웹으로
  window.open(webUrl(lat, lng), "_blank", "noopener,noreferrer");
}
