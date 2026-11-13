package app.kidsdashboard.kiosk

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.net.ConnectivityManager
import android.net.Network
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration

/**
 * 자녀 위치를 주기적으로 Firestore 에 기록하는 포그라운드 서비스.
 * - config/location 의 enabled / intervalMinutes 를 실시간 반영
 * - commands/locationRequest 가 pending 이면 GPS 고정밀 1회 측정 후 응답(하이브리드)
 * - 로그인 실패 시 종료하지 않고 재시도(인터넷이 돌아오면 즉시)
 * - 저장 실패·인증 만료를 감지해 다시 로그인
 * - 주기적으로 기기 상태(생존 신호)를 locations/kidStatus 에 보고
 *
 * 모든 상태 변경은 메인 스레드에서만 일어난다(Firebase/Fused 콜백 기본이 메인 스레드).
 */
class LocationService : Service() {

    private lateinit var fused: FusedLocationProviderClient
    private val db: FirebaseFirestore get() = FirebaseFirestore.getInstance()
    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val handler = Handler(Looper.getMainLooper())

    private var configReg: ListenerRegistration? = null
    private var requestReg: ListenerRegistration? = null
    private var listenersBroken = false
    private var locationCallback: LocationCallback? = null
    private var currentIntervalMs: Long = -1
    private var lastHandledRequestMs: Long = 0

    // 수집 설정 (config/location) — 못 읽으면 기본값으로 수집
    private var configEnabled = true
    private var configIntervalMin = DEFAULT_INTERVAL_MIN

    // 로그인 상태
    private var signedIn = false
    private var signInInFlight = false
    private var signInGen = 0
    private var badCredentials = false
    private var retryDelayMs = RETRY_MIN_MS
    private var lastReauthMs = -REAUTH_MIN_GAP_MS

    private var foregroundOk = false
    private var destroyed = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    private val signInRetry = Runnable { trySignIn(force = false) }

    // 생존 신호: 권한 변화 반영 + 상태 보고를 주기적으로 반복
    private val heartbeat = object : Runnable {
        override fun run() {
            if (destroyed || !signedIn) return
            if (listenersBroken) startListening()
            refreshCollection()
            reportStatus()
            handler.postDelayed(this, heartbeatMinutes() * 60_000L)
        }
    }

    // 네이티브 로그인 세션이 사라지면(비밀번호 변경 등) 다시 로그인
    private val authListener = FirebaseAuth.AuthStateListener { a ->
        if (signedIn && a.currentUser == null) {
            onSignedOut()
            trySignIn(force = false)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        running = true
        fused = LocationServices.getFusedLocationProviderClient(this)

        foregroundOk = enterForeground()
        if (!foregroundOk) {
            stopSelf()
            return
        }
        registerNetworkCallback()
        auth.addAuthStateListener(authListener)
        trySignIn(force = false)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 포그라운드 전환에 실패해 종료 중이면 아무것도 하지 않음
        if (!foregroundOk) return START_NOT_STICKY
        if (intent?.getBooleanExtra(EXTRA_RELOGIN, false) == true) {
            // 자녀가 앱에서 (새 PIN 으로) 다시 로그인함 → 저장된 PIN 으로 세션 갱신
            badCredentials = false
            onSignedOut()
            trySignIn(force = true)
        } else if (!signedIn && !signInInFlight) {
            // 앱을 열 때마다 호출됨 → 로그인 안 된 상태면 바로 재시도
            trySignIn(force = false)
        } else if (signedIn) {
            // 앱이 열렸을 때 최신 상태를 바로 보고
            handler.removeCallbacks(heartbeat)
            handler.post(heartbeat)
        }
        // 시스템이 종료해도 다시 시작
        return START_STICKY
    }

    /** 포그라운드 서비스로 전환. 권한 문제 등으로 실패하면 false. */
    private fun enterForeground(): Boolean =
        try {
            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            } else {
                0
            }
            ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(TEXT_SHARING), type)
            true
        } catch (e: Exception) {
            LocationReporter.noteError("서비스 시작 실패: ${e.javaClass.simpleName}")
            false
        }

    // ── 로그인 ────────────────────────────────────────────

    private fun trySignIn(force: Boolean) {
        if (destroyed) return
        handler.removeCallbacks(signInRetry)
        val gen = ++signInGen
        signInInFlight = true
        LocationAuth.ensureSignedIn(this, force) { result ->
            // 서비스가 끝났거나 더 최신 시도가 있으면 이 결과는 버림
            if (destroyed || gen != signInGen) return@ensureSignedIn
            signInInFlight = false
            when (result) {
                LocationAuth.SignInResult.OK -> {
                    badCredentials = false
                    retryDelayMs = RETRY_MIN_MS
                    onSignedIn()
                }
                LocationAuth.SignInResult.NO_PIN -> {
                    // 저장된 PIN 이 없으면 할 수 있는 일이 없음 → 앱 로그인 때 다시 시작됨
                    stopSelf()
                }
                LocationAuth.SignInResult.BAD_CREDENTIALS -> {
                    // PIN 이 바뀐 경우. 반복 시도는 계정 잠금을 부르므로 자동 재시도 안 함
                    // (앱을 열거나 다시 로그인하면 재시도)
                    badCredentials = true
                    LocationReporter.noteError("로그인 실패: PIN 불일치")
                    updateNotification(TEXT_NEED_LOGIN)
                }
                LocationAuth.SignInResult.NETWORK -> {
                    // 인터넷 등 일시 오류 → 간격을 늘려 가며 재시도
                    handler.postDelayed(signInRetry, retryDelayMs)
                    retryDelayMs = (retryDelayMs * 2).coerceAtMost(RETRY_MAX_MS)
                }
            }
        }
    }

    private fun onSignedIn() {
        signedIn = true
        startListening()
        handler.removeCallbacks(heartbeat)
        handler.post(heartbeat)
    }

    private fun onSignedOut() {
        signedIn = false
        handler.removeCallbacks(heartbeat)
        stopListening()
        stopLocationUpdates()
    }

    /** 인터넷이 다시 연결되면 로그인 재시도를 앞당긴다. */
    private fun registerNetworkCallback() {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                handler.post {
                    if (!destroyed && !signedIn && !signInInFlight && !badCredentials) {
                        trySignIn(force = false)
                    }
                }
            }
        }
        try {
            cm.registerDefaultNetworkCallback(cb)
            networkCallback = cb
        } catch (e: Exception) {
            // 등록 실패해도 주기 재시도가 있으므로 무시
        }
    }

    // ── Firestore 구독 ────────────────────────────────────

    private fun startListening() {
        stopListening()
        listenersBroken = false

        // 수집 설정 구독
        configReg = db.collection("config").document("location")
            .addSnapshotListener { snap, e ->
                if (e != null) {
                    listenersBroken = true
                    handleFirestoreError("설정 읽기", e)
                } else {
                    configEnabled = snap?.getBoolean("enabled") ?: true
                    configIntervalMin = (snap?.getLong("intervalMinutes") ?: DEFAULT_INTERVAL_MIN)
                        .coerceIn(1L, 120L)
                }
                // 설정을 못 읽어도 현재 값(기본: 켜짐·15분)으로 수집은 계속
                if (signedIn) refreshCollection()
            }

        // 정밀 위치 요청 구독
        requestReg = db.collection("commands").document("locationRequest")
            .addSnapshotListener { snap, e ->
                if (e != null) {
                    listenersBroken = true
                    handleFirestoreError("요청 읽기", e)
                    return@addSnapshotListener
                }
                if (snap == null || !snap.exists()) return@addSnapshotListener
                val status = snap.getString("status")
                val requestedAt = snap.getTimestamp("requestedAt")?.toDate()?.time ?: 0L
                if (status == "pending" && requestedAt > lastHandledRequestMs) {
                    lastHandledRequestMs = requestedAt
                    handlePreciseRequest()
                }
            }
    }

    private fun stopListening() {
        configReg?.remove()
        requestReg?.remove()
        configReg = null
        requestReg = null
    }

    /**
     * Firestore 실패 처리. 권한/인증 오류면 저장된 PIN 으로 다시 로그인한다
     * (너무 잦은 재로그인을 막기 위해 최소 간격을 둔다).
     */
    private fun handleFirestoreError(what: String, e: Exception) {
        val code = (e as? FirebaseFirestoreException)?.code
        LocationReporter.noteError("$what 실패: ${code ?: e.javaClass.simpleName}")
        val authProblem = code == FirebaseFirestoreException.Code.PERMISSION_DENIED ||
            code == FirebaseFirestoreException.Code.UNAUTHENTICATED
        if (!authProblem || destroyed) return
        val now = SystemClock.elapsedRealtime()
        if (now - lastReauthMs < REAUTH_MIN_GAP_MS) return
        lastReauthMs = now
        onSignedOut()
        trySignIn(force = true)
    }

    // ── 주기 수집 ─────────────────────────────────────────

    /** 설정·권한에 맞춰 주기 수집을 켜거나 끈다. */
    private fun refreshCollection() {
        val permitted = DeviceState.hasForegroundLocation(this)
        if (configEnabled && permitted) {
            startLocationUpdates(configIntervalMin)
        } else {
            stopLocationUpdates()
        }
        updateNotification(
            when {
                !permitted -> TEXT_NEED_PERMISSION
                !configEnabled -> TEXT_PAUSED
                else -> TEXT_SHARING
            },
        )
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates(intervalMinutes: Long) {
        val intervalMs = intervalMinutes.coerceAtLeast(1) * 60_000L
        if (intervalMs == currentIntervalMs && locationCallback != null) return
        stopLocationUpdates()

        val req = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            intervalMs,
        )
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .build()

        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { writeLocation(it, "background") }
            }
        }
        try {
            fused.requestLocationUpdates(req, cb, Looper.getMainLooper())
                .addOnFailureListener { e ->
                    LocationReporter.noteError("위치 수집 시작 실패: ${e.javaClass.simpleName}")
                    if (locationCallback === cb) {
                        locationCallback = null
                        currentIntervalMs = -1
                    }
                }
            locationCallback = cb
            currentIntervalMs = intervalMs
        } catch (e: SecurityException) {
            LocationReporter.noteError("위치 권한 없음")
        }
    }

    private fun stopLocationUpdates() {
        locationCallback?.let { fused.removeLocationUpdates(it) }
        locationCallback = null
        currentIntervalMs = -1
    }

    private fun writeLocation(loc: Location, source: String) {
        LocationReporter.writeLocation(this, loc, source)
            .addOnSuccessListener { LocationReporter.clearError() }
            .addOnFailureListener { e -> handleFirestoreError("위치 저장", e) }
    }

    // ── 정밀 위치 1회 요청 ─────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun handlePreciseRequest() {
        if (!DeviceState.hasForegroundLocation(this)) {
            markRequest("failed", "no_permission")
            return
        }
        if (!DeviceState.isLocationEnabled(this)) {
            markRequest("failed", "location_off")
            return
        }
        val req = CurrentLocationRequest.Builder()
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .setDurationMillis(PRECISE_TIMEOUT_MS)
            .setMaxUpdateAgeMillis(0)
            .build()
        try {
            fused.getCurrentLocation(req, CancellationTokenSource().token)
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        writeLocation(loc, "manual")
                        markRequest("done", null)
                    } else {
                        // 제한 시간 안에 위치를 못 잡음(실내·GPS 신호 약함 등)
                        markRequest("failed", "timeout")
                    }
                }
                .addOnFailureListener { markRequest("failed", "error") }
        } catch (e: SecurityException) {
            markRequest("failed", "no_permission")
        }
    }

    /** 요청 결과 기록 — status: done / failed, reason: 실패 사유(성공이면 삭제) */
    private fun markRequest(status: String, reason: String?) {
        db.collection("commands").document("locationRequest")
            .update(
                mapOf(
                    "status" to status,
                    "reason" to (reason ?: FieldValue.delete()),
                    "fulfilledAt" to FieldValue.serverTimestamp(),
                ),
            )
            .addOnFailureListener { e -> handleFirestoreError("요청 응답", e) }
    }

    // ── 상태 보고 ─────────────────────────────────────────

    // 수집 간격이 길어도 생존 신호는 최대 15분마다 보낸다
    private fun heartbeatMinutes(): Long =
        configIntervalMin.coerceIn(1L, MAX_HEARTBEAT_MIN)

    private fun reportStatus() {
        LocationReporter.writeStatus(
            context = this,
            serviceRunning = true,
            collecting = locationCallback != null,
            intervalMinutes = configIntervalMin,
            heartbeatMinutes = heartbeatMinutes(),
        ).addOnFailureListener { e -> handleFirestoreError("상태 저장", e) }
    }

    // ── 알림 ─────────────────────────────────────────────

    private fun buildNotification(text: String): Notification {
        val channelId = "location_sharing"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "위치 공유",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "가족과 위치를 공유하는 중입니다." }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("위치 공유 📍")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private var notificationText = TEXT_SHARING

    private fun updateNotification(text: String) {
        if (text == notificationText || destroyed) return
        notificationText = text
        try {
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .notify(NOTIF_ID, buildNotification(text))
        } catch (e: Exception) {
            // 알림 권한이 없어도 수집에는 영향 없음
        }
    }

    override fun onDestroy() {
        destroyed = true
        running = false
        handler.removeCallbacksAndMessages(null)
        auth.removeAuthStateListener(authListener)
        networkCallback?.let { cb ->
            try {
                (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
                    ?.unregisterNetworkCallback(cb)
            } catch (e: Exception) {
                // 이미 해제됨
            }
        }
        stopListening()
        stopLocationUpdates()
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 1001
        private const val EXTRA_RELOGIN = "relogin"

        private const val DEFAULT_INTERVAL_MIN = 15L
        private const val MAX_HEARTBEAT_MIN = 15L

        // 로그인 재시도 간격: 30초 → 1분 → 2분 … 최대 15분
        private const val RETRY_MIN_MS = 30_000L
        private const val RETRY_MAX_MS = 15 * 60_000L

        // 인증 오류로 인한 강제 재로그인 최소 간격
        private const val REAUTH_MIN_GAP_MS = 30 * 60_000L

        // 정밀 위치 측정 제한 시간
        private const val PRECISE_TIMEOUT_MS = 30_000L

        private const val TEXT_SHARING = "안전을 위해 가족과 위치를 공유하고 있어요."
        private const val TEXT_PAUSED = "위치 공유가 잠시 꺼져 있어요."
        private const val TEXT_NEED_PERMISSION = "위치 권한이 필요해요. 앱을 열어 주세요."
        private const val TEXT_NEED_LOGIN = "로그인이 필요해요. 앱을 열어 주세요."

        /** 서비스가 이 프로세스에서 살아 있는지 (워치독이 확인) */
        @Volatile
        var running: Boolean = false
            private set

        /**
         * 서비스 시작. 시작할 수 없는 상태면 false.
         * @param fromBackground 화면이 떠 있지 않은 상태(부팅·워치독)에서 부르는지.
         *   이때는 "항상 허용" 권한이 있어야 위치 서비스를 켤 수 있다.
         * @param relogin 저장된 PIN 으로 다시 로그인시킬지 (자녀가 방금 로그인한 경우)
         */
        fun start(
            context: Context,
            fromBackground: Boolean,
            relogin: Boolean = false,
        ): Boolean {
            if (!LocationAuth.hasPin(context)) return false
            if (!DeviceState.hasForegroundLocation(context)) return false
            if (fromBackground && !DeviceState.hasBackgroundLocation(context)) return false
            return try {
                val intent = Intent(context, LocationService::class.java)
                if (relogin) intent.putExtra(EXTRA_RELOGIN, true)
                ContextCompat.startForegroundService(context, intent)
                true
            } catch (e: Exception) {
                // 백그라운드 시작 제한 등 — 워치독이 대신 보고하거나 앱을 열 때 다시 시작
                false
            }
        }
    }
}
