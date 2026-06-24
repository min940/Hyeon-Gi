package app.kidsdashboard.kiosk

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import java.util.Date

/**
 * 자녀 위치를 주기적으로 Firestore 에 기록하는 포그라운드 서비스.
 * - config/location 의 enabled / intervalMinutes 를 실시간 반영
 * - commands/locationRequest 가 pending 이면 GPS 고정밀 1회 측정 후 응답(하이브리드)
 */
class LocationService : Service() {

    private lateinit var fused: FusedLocationProviderClient
    private val db: FirebaseFirestore get() = FirebaseFirestore.getInstance()

    private var configReg: ListenerRegistration? = null
    private var requestReg: ListenerRegistration? = null
    private var locationCallback: LocationCallback? = null
    private var currentIntervalMs: Long = -1
    private var lastHandledRequestMs: Long = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        fused = LocationServices.getFusedLocationProviderClient(this)
        startForeground(NOTIF_ID, buildNotification())

        // 자녀 계정 로그인 확인 후 수집 시작
        LocationAuth.ensureSignedIn(this) { ok ->
            if (ok) startListening() else stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // 시스템이 종료해도 다시 시작
        return START_STICKY
    }

    private fun startListening() {
        // 수집 설정 구독
        configReg = db.collection("config").document("location")
            .addSnapshotListener { snap, _ ->
                val enabled = snap?.getBoolean("enabled") ?: true
                val interval = snap?.getLong("intervalMinutes") ?: 15L
                if (!enabled) {
                    stopLocationUpdates()
                } else {
                    startLocationUpdates(interval)
                }
            }

        // 정밀 위치 요청 구독
        requestReg = db.collection("commands").document("locationRequest")
            .addSnapshotListener { snap, _ ->
                if (snap == null || !snap.exists()) return@addSnapshotListener
                val status = snap.getString("status")
                val requestedAt = snap.getTimestamp("requestedAt")?.toDate()?.time ?: 0L
                if (status == "pending" && requestedAt > lastHandledRequestMs) {
                    lastHandledRequestMs = requestedAt
                    handlePreciseRequest()
                }
            }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates(intervalMinutes: Long) {
        val intervalMs = intervalMinutes.coerceAtLeast(1) * 60_000L
        if (intervalMs == currentIntervalMs && locationCallback != null) return
        stopLocationUpdates()
        currentIntervalMs = intervalMs

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
        locationCallback = cb
        fused.requestLocationUpdates(req, cb, Looper.getMainLooper())
    }

    private fun stopLocationUpdates() {
        locationCallback?.let { fused.removeLocationUpdates(it) }
        locationCallback = null
        currentIntervalMs = -1
    }

    @SuppressLint("MissingPermission")
    private fun handlePreciseRequest() {
        val cts = CancellationTokenSource()
        fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { loc ->
                if (loc != null) writeLocation(loc, "manual")
                markRequestDone()
            }
            .addOnFailureListener { markRequestDone() }
    }

    private fun markRequestDone() {
        db.collection("commands").document("locationRequest")
            .update(
                mapOf(
                    "status" to "done",
                    "fulfilledAt" to FieldValue.serverTimestamp(),
                ),
            )
    }

    private fun writeLocation(loc: Location, source: String) {
        val data = hashMapOf<String, Any>(
            "lat" to loc.latitude,
            "lng" to loc.longitude,
            "accuracy" to loc.accuracy.toDouble(),
            "source" to source,
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        val battery = batteryLevel()
        battery?.let { data["battery"] = it }
        db.collection("locations").document("kid").set(data, SetOptions.merge())

        // 이동 경로 이력 1건 추가 (expireAt 후 Firestore TTL 이 자동 삭제)
        val history = hashMapOf<String, Any>(
            "lat" to loc.latitude,
            "lng" to loc.longitude,
            "accuracy" to loc.accuracy.toDouble(),
            "source" to source,
            "at" to FieldValue.serverTimestamp(),
            "expireAt" to Timestamp(Date(System.currentTimeMillis() + RETENTION_MS)),
        )
        battery?.let { history["battery"] = it }
        db.collection("locationHistory").add(history)
    }

    private fun batteryLevel(): Int? {
        val bm = getSystemService(BATTERY_SERVICE) as? BatteryManager ?: return null
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (level in 0..100) level else null
    }

    private fun buildNotification(): Notification {
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
            .setContentTitle("위치 공유 중 📍")
            .setContentText("안전을 위해 가족과 위치를 공유하고 있어요.")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        configReg?.remove()
        requestReg?.remove()
        stopLocationUpdates()
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 1001

        // 이동 경로 보관 기간 (30일). 이후 Firestore TTL 정책이 자동 삭제.
        private const val RETENTION_MS = 30L * 24 * 60 * 60 * 1000

        /** 서비스 시작 (자격증명이 저장돼 있을 때만 의미 있음) */
        fun start(context: Context) {
            val intent = Intent(context, LocationService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }
    }
}
