package app.kidsdashboard.kiosk

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebView
import android.webkit.WebSettings
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * 자녀 전용 키오스크 화면.
 * 우리 대시보드 사이트만 전체화면 WebView 로 띄우고,
 * 화면 고정(Lock Task)으로 앱을 벗어나지 못하게 한다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 전체화면(상태바/내비바 숨김)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

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

        // 뒤로가기: 사이트 안에서만 이동, 앱은 종료되지 않게
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) webView.goBack()
                    // 더 뒤로 갈 곳이 없으면 아무것도 안 함(앱 유지)
                }
            },
        )

        // 시작 URL 로드
        webView.loadUrl(getString(R.string.site_url))
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        startKioskMode()
    }

    /**
     * 화면 고정(Lock Task) 시작.
     * 기기 설정 → 보안 → "앱 고정"이 켜져 있으면 동작한다.
     * (Device Owner 가 아니면 시스템이 한 번 확인을 띄울 수 있음 — 정상)
     */
    private fun startKioskMode() {
        try {
            val activityManager =
                getSystemService(ACTIVITY_SERVICE) as android.app.ActivityManager
            // 이미 고정 상태면 다시 호출하지 않음
            if (activityManager.lockTaskModeState ==
                android.app.ActivityManager.LOCK_TASK_MODE_NONE
            ) {
                startLockTask()
            }
        } catch (_: Exception) {
            // 화면 고정이 비활성화된 기기에서는 무시(앱은 정상 동작)
        }
    }

    private fun hideSystemBars() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_FULLSCREEN
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
