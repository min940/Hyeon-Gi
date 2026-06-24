package app.kidsdashboard.kiosk

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebSettings
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * 자녀용 대시보드 화면.
 * 우리 사이트만 WebView 로 띄우고(키즈 모드에서 자유롭게 열고 닫음),
 * 위치 권한을 받아 백그라운드 위치 공유 서비스를 동작시킨다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // 앞단(포그라운드) 위치 + 알림 권한 요청
    private val foregroundPerms =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val fineGranted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (fineGranted) requestBackgroundLocation()
        }

    // 백그라운드 위치 권한 요청 (API 29+에서 별도 요청 필요)
    private val backgroundPerm =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            startLocationServiceIfReady()
        }

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
        settings.setGeolocationEnabled(true) // WebView 내 위치 사용 허용

        // 허용 도메인 목록 (strings.xml 에서 로드)
        val allowedHosts = resources.getStringArray(R.array.allowed_hosts).toList()
        webView.webViewClient = KioskWebViewClient(allowedHosts)

        // WebView 의 위치 권한 프롬프트는 자동 허용 (실제 통제는 OS 권한이 담당)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?,
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        // 웹 ↔ 네이티브 다리 (자녀 로그인 PIN 캡처 → 백그라운드 위치용 자격증명)
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidLocation")

        // 뒤로가기: 사이트 안에서 이동, 더 갈 곳 없으면 앱 닫기
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) webView.goBack() else finish()
                }
            },
        )

        requestForegroundPermissions()
        webView.loadUrl(getString(R.string.site_url))
    }

    override fun onResume() {
        super.onResume()
        startLocationServiceIfReady()
    }

    private fun requestForegroundPermissions() {
        val perms = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val needed = perms.any {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed) {
            foregroundPerms.launch(perms.toTypedArray())
        } else {
            requestBackgroundLocation()
        }
    }

    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val granted = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                // 시스템이 "항상 허용" 설정 화면으로 안내
                backgroundPerm.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                return
            }
        }
        startLocationServiceIfReady()
    }

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED

    // 위치 권한 + 저장된 자격증명이 있으면 백그라운드 서비스 시작
    private fun startLocationServiceIfReady() {
        if (hasLocationPermission() && LocationAuth.hasPin(this)) {
            LocationService.start(this)
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
