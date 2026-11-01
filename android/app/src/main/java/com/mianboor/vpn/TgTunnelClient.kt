package com.mianboor.vpn

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** نتیجهٔ یک صفحهٔ وبگردی از تونل — هرچه UI برای نمایش لازم دارد. */
data class TgTunnelPage(
    val ok: Boolean,
    val status: Int = 0,
    val contentType: String = "",
    val finalUrl: String = "",
    val body: String = "",
    val bytes: Int = 0,
    val msBridge: Int = 0,
    val msTotal: Int = 0,
    val framesUp: Int = 0,
    val framesDown: Int = 0,
    val truncated: Boolean = false,
    val error: String? = null,
)

/**
 * موتور TgTunnel (نسخهٔ ۲٫۲) — «وبگردی کامل» از پُل میانبر، بدون نیاز به VPS.
 *
 * مسیر: اپ → فریم‌بندی ۱۶KB + رمز AES-256-GCM (کلید نشست از هندشیک) → HTTPS
 * به {server}/api/tgtunnel/fetch → پُل مقصد را واقعاً واکشی می‌کند → پاسخ
 * فریم‌به‌فریم رمزی برمی‌گردد → اپ رمزگشایی و نمایش می‌کند.
 *
 * قالب فریم با سرور (Node/Bun) قرارداد مشترک دارد:
 *   { seq, iv: hex(12B), ct: hex(ciphertext||tag16B) } — چینش بومی Java GCM.
 * نشست stateless است: کلید = HMAC(SER, sid) سمت سرور؛ اپ کلید را از
 * /api/tgtunnel/session می‌گیرد و تا پایان پروسه نگه می‌دارد؛ خطای رمز →
 * هندشیک دوباره (یک بار).
 */
object TgTunnelClient {

    private const val FRAME = 16 * 1024
    private const val TIMEOUT_CONNECT = 8_000
    private const val TIMEOUT_READ = 20_000
    private const val TAG_BITS = 128

    private const val SEARCH = "https://html.duckduckgo.com/html/?q="

    private var sid: String? = null
    private var key: ByteArray? = null

    /** ورودی آزاد کاربر → مقصد معتبر؛ آدرس نبود → جستجوی DuckDuckGo (نسخهٔ html، بدون جاوااسکریپت) */
    fun normalize(raw: String): String? {
        val s = raw.trim()
        if (s.isEmpty()) return null
        val looksUrl = s.startsWith("http://") || s.startsWith("https://") ||
            (!s.contains(" ") && s.contains(".") && !s.endsWith("."))
        if (!looksUrl) return SEARCH + URLEncoder.encode(s, "UTF-8")
        val withScheme = if (s.startsWith("http")) s else "https://$s"
        return try {
            val u = URL(withScheme)
            if (u.host != null && u.host.contains(".")) u.toString() else null
        } catch (_: Exception) {
            null
        }
    }

    /** یک صفحه را از تونل می‌گیرد. خطاها هرگز کرش نمی‌کنند — در error برمی‌گردند. */
    fun browse(serverUrl: String, clientToken: String, rawUrl: String): TgTunnelPage {
        val t0 = System.currentTimeMillis()
        val base = serverUrl.trim().trimEnd('/')
        val target = normalize(rawUrl)
            ?: return TgTunnelPage(false, msTotal = 0, error = "آدرس معتبر نیست — دامنه را وارد کن (مثل example.com)")
        return try {
            if (sid == null || key == null) handshake(base, clientToken)
            send(base, target, t0)
        } catch (_: Exception) {
            // نشست ممکن است منقضی یا نامعتبر شده باشد — یک بار از نو
            sid = null
            key = null
            try {
                handshake(base, clientToken)
                send(base, target, t0)
            } catch (e2: Exception) {
                TgTunnelPage(false, msTotal = (System.currentTimeMillis() - t0).toInt(), error = friendly(e2))
            }
        }
    }

    /* ── هندشیک: POST /api/tgtunnel/session {token} → {ok, sid, key} ── */

    private fun handshake(serverUrl: String, clientToken: String) {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        val conn = URL("$base/api/tgtunnel/session").openConnection() as HttpURLConnection
        conn.connectTimeout = TIMEOUT_CONNECT
        conn.readTimeout = TIMEOUT_READ
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        try {
            conn.outputStream.use {
                it.write(JSONObject().put("token", clientToken).toString().toByteArray(Charsets.UTF_8))
            }
            val code = conn.responseCode
            val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { r -> r.readText() } ?: ""
            if (code != 200) throw IllegalStateException("پُل پاسخ $code داد")
            val j = JSONObject(body)
            if (!j.optBoolean("ok", false)) {
                throw IllegalStateException(j.optString("error").ifBlank { "هندشیک با پُل شکست خورد" })
            }
            val newSid = j.optString("sid")
            val newKey = hexBytes(j.optString("key"))
            if (newSid.isBlank() || newKey.size != 32) throw IllegalStateException("هندشیک ناقص بود")
            sid = newSid
            key = newKey
        } finally {
            conn.disconnect()
        }
    }

    /* ── ارسال فریم‌ها و دریافت پاسخ: POST /api/tgtunnel/fetch ── */

    private fun send(base: String, target: String, t0: Long): TgTunnelPage {
        val mySid = sid ?: throw IllegalStateException("نشست باز نیست")
        val myKey = key ?: throw IllegalStateException("کلید نشست باز نیست")

        // درخواست → فریم‌های رمز
        val plain = JSONObject().put("url", target).toString().toByteArray(Charsets.UTF_8)
        val framesUp = JSONArray()
        var seq = 0
        var off = 0
        while (off < plain.size) {
            val end = minOf(off + FRAME, plain.size)
            framesUp.put(seal(myKey, seq, plain.copyOfRange(off, end)))
            seq++
            off = end
        }

        val conn = URL("$base/api/tgtunnel/fetch").openConnection() as HttpURLConnection
        conn.connectTimeout = TIMEOUT_CONNECT
        conn.readTimeout = TIMEOUT_READ
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        try {
            conn.outputStream.use {
                it.write(
                    JSONObject()
                        .put("sid", mySid)
                        .put("frames", framesUp)
                        .toString().toByteArray(Charsets.UTF_8),
                )
            }
            val code = conn.responseCode
            val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use { r -> r.readText() } ?: ""
            if (code != 200) throw IllegalStateException("پُل پاسخ $code داد")
            val j = JSONObject(body)
            if (!j.optBoolean("ok", false)) {
                throw IllegalStateException(j.optString("error").ifBlank { "پُل درخواست را نپذیرفت" })
            }

            // رمزگشایی فریم‌های برگشتی به ترتیب seq
            val down = j.optJSONArray("frames") ?: JSONArray()
            val parts = mutableListOf<Pair<Int, ByteArray>>()
            for (i in 0 until down.length()) {
                val f = down.getJSONObject(i)
                parts.add(f.optInt("seq", i) to open(myKey, f))
            }
            parts.sortBy { it.first }
            val payload = JSONObject(parts.joinToString("") { String(it.second, Charsets.UTF_8) })

            val meta = j.optJSONObject("meta") ?: JSONObject()
            return TgTunnelPage(
                ok = true,
                status = payload.optInt("status", meta.optInt("status", 0)),
                contentType = payload.optString("contentType", meta.optString("contentType", "")),
                finalUrl = payload.optString("finalUrl", meta.optString("finalUrl", target)),
                body = payload.optString("body"),
                bytes = payload.optInt("bytes", meta.optInt("bytes", 0)),
                msBridge = meta.optInt("ms", 0),
                msTotal = (System.currentTimeMillis() - t0).toInt(),
                framesUp = framesUp.length(),
                framesDown = down.length(),
                truncated = payload.optBoolean("truncated", false),
            )
        } finally {
            conn.disconnect()
        }
    }

    /* ── رمز فریم — AES-256-GCM؛ ct = ciphertext||tag (چینش بومی Java) ── */

    private fun seal(k: ByteArray, seq: Int, plainP: ByteArray): JSONObject {
        val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, SecretKeySpec(k, "AES"), GCMParameterSpec(TAG_BITS, iv))
        val out = c.doFinal(plainP)
        return JSONObject().put("seq", seq).put("iv", hex(iv)).put("ct", hex(out))
    }

    private fun open(k: ByteArray, f: JSONObject): ByteArray {
        val iv = hexBytes(f.optString("iv"))
        val buf = hexBytes(f.optString("ct")) // = ciphertext||tag (چینش بومی Java GCM)
        if (iv.size != 12 || buf.size < 16) throw IllegalStateException("فریم برگشتی نامعتبر است")
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, SecretKeySpec(k, "AES"), GCMParameterSpec(TAG_BITS, iv))
        return c.doFinal(buf)
    }

    /* ── ابزار ── */

    private fun hex(b: ByteArray): String {
        val sb = StringBuilder(b.size * 2)
        for (x in b) {
            val v = x.toInt() and 0xff
            sb.append("0123456789abcdef"[v ushr 4]).append("0123456789abcdef"[v and 0x0f])
        }
        return sb.toString()
    }

    private fun hexBytes(s: String): ByteArray {
        val n = s.length / 2
        val out = ByteArray(n)
        for (i in 0 until n) {
            out[i] = ((Character.digit(s[i * 2], 16) shl 4) + Character.digit(s[i * 2 + 1], 16)).toByte()
        }
        return out
    }

    private fun friendly(e: Exception): String = when (e) {
        is java.io.IOException -> "ارتباط با پُل برقرار نشد — اینترنت را چک کن"
        is IllegalStateException -> e.message ?: "خطا در تونل"
        else -> "خطا در تونل: ${e.message ?: "نامشخص"}"
    }
}
