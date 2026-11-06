package com.mianboor.vpn

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.net.URLDecoder

/**
 * ── بخش اضطراری (v2.9.2) — فایل کاملاً مستقل ──
 *
 * وقتی فیلترینگ شدید می‌شود، این کلاس «هر راه زندهٔ ممکن» را پیدا می‌کند:
 *
 *   1. کشف دامنه‌ها: نقشهٔ mirrors از روی CDN (jsDelivr — سخت بسته می‌شود)
 *      + فال‌بک raw.githubusercontent + خودِ سرور اپ.
 *   2. کاوش زنده بودن: هر دامنه با تایم‌اوت کوتاه ping می‌شود.
 *   3. دریافت استخرِ کانفیگ‌های اضطراری از اولین دامنهٔ زنده.
 *
 * هیچ وابستگی به MianboorApi/Updater/سرویس‌های دیگر ندارد — حذفش بی‌خطر است.
 */
object EmergencyGate {

    /** نقشهٔ دامنه‌ها روی CDN — این فایل عمومی و بدون راز است. */
    private const val CDN_MAP = "https://cdn.jsdelivr.net/gh/mostafaiekii/mianboor@main/emergency/pool.json"
    private const val RAW_MAP = "https://raw.githubusercontent.com/mostafaiekii/mianboor/main/emergency/pool.json"
    private const val POOL_PATH = "/api/emergency/pool"

    data class ELink(val link: String, val name: String, val country: String)
    data class Pool(val base: String, val mirrors: List<String>, val links: List<ELink>)

    // ── ۱) کشف دامنه‌ها ─────────────────────────────────────────────

    /** همهٔ دامنه‌های کاندید: سرور اپ + آنچه از CDN/raw پیدا می‌شود (بدون تکرار). */
    fun discover(serverUrl: String, log: (String) -> Unit): List<String> {
        val found = LinkedHashSet<String>()
        val base = serverUrl.trim().trimEnd('/')
        if (base.startsWith("http")) found.add(base)

        for (mapUrl in listOf(CDN_MAP, RAW_MAP)) {
            val where = if (mapUrl.contains("jsdelivr")) "CDN jsDelivr" else "GitHub raw"
            try {
                val body = httpGet(mapUrl, timeoutMs = 6000)
                if (body == null) { log("✗ $where پاسخ نداد"); continue }
                val arr = JSONObject(body).optJSONArray("mirrors")
                if (arr == null) { log("✗ $where نقشهٔ نامعتبر"); continue }
                var n = 0
                for (i in 0 until arr.length()) {
                    val m = arr.optString(i, "").trim().trimEnd('/')
                    if (m.startsWith("http") && found.add(m)) n++
                }
                log("✓ $where — $n دامنهٔ جدید")
            } catch (t: Throwable) {
                log("✗ $where — ${t.javaClass.simpleName}")
            }
        }
        return found.toList()
    }

    // ── ۲) کاوش زنده بودن ───────────────────────────────────────────

    /** دامنه زنده است؟ هر پاسخ HTTP (حتی 401/404) یعنی مسیر باز است. */
    fun probe(base: String): Boolean = runCatching {
        val conn = URL(base.trimEnd('/') + POOL_PATH).openConnection() as HttpURLConnection
        conn.connectTimeout = 4000
        conn.readTimeout = 4000
        conn.requestMethod = "GET"
        try { conn.responseCode > 0 } finally { conn.disconnect() }
    }.getOrDefault(false)

    // ── ۳) استخر اضطراری ────────────────────────────────────────────

    /** از یک دامنهٔ زنده، کانفیگ‌های اضطراری را می‌گیرد. */
    fun fetchPool(base: String, token: String, log: (String) -> Unit): Pool? = runCatching {
        val url = "$base$POOL_PATH?token=${java.net.URLEncoder.encode(token, "UTF-8")}"
        val body = httpGet(url, timeoutMs = 8000)
        if (body == null) { log("✗ $base — بدون پاسخ"); return@runCatching null }
        val j = JSONObject(body)
        if (!j.optBoolean("ok", false)) { log("✗ $base — رد شد (${j.optInt("status", 401)})"); return@runCatching null }
        val mirrors = mutableListOf<String>()
        j.optJSONArray("mirrors")?.let { arr ->
            for (i in 0 until arr.length()) mirrors.add(arr.optString(i, "").trim().trimEnd('/'))
        }
        val links = mutableListOf<ELink>()
        j.optJSONArray("links")?.let { arr ->
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val l = o.optString("link", "").trim()
                if (l.startsWith("vless://") || l.startsWith("vmess://") ||
                    l.startsWith("trojan://") || l.startsWith("ss://")
                ) links.add(ELink(l, o.optString("name", "EMG-${i + 1}"), o.optString("country", "🆘")))
            }
        }
        if (links.isEmpty()) { log("✗ $base — استخر خالی"); return@runCatching null }
        log("✓ $base — ${links.size} کانفیگ اضطراری")
        Pool(base, mirrors, links)
    }.getOrNull()

    /** کل جریان: کشف → کاوش → دریافت. اولین استخرِ موفق برمی‌گردد. */
    fun rescue(serverUrl: String, token: String, log: (String) -> Unit): Pool? {
        log("— کشف دامنه‌های ممکن…")
        val candidates = discover(serverUrl, log)
        log("— ${candidates.size} دامنهٔ کاندید؛ کاوش…")
        for (base in candidates) {
            val alive = probe(base)
            log(if (alive) "✓ زنده: $base" else "✗ مرده: $base")
            if (!alive) continue
            fetchPool(base, token, log)?.let { return it }
        }
        return null
    }

    // ── ۴) پارسِ نمایشی لینک (فقط برای لیست UI؛ وصل‌شدن با خود لینک است) ──

    fun protoOf(link: String): String = when {
        link.startsWith("vless://") -> "VLESS"
        link.startsWith("vmess://") -> "VMess"
        link.startsWith("trojan://") -> "Trojan"
        else -> "SS"
    }

    fun hostOf(link: String): String = runCatching {
        when {
            link.startsWith("vmess://") -> {
                val json = String(android.util.Base64.decode(
                    link.removePrefix("vmess://"), android.util.Base64.DEFAULT))
                JSONObject(json).optString("add", "")
            }
            else -> {
                val u = URI(link)
                val host = u.host ?: ""
                if (u.rawUserInfo?.contains(":") == false && host.isEmpty())
                    URLDecoder.decode(u.schemeSpecificPart.split('@').last().split('/')[0].split(':')[0], "UTF-8")
                else host
            }
        }
    }.getOrDefault("—")

    fun portOf(link: String): Int = runCatching {
        when {
            link.startsWith("vmess://") -> {
                val json = String(android.util.Base64.decode(
                    link.removePrefix("vmess://"), android.util.Base64.DEFAULT))
                JSONObject(json).optInt("port", 443)
            }
            else -> URI(link).port.takeIf { it > 0 } ?: 443
        }
    }.getOrDefault(443)

    // ── HTTP ساده ───────────────────────────────────────────────────

    private fun httpGet(url: String, timeoutMs: Int): String? = runCatching {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = timeoutMs
        conn.readTimeout = timeoutMs
        conn.instanceFollowRedirects = true
        conn.setRequestProperty("User-Agent", "Mianboor-Emergency")
        try {
            if (conn.responseCode !in 200..299) null
            else conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }.getOrNull()
}
