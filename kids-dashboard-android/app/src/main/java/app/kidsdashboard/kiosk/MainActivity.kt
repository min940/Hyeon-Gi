package app.kidsdashboard.kiosk

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebSettings
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * 자녀용 대시보드 화면.
 * 우리 사이트만 WebView 로 띄우고(키즈 모드에서 자유롭게 열고 닫음),
 * 위치 권한을 받아 백그라운드 위치 공유 서비스를 동작시킨다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // 권한 안내 흐름(위치 → 항상 허용 → 배터리)이 끝났는지
    private var permissionFlowDone = false

    // 배터리 절전 제외 요청은 앱을 켤 때마다 한 번만
    private var askedBatteryThisLaunch = false

    // 앞단(포그라운드) 위치 + 알림 권한 요청
    private val foregroundPerms =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val fineGranted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (fineGranted) requestBackgroundLocation() else finishPermissionFlow()
        }

    // 백그라운드 위치 권한 요청 (API 29+에서 별도 요청 필요)
    private val backgroundPerm =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            // 시스템이 더 묻지 않거나 거절됐으면 설정 화면으로 직접 안내
            if (granted) finishPermissionFlow() else showAlwaysAllowGuide()
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

        LocationWatchdogWorker.schedule(this)
        requestForegroundPermissions()
        // 앱이 늘 최신 사이트 화면을 받도록 시작 시 캐시 비우기
        // (캐시에 남은 옛 화면 때문에 업데이트가 안 보이는 문제 방지)
        webView.clearCache(true)
        webView.loadUrl(getString(R.string.site_url))
    }

    override fun onResume() {
        super.onResume()
        // 설정 화면에서 돌아왔을 때: 남은 안내(배터리)와 서비스 시작
        if (permissionFlowDone) {
            requestBatteryExemptionIfNeeded()
            startLocationServiceIfReady()
        }
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
        if (!DeviceState.hasForegroundLocation(this)) {
            finishPermissionFlow()
            return
        }
        if (!DeviceState.hasBackgroundLocation(this) &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        ) {
            // 시스템이 "항상 허용" 설정 화면으로 안내
            backgroundPerm.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            return
        }
        finishPermissionFlow()
    }

    /**
     * 위치가 "앱 사용 중에만 허용" 이면 재부팅 뒤에는 앱을 열기 전까지
     * 위치가 수집되지 않는다 → "항상 허용" 으로 바꾸도록 설정 화면을 안내.
     */
    private fun showAlwaysAllowGuide() {
        if (isFinishing || isDestroyed) {
            finishPermissionFlow()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("위치를 '항상 허용'으로 바꿔 주세요")
            .setMessage(
                "지금은 앱을 사용할 때만 위치가 허용되어 있어요.\n\n" +
                    "'설정 열기' → 권한 → 위치 → '항상 허용' 을 선택해 주세요.\n" +
                    "(부모님과 함께 설정하세요)",
            )
            .setPositiveButton("설정 열기") { _, _ ->
                finishPermissionFlow(askBattery = false)
                openAppSettings()
            }
            .setNegativeButton("나중에") { _, _ -> finishPermissionFlow() }
            .setOnCancelListener { finishPermissionFlow() }
            .show()
    }

    private fun openAppSettings() {
        try {
            startActivity(
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$packageName"),
                ),
            )
        } catch (e: Exception) {
            // 설정 화면을 열 수 없는 기기 — 무시
        }
    }

    /** 권한 안내가 끝남 → (필요 시) 배터리 절전 제외 요청 후 서비스 시작 */
    private fun finishPermissionFlow(askBattery: Boolean = true) {
        permissionFlowDone = true
        if (askBattery) requestBatteryExemptionIfNeeded()
        startLocationServiceIfReady()
    }

    /**
     * 배터리 절전 대상이면 시스템이 위치 서비스를 자주 종료한다
     * → "제한 없음(절전 제외)" 허용을 요청. 앱을 켤 때마다 한 번만 묻는다.
     */
    @SuppressLint("BatteryLife")
    private fun requestBatteryExemptionIfNeeded() {
        if (askedBatteryThisLaunch) return
        if (!DeviceState.hasForegroundLocation(this)) return
        if (DeviceState.isBatteryExempt(this)) return
        askedBatteryThisLaunch = true
        try {
            startActivity(
                Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:$packageName"),
                ),
            )
        } catch (e: Exception) {
            try {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            } catch (e2: Exception) {
                // 지원하지 않는 기기 — 무시
            }
        }
    }

    // 위치 권한 + 저장된 자격증명이 있으면 백그라운드 서비스 시작
    private fun startLocationServiceIfReady() {
        LocationService.start(this, fromBackground = false)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
