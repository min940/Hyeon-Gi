package app.kidsdashboard.kiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 재부팅 후, 그리고 앱 업데이트(덮어 설치) 직후에
 * 저장된 자녀 자격증명이 있으면 위치 서비스를 다시 시작한다.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            return
        }
        if (!LocationAuth.hasPin(context)) return
        LocationWatchdogWorker.schedule(context)
        // "항상 허용" 이 아니면 여기서는 못 켬 → 워치독이 상태를 보고하고, 앱을 열면 시작
        LocationService.start(context, fromBackground = true)
    }
}
