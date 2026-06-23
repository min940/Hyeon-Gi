package app.kidsdashboard.kiosk

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.firebase.auth.FirebaseAuth

/**
 * 백그라운드 서비스가 Firestore 에 쓰려면 자녀 계정으로 로그인되어 있어야 한다.
 * (Firestore 규칙: locations 쓰기는 자녀/엄마 계정만 허용)
 *
 * 자녀가 WebView 에서 로그인할 때 입력한 PIN 을 JS 브릿지로 받아
 * 암호화 저장(EncryptedSharedPreferences)하고, 서비스는 그 PIN + 접미사로
 * 네이티브 FirebaseAuth 에 로그인한다. (실제 비밀번호는 평문 저장 안 함 — 암호화)
 */
object LocationAuth {

    private const val PREFS = "loc_creds"
    private const val KEY_PIN = "kid_pin"

    private fun prefs(context: Context) =
        EncryptedSharedPreferences.create(
            context,
            PREFS,
            MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )

    fun savePin(context: Context, pin: String) {
        prefs(context).edit().putString(KEY_PIN, pin).apply()
    }

    private fun getPin(context: Context): String? =
        prefs(context).getString(KEY_PIN, null)

    fun hasPin(context: Context): Boolean = getPin(context) != null

    /** 필요 시 자녀 계정으로 로그인. 결과를 콜백으로 전달. */
    fun ensureSignedIn(context: Context, onResult: (Boolean) -> Unit) {
        val auth = FirebaseAuth.getInstance()
        if (auth.currentUser != null) {
            onResult(true)
            return
        }
        val pin = getPin(context)
        if (pin == null) {
            onResult(false)
            return
        }
        val email = context.getString(R.string.kid_email)
        val suffix = context.getString(R.string.auth_suffix)
        auth.signInWithEmailAndPassword(email, pin + suffix)
            .addOnSuccessListener { onResult(true) }
            .addOnFailureListener { onResult(false) }
    }
}
