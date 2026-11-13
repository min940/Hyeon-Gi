package app.kidsdashboard.kiosk

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat

/**
 * 기기 상태 조회 모음 — 위치 권한 수준, 폰 위치(GPS) 켜짐, 배터리 절전 제외 등.
 * 서비스·워치독·화면이 함께 쓰고, 엄마 관리자 "자녀 기기 상태" 카드로 보고된다.
 */
object DeviceState {

    private fun granted(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) ==
            PackageManager.PERMISSION_GRANTED

    /** 앱 사용 중 위치 권한(정밀 또는 대략) */
    fun hasForegroundLocation(context: Context): Boolean =
        granted(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
            granted(context, Manifest.permission.ACCESS_COARSE_LOCATION)

    /** "항상 허용" 여부 (API 29 미만은 앞단 권한과 동일) */
    fun hasBackgroundLocation(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            hasForegroundLocation(context) &&
                granted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            hasForegroundLocation(context)
        }

    /** "always"(항상 허용) / "foreground"(앱 사용 중에만) / "none"(없음) */
    fun permissionLevel(context: Context): String = when {
        !hasForegroundLocation(context) -> "none"
        hasBackgroundLocation(context) -> "always"
        else -> "foreground"
    }

    /** 폰의 위치 기능(빠른 설정의 "위치")이 켜져 있는지 */
    fun isLocationEnabled(context: Context): Boolean {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return false
        return LocationManagerCompat.isLocationEnabled(lm)
    }

    /** 배터리 최적화(절전) 제외 여부 — 제외돼야 백그라운드에서 오래 살아남는다 */
    fun isBatteryExempt(context: Context): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            ?: return false
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    fun notificationsAllowed(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    fun batteryLevel(context: Context): Int? {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            ?: return null
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (level in 0..100) level else null
    }
}
