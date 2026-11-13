package app.kidsdashboard.kiosk

import android.content.Context
import android.webkit.JavascriptInterface

/**
 * WebView ↔ 네이티브 다리.
 * 자녀가 웹에서 로그인에 성공하면 입력한 PIN 을 전달받아,
 * 백그라운드 위치 서비스가 쓸 자격증명으로 저장하고 서비스를 시작한다.
 *
 * (이 사이트만 WebView 에 로드되므로 외부 페이지가 호출할 수 없음)
 */
class WebAppInterface(private val context: Context) {

    @JavascriptInterface
    fun onKidLogin(pin: String) {
        if (pin.isBlank()) return
        LocationAuth.savePin(context, pin)
        LocationWatchdogWorker.schedule(context)
        // 방금 입력한 PIN 으로 네이티브 세션도 다시 로그인 (PIN 이 바뀐 경우 대비)
        LocationService.start(context, fromBackground = false, relogin = true)
    }
}
