package app.kidsdashboard.kiosk

import android.annotation.SuppressLint
import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * 위치 서비스 워치독 — 약 15분마다 서비스가 살아 있는지 점검한다.
 * 1) 꺼져 있으면 다시 켠다.
 * 2) 시스템 제한으로 못 켜면, 여기서 직접 위치 1회 + 기기 상태를 보고한다
 *    (엄마 관리자에서 "서비스 꺼짐" 상태와 원인을 볼 수 있게).
 */
class LocationWatchdogWorker(
    context: Context,
    params: WorkerParameters,
) : Worker(context, params) {

    override fun doWork(): Result {
        val context = applicationContext
        if (!LocationAuth.hasPin(context)) return Result.success()
        if (LocationService.running) return Result.success()

        // 1) 서비스 재시작 시도
        if (LocationService.start(context, fromBackground = true)) return Result.success()

        // 2) 서비스를 못 켜는 상태 → 직접 1회 보고
        try {
            reportOnce(context)
        } catch (e: Exception) {
            // 다음 주기에 다시 시도
        }
        return Result.success()
    }

    @SuppressLint("MissingPermission")
    private fun reportOnce(context: Context) {
        // 로그인 (콜백은 메인 스레드 → 워커 스레드에서 대기)
        val latch = CountDownLatch(1)
        var result = LocationAuth.SignInResult.NETWORK
        LocationAuth.ensureSignedIn(context) {
            result = it
            latch.countDown()
        }
        if (!latch.await(20, TimeUnit.SECONDS)) return
        if (result != LocationAuth.SignInResult.OK) return

        // 백그라운드에서 위치를 읽으려면 "항상 허용" 이 필요
        if (DeviceState.hasBackgroundLocation(context) &&
            DeviceState.isLocationEnabled(context)
        ) {
            val loc = try {
                Tasks.await(
                    LocationServices.getFusedLocationProviderClient(context)
                        .getCurrentLocation(
                            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                            CancellationTokenSource().token,
                        ),
                    20,
                    TimeUnit.SECONDS,
                )
            } catch (e: Exception) {
                null
            }
            if (loc != null) {
                Tasks.await(
                    LocationReporter.writeLocation(context, loc, "background"),
                    15,
                    TimeUnit.SECONDS,
                )
            }
        }

        Tasks.await(
            LocationReporter.writeStatus(
                context = context,
                serviceRunning = false,
                collecting = false,
                intervalMinutes = INTERVAL_MIN,
                heartbeatMinutes = INTERVAL_MIN,
            ),
            15,
            TimeUnit.SECONDS,
        )
    }

    companion object {
        private const val WORK_NAME = "location_watchdog"
        private const val INTERVAL_MIN = 15L // WorkManager 최소 주기

        /** 워치독 예약 (이미 있으면 유지). 재부팅 후에도 WorkManager 가 유지한다. */
        fun schedule(context: Context) {
            try {
                val request = PeriodicWorkRequestBuilder<LocationWatchdogWorker>(
                    INTERVAL_MIN,
                    TimeUnit.MINUTES,
                )
                    .setConstraints(
                        Constraints.Builder()
                            .setRequiredNetworkType(NetworkType.CONNECTED)
                            .build(),
                    )
                    .build()
                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request,
                )
            } catch (e: Exception) {
                // 예약 실패는 치명적이지 않음 — 앱을 열 때 다시 예약
            }
        }
    }
}
