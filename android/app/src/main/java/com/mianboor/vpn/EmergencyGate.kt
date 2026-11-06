package com.mianboor.vpn

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.net.URLDecoder

/**
 * ── بخش اضطراری (v2.9.3) — فایل کاملاً مستقل ──
 *
 * وقتی فیلترینگ شدید می‌شود، این کلاس «هر راه زندهٔ ممکن» را پیدا می‌کند:
 *
 *   1. کشف دامنه‌ها: نقشهٔ mirrors از روی CDN (jsDelivr — سخت بسته می‌شود)
 *      + فال‌بک raw.githubusercontent + خودِ سرور اپ.
 *   2. کاوش زنده بودن: هر دامنه با تایم‌اوت کوتاه ping می‌شود.
 *   3. دریافت استخرِ اضطراری از اولین دامنهٔ زنده:
 *        a) لینک‌های خام با توکن
 *        b) اگر توکن نگذشت → seeds عمومی (base64 — بدون توکن سرو می‌شود)
 *   4. کش اضطراری: هر دریافت موفق ذخیره می‌شود؛ اگر همه‌جا قطع بود،
 *      آخرین کانفیگ‌های سالم از حافظه برمی‌گردند (همان «پیش‌توزیع» —
 *      کاربر هر بار که آنلاین است، مهماتِ لحظهٔ قطعی را ذخیره می‌کند).
 *
 * هیچ وابستگی به MianboorApi/Updater/سرویس‌های دیگر ندارد — حذفش بی‌خطر است.
 */
object EmergencyGate {

    /** نقشهٔ دامنه‌ها روی CDN — این فایل عمومی و بدون راز است. */
    private const val CDN_MAP = "https://cdn.jsdelivr.net/gh/mostafaiekii/mianboor@main/emergency/pool.json"
    private const val RAW_MAP = "https://raw.githubusercontent.com/mostafaiekii/mianboor/main/emergency/pool.json"
    private const val POOL_PATH = "/api/emergency/pool"

    private const val CACHE_PREFS = "emergency_cache"
    private const val CACHE_LINKS = "links_json"
    private const val CACHE_MIRRORS = "mirrors_json"
    private const val CACHE_AT = "saved_at"

    data class ELink(val link: String, val name: String, val country: String)
    data class Pool(
        val base: String,
        val mirrors: List<String>,
        val links: List<ELink>,
        val fromCache: Boolean = false,
        val savedAtText: String = "",
    )

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

    /** از یک دامنهٔ زنده: اول لینک خام با توکن، اگر نگذشت seeds عمومی (base64). */
    fun fetchPool(base: String, token: String, log: (String) -> Unit): Pool? = runCatching {
        val b = base.trimEnd('/')
        var links = mutableListOf<ELink>()
        val mirrors = mutableListOf<String>()

        // ۳-الف) لینک‌های خام با توکن
        if (token.isNotBlank()) {
            val url = "$b$POOL_PATH?token=${java.net.URLEncoder.encode(token, "UTF-8")}"
            val body = httpGet(url, timeoutMs = 8000)
            if (body != null) {
                val j = JSONObject(body)
                if (j.optBoolean("ok", false)) {
                    j.optJSONArray("mirrors")?.let { arr ->
                        for (i in 0 until arr.length()) mirrors.add(arr.optString(i, "").trim().trimEnd('/'))
                    }
                    j.optJSONArray("links")?.let { arr ->
                        for (i in 0 until arr.length()) {
                            val o = arr.optJSONObject(i) ?: continue
                            val l = o.optString("link", "").trim()
                            if (isCfg(l)) links.add(ELink(l, o.optString("name", "EMG-${i + 1}"), o.optString("country", "🆘")))
                        }
                    }
                    if (links.isNotEmpty()) log("✓ $b — ${links.size} کانفیگ اضطراری")
                } else {
                    log("✗ $b — توکن رد شد (${j.optInt("status", 401)})؛ seeds…")
                }
            } else {
                log("✗ $b — بدون پاسخ")
            }
        }

        // ۳-ب) seeds عمومی — بدون توکن؛ حتی اگر توکن عوض شده باشد کار می‌کند
        if (links.isEmpty()) {
            val body = httpGet("$b$POOL_PATH", timeoutMs = 8000)
            if (body != null) {
                val j = JSONObject(body)
                if (mirrors.isEmpty()) {
                    j.optJSONArray("mirrors")?.let { arr ->
                        for (i in 0 until arr.length()) mirrors.add(arr.optString(i, "").trim().trimEnd('/'))
                    }
                }
                j.optJSONArray("seeds")?.let { arr ->
                    for (i in 0 until arr.length()) {
                        val l = decodeBase64(arr.optString(i, "")).trim()
                        if (isCfg(l)) links.add(ELink(l, "EMG-${String.format("%02d", links.size + 1)}", "🆘"))
                    }
                }
                if (links.isNotEmpty()) log("✓ $b — ${links.size} کانفیگ از seeds عمومی")
                else log("✗ $b — استخر خالی")
            } else {
                log("✗ $b — بدون پاسخ (seeds)")
            }
        }

        if (links.isEmpty()) null else Pool(b, mirrors, links)
    }.getOrNull()

    /** کل جریان: کشف → کاوش → دریافت → (شکست؟) حافظهٔ اضطراری. */
    fun rescue(ctx: Context?, serverUrl: String, token: String, log: (String) -> Unit): Pool? {
        log("— کشف دامنه‌های ممکن…")
        val candidates = discover(serverUrl, log)
        log("— ${candidates.size} دامنهٔ کاندید؛ کاوش…")
        for (base in candidates) {
            val alive = probe(base)
            log(if (alive) "✓ زنده: $base" else "✗ مرده: $base")
            if (!alive) continue
            fetchPool(base, token, log)?.let {
                cachePut(ctx, it)
                return it
            }
        }
        // ── همه‌جا قطع بود؟ آخرین مهمات سالم از حافظهٔ اضطراری ──
        cacheGet(ctx)?.let { cached ->
            log("— شبکه قطع بود؛ ${cached.links.size} کانفیگ از حافظهٔ اضطراری")
            return cached
        }
        return null
    }

    // ── ۴) کش اضطراری — پیش‌توزیع خودکار ────────────────────────────

    private fun cachePut(ctx: Context?, pool: Pool) {
        if (ctx == null || pool.links.isEmpty()) return
        runCatching {
            val arr = JSONArray()
            pool.links.forEach { e ->
                arr.put(JSONObject().put("link", e.link).put("name", e.name).put("country", e.country))
            }
            val marr = JSONArray(); pool.mirrors.forEach { marr.put(it) }
            ctx.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE).edit()
                .putString(CACHE_LINKS, arr.toString())
                .putString(CACHE_MIRRORS, marr.toString())
                .putLong(CACHE_AT, System.currentTimeMillis())
                .apply()
        }
    }

    fun cacheGet(ctx: Context?): Pool? {
        if (ctx == null) return null
        return runCatching {
            val p = ctx.getSharedPreferences(CACHE_PREFS, Context.MODE_PRIVATE)
            val raw = p.getString(CACHE_LINKS, null) ?: return@runCatching null
            val arr = JSONArray(raw)
            val links = mutableListOf<ELink>()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val l = o.optString("link", "")
                if (isCfg(l)) links.add(ELink(l, o.optString("name", "EMG-${i + 1}"), o.optString("country", "🆘")))
            }
            if (links.isEmpty()) return@runCatching null
            val marr = runCatching { JSONArray(p.getString(CACHE_MIRRORS, "[]")) }.getOrDefault(JSONArray())
            val mirrors = mutableListOf<String>()
            for (i in 0 until marr.length()) mirrors.add(marr.optString(i, ""))
            val at = p.getLong(CACHE_AT, 0L)
            val whenTxt = if (at > 0) java.text.SimpleDateFormat("MM/dd HH:mm", java.util.Locale.US).format(java.util.Date(at)) else "—"
            Pool("cache", mirrors, links, fromCache = true, savedAtText = whenTxt)
        }.getOrNull()
    }

    // ── ۵) پارسِ نمایشی لینک (فقط برای لیست UI؛ وصل‌شدن با خود لینک است) ──

    fun isCfg(l: String): Boolean = l.startsWith("vless://") || l.startsWith("vmess://") ||
        l.startsWith("trojan://") || l.startsWith("ss://")

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

    // ── ۶) ابزار ────────────────────────────────────────────────────

    private fun decodeBase64(s: String): String = runCatching {
        String(android.util.Base64.decode(s.trim(), android.util.Base64.DEFAULT))
    }.getOrDefault("")

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
