package app.kidsdashboard.kiosk

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream

/**
 * 허용된 도메인(allowedHosts)으로만 접속을 제한하는 WebViewClient.
 *
 * - 페이지 이동(shouldOverrideUrlLoading): 허용 도메인 외면 차단(외부 브라우저도 열지 않음).
 * - 리소스 요청(shouldInterceptRequest): 허용 도메인 외면 빈 응답으로 차단.
 *
 * 이렇게 하면 우리 대시보드 사이트와 Firebase 외의 인터넷(유튜브·검색·광고 등)에는
 * 아예 접근할 수 없습니다.
 */
class KioskWebViewClient(
    private val allowedHosts: List<String>,
) : WebViewClient() {

    private fun isAllowed(uri: Uri?): Boolean {
        if (uri == null) return false
        val scheme = uri.scheme?.lowercase()
        // 앱 내부/데이터 스킴은 허용
        if (scheme == "data" || scheme == "about" || scheme == "blob") return true
        // https 만 허용 (http/기타 스킴 차단)
        if (scheme != "https") return false
        val host = uri.host?.lowercase() ?: return false
        return allowedHosts.any { allowed ->
            host == allowed || host.endsWith(".$allowed")
        }
    }

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?,
    ): Boolean {
        // true 를 반환하면 WebView 가 해당 URL 을 로드하지 않음(= 차단).
        return !isAllowed(request?.url)
    }

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?,
    ): WebResourceResponse? {
        if (isAllowed(request?.url)) {
            return null // 정상 처리
        }
        // 허용되지 않은 리소스는 빈 응답으로 차단
        return WebResourceResponse(
            "text/plain",
            "utf-8",
            ByteArrayInputStream(ByteArray(0)),
        )
    }
}
