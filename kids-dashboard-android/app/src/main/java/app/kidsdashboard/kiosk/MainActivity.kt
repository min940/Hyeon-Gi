package app.kidsdashboard.kiosk

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebSettings
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * 자녀용 대시보드 화면.
 * 우리 사이트만 WebView 로 띄운다. (키즈 모드에서 자유롭게 열고 닫을 수 있음)
 * - 화면 고정(키오스크) 없음: 홈/최근앱 버튼으로 앱을 나가고 닫을 수 있다.
 * - 도메인 화이트리스트로 우리 사이트 외 인터넷은 차단한다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true // localStorage(준비물 체크) 사용
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mediaPlaybackRequiresUserGesture = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.allowFileAccess = false
        settings.allowContentAccess = false

        // 허용 도메인 목록 (strings.xml 에서 로드)
        val allowedHosts = resources.getStringArray(R.array.allowed_hosts).toList()
        webView.webViewClient = KioskWebViewClient(allowedHosts)

        // 뒤로가기: 사이트 안에서 이동할 수 있으면 이동, 더 갈 곳이 없으면 앱을 닫는다.
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish() // 첫 화면에서 뒤로가기 → 앱 닫기
                    }
                }
            },
        )

        // 시작 URL 로드
        webView.loadUrl(getString(R.string.site_url))
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
