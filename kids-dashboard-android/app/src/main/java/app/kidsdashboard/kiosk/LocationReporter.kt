package app.kidsdashboard.kiosk

import android.content.Context
import android.location.Location
import android.os.Build
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import java.util.Date

/**
 * Firestore 기록 모음 — 위치(locations/kid + locationHistory)와
 * 기기 상태(locations/kidStatus). 서비스와 워치독이 함께 사용한다.
 */
object LocationReporter {

    // 이동 경로 보관 기간 (30일). 이후 Firestore TTL 정책이 자동 삭제.
    private const val RETENTION_MS = 30L * 24 * 60 * 60 * 1000

    private val db: FirebaseFirestore get() = FirebaseFirestore.getInstance()

    // 최근 오류 (엄마 관리자 상태 카드에 표시)
    @Volatile
    private var lastError: String? = null

    @Volatile
    private var lastErrorAtMs: Long = 0

    fun noteError(message: String) {
        lastError = message.take(200)
        lastErrorAtMs = System.currentTimeMillis()
    }

    fun clearError() {
        lastError = null
        lastErrorAtMs = 0
    }

    /** 현재 위치 + 이동 경로 1건 기록. 둘 다 끝나면 완료되는 Task 반환. */
    fun writeLocation(context: Context, loc: Location, source: String): Task<Void> {
        val battery = DeviceState.batteryLevel(context)

        val data = hashMapOf<String, Any>(
            "lat" to loc.latitude,
            "lng" to loc.longitude,
            "accuracy" to loc.accuracy.toDouble(),
            "source" to source,
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        battery?.let { data["battery"] = it }
        val current = db.collection("locations").document("kid")
            .set(data, SetOptions.merge())

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
        val added = db.collection("locationHistory").add(history)

        return Tasks.whenAll(current, added)
    }

    /**
     * 기기 상태(생존 신호) 기록 — locations/kidStatus.
     * @param serviceRunning 위치 서비스가 살아서 보낸 신호인지(워치독 대체 보고면 false)
     * @param collecting 지금 주기 수집이 실제로 돌고 있는지
     */
    fun writeStatus(
        context: Context,
        serviceRunning: Boolean,
        collecting: Boolean,
        intervalMinutes: Long,
        heartbeatMinutes: Long,
    ): Task<Void> {
        val data = hashMapOf<String, Any>(
            "heartbeatAt" to FieldValue.serverTimestamp(),
            "heartbeatMinutes" to heartbeatMinutes,
            "intervalMinutes" to intervalMinutes,
            "serviceRunning" to serviceRunning,
            "collecting" to collecting,
            "permission" to DeviceState.permissionLevel(context),
            "locationEnabled" to DeviceState.isLocationEnabled(context),
            "batteryExempt" to DeviceState.isBatteryExempt(context),
            "notificationsAllowed" to DeviceState.notificationsAllowed(context),
            "appVersion" to BuildConfig.VERSION_NAME,
            "versionCode" to BuildConfig.VERSION_CODE,
            "androidSdk" to Build.VERSION.SDK_INT,
            "model" to "${Build.MANUFACTURER} ${Build.MODEL}".trim(),
        )
        DeviceState.batteryLevel(context)?.let { data["battery"] = it }
        val err = lastError
        if (err != null && lastErrorAtMs > 0) {
            data["lastError"] = err
            data["lastErrorAt"] = Timestamp(Date(lastErrorAtMs))
        }
        // 통째로 덮어써서 지난 오류 등 옛 필드가 남지 않게 한다
        return db.collection("locations").document("kidStatus").set(data)
    }
}
