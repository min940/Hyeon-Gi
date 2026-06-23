package app.kidsdashboard.kiosk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * 재부팅 후, 저장된 자녀 자격증명이 있으면 위치 서비스를 다시 시작한다.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED &&
            LocationAuth.hasPin(context)
        ) {
            LocationService.start(context)
        }
    }
}
