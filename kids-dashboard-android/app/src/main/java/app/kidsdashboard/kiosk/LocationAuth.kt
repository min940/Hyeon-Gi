package app.kidsdashboard.kiosk

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException

/**
 * 백그라운드 서비스가 Firestore 에 쓰려면 자녀 계정으로 로그인되어 있어야 한다.
 * (Firestore 규칙: locations 쓰기는 자녀/엄마 계정만 허용)
 *
 * 자녀가 WebView 에서 로그인할 때 입력한 PIN 을 JS 브릿지로 받아
 * 암호화 저장(EncryptedSharedPreferences)하고, 서비스는 그 PIN + 접미사로
 * 네이티브 FirebaseAuth 에 로그인한다. (실제 비밀번호는 평문 저장 안 함 — 암호화)
 */
object LocationAuth {

    /** 로그인 시도 결과 */
    enum class SignInResult {
        OK,
        NO_PIN, // 저장된 PIN 없음 — 앱에서 자녀 로그인 필요
        BAD_CREDENTIALS, // PIN 불일치(자녀 PIN 이 바뀜 등) — 다시 로그인 필요
        NETWORK, // 인터넷 등 일시 오류 — 재시도하면 됨
    }

    private const val PREFS = "loc_creds"
    private const val KEY_PIN = "kid_pin"

    // 암호화 저장소 — 키 저장소 문제로 열리지 않으면 null (앱이 죽지 않게)
    private fun prefs(context: Context): SharedPreferences? =
        try {
            EncryptedSharedPreferences.create(
                context,
                PREFS,
                MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (e: Exception) {
            null
        }

    fun savePin(context: Context, pin: String) {
        prefs(context)?.edit()?.putString(KEY_PIN, pin)?.apply()
    }

    private fun getPin(context: Context): String? =
        try {
            prefs(context)?.getString(KEY_PIN, null)
        } catch (e: Exception) {
            null
        }

    fun hasPin(context: Context): Boolean = getPin(context) != null

    /**
     * 필요 시 자녀 계정으로 로그인. 결과를 콜백(메인 스레드)으로 전달.
     * @param force true 면 이미 로그인돼 있어도 저장된 PIN 으로 다시 로그인
     *              (세션이 무효가 됐거나 PIN 이 바뀐 경우)
     */
    fun ensureSignedIn(
        context: Context,
        force: Boolean = false,
        onResult: (SignInResult) -> Unit,
    ) {
        val auth = FirebaseAuth.getInstance()
        if (!force && auth.currentUser != null) {
            onResult(SignInResult.OK)
            return
        }
        val pin = getPin(context)
        if (pin == null) {
            onResult(SignInResult.NO_PIN)
            return
        }
        val email = context.getString(R.string.kid_email)
        val suffix = context.getString(R.string.auth_suffix)
        auth.signInWithEmailAndPassword(email, pin + suffix)
            .addOnSuccessListener { onResult(SignInResult.OK) }
            .addOnFailureListener { e ->
                onResult(
                    when (e) {
                        is FirebaseAuthInvalidCredentialsException,
                        is FirebaseAuthInvalidUserException,
                        -> SignInResult.BAD_CREDENTIALS
                        else -> SignInResult.NETWORK
                    },
                )
            }
    }
}
