package com.mianboor.vpn

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class RemoteConfig(
    val id: String,
    val name: String,
    val country: String,
    val link: String,
    val premium: Boolean = false,
    val active: Boolean = true,
)

/** اطلاعات پرداخت کارت‌به‌کارت که مدیر از پنل تنظیم می‌کند. */
data class PayInfo(
    val card: String = "",
    val holder: String = "",
    val note: String = "",
)

/**
 * نتیجه‌ی کامل همگام‌سازی با سرور:
 *  - configs: کانفیگ‌های مجاز این دستگاه (free → فقط رایگان‌ها)
 *  - plan / premiumUntil: وضعیت پرمیوم مرجع (سرور تصمیم می‌گیرد) — null یعنی سرور قدیمی
 *  - pay: اطلاعات کارت‌به‌کارت برای صفحه خرید
 */
data class SyncResult(
    val configs: List<RemoteConfig>,
    val plan: String?,
    val premiumUntil: Long,
    val pay: PayInfo,
    val serverBuild: String? = null,
    val latestCode: Int = 0,
    val latestName: String? = null,
    val latestUrl: String? = null,
)

/** ردیف دستگاه برای پنل مدیر (تب Users). */
data class RemoteDevice(
    val id: String,
    val premium: Boolean,
    val premiumUntil: Long,
    val label: String,
    val lastSeenAt: Long,
)

/** سفارش خرید روی سرور (تب Orders پنل مدیر). */
data class RemoteOrder(
    val id: String,
    val deviceId: String,
    val plan: String,
    val price: Long,
    val via: String,
    val status: String,
    val createdAt: Long,
)

/**
 * Connection to the Mianboor server.
 *
 * - sync: GET {serverUrl}/api/client/configs?token=…&device=MB-…&plan=…
 *   سرور بر اساس وضعیت پرمیومِ دستگاهِ شناسه‌شده، کانفیگ‌های مجاز را برمی‌گرداند؛
 *   لینک‌های پرمیوم هرگز به دستگاه رایگان حتی نمی‌رسد.
 * - admin* helpers با هدر x-admin-key کانفیگ منتشر می‌کنند، سفارش‌ها را تأیید
 *   می‌کنند و دستگاه‌ها را پرمیوم می‌کنند.
 *
 * Raw config links are only ever held in memory — never shown in the UI.
 */
object MianboorApi {

    // ------------------------------------------------------------------
    // Client API
    // ------------------------------------------------------------------

    /** همگام‌سازی کامل: کانفیگ‌ها + وضعیت پرمیوم دستگاه + اطلاعات پرداخت. */
    fun sync(serverUrl: String, clientToken: String, deviceId: String, planHint: String = "free"): SyncResult {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        require(clientToken.isNotBlank()) { "توکن کلاینت تنظیم نشده" }

        val url = "$base/api/client/configs?token=" + URLEncoder.encode(clientToken, "UTF-8") +
            "&device=" + URLEncoder.encode(deviceId, "UTF-8") +
            "&plan=" + URLEncoder.encode(planHint, "UTF-8")
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.setRequestProperty("Accept", "application/json")
        conn.requestMethod = "GET"

        try {
            when (conn.responseCode) {
                401 -> throw IllegalStateException("توکن کلاینت نامعتبر است")
                404 -> throw IllegalStateException("سرور میانبر پیدا نشد؛ آدرس را بررسی کن")
                200 -> Unit
                else -> throw IllegalStateException("سرور پاسخ ${conn.responseCode} داد")
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            return parseBody(body)
        } finally {
            conn.disconnect()
        }
    }

    /** سازگاری با ساختار قدیمی (آرایه خام یا { configs }). */
    fun fetchConfigs(serverUrl: String, clientToken: String, plan: String = "free"): List<RemoteConfig> =
        sync(serverUrl, clientToken, "", plan).configs

    private fun parseSyncConfigs(arr: JSONArray): List<RemoteConfig> =
        (0 until arr.length()).mapNotNull { i ->
            val o = arr.getJSONObject(i)
            val link = o.optString("link")
            if (link.isNullOrBlank()) return@mapNotNull null
            RemoteConfig(
                id = o.optString("id"),
                name = o.optString("name").ifBlank { "سرور" },
                country = o.optString("country").ifBlank { "نامشخص" },
                link = link,
                premium = o.optBoolean("premium", false),
            )
        }

    private fun parseSync(obj: JSONObject): SyncResult {
        val configs = parseSyncConfigs(obj.optJSONArray("configs") ?: JSONArray())
        val pay = obj.optJSONObject("pay")
        val latest = obj.optJSONObject("latest")
        return SyncResult(
            configs = configs,
            plan = if (obj.optString("plan") == "premium") "premium" else "free",
            premiumUntil = parseEpochMillis(obj.opt("premiumUntil")),
            pay = PayInfo(
                card = pay?.optString("card")?.orEmpty() ?: "",
                holder = pay?.optString("holder")?.orEmpty() ?: "",
                note = pay?.optString("note")?.orEmpty() ?: "",
            ),
            serverBuild = obj.optString("serverBuild").takeIf { it.isNotBlank() },
            latestCode = latest?.optInt("code", 0) ?: 0,
            latestName = latest?.optString("name")?.takeIf { it.isNotBlank() },
            latestUrl = latest?.optString("url")?.takeIf { it.isNotBlank() },
        )
    }

    /** سازگاری با هر دو شکل پاسخ: آرایه خام (سرورهای قدیمی) و شیء { ok, configs, … }. */
    private fun parseBody(body: String): SyncResult {
        val trimmed = body.trim()
        return if (trimmed.startsWith("[")) {
            // سرور قدیمی: فقط آرایه کانفیگ — plan=null یعنی سرور درباره پرمیوم تصمیم نمی‌گیرد
            val arr = JSONArray(trimmed)
            SyncResult(parseSyncConfigs(arr), null, 0L, PayInfo())
        } else {
            parseSync(JSONObject(trimmed))
        }
    }

    /**
     * premiumUntil ممکن است عدد (epoch ms — سرور جدید) یا رشتهٔ ISO (فرمت‌های دیگر)
     * باشد — هر دو را به میلی‌ثانیه تبدیل می‌کنیم تا پرمیوم هرگز به‌خاطر فرمت دور ریخته نشود.
     */
    private fun parseEpochMillis(v: Any?): Long = when (v) {
        is Number -> v.toLong()
        is String -> v.toLongOrNull() ?: runCatching {
            val f = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
            f.timeZone = java.util.TimeZone.getTimeZone("UTC")
            f.parse(v.trim())?.time ?: 0L
        }.getOrDefault(0L)
        else -> 0L
    }

    /** ثبت سفارش خرید روی سرور تا در تب Orders پنل مدیر ظاهر شود. */
    fun submitOrder(serverUrl: String, clientToken: String, deviceId: String, plan: String, via: String): String? {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        val payload = JSONObject()
            .put("token", clientToken)
            .put("device", deviceId)
            .put("plan", plan)
            .put("via", via)
        val conn = URL("$base/api/client/orders").openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        return try {
            conn.doOutput = true
            conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            if (conn.responseCode !in 200..299) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            JSONObject(body).optJSONObject("order")?.optString("id")?.takeIf { it.isNotBlank() }
        } catch (t: Throwable) {
            null
        } finally {
            conn.disconnect()
        }
    }

    // ------------------------------------------------------------------
    // Server management API (key-authenticated)
    // ------------------------------------------------------------------

    // کوکی احراز مدیر سرور — برای سرورهای قدیمی که x-admin-key را نمی‌شناسند.
    // جریان: اول کلید (سرور جدید) → 401 خورد → لاگین با رمز و کوکی (سرور قدیمی).
    private var cookieCache: Pair<String, String>? = null

    /** ورود با رمز مدیر سرور (POST /api/admin/auth) و گرفتن کوکی mb_admin. */
    fun adminCookieLogin(serverUrl: String, password: String): String? {
        val base = serverUrl.trim().trimEnd('/')
        if (!base.startsWith("http") || password.isBlank()) return null
        cookieCache?.takeIf { it.first == base }?.let { return it.second }
        return try {
            val conn = URL("$base/api/admin/auth").openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 12000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            conn.doOutput = true
            conn.outputStream.use {
                it.write(JSONObject().put("password", password).toString().toByteArray(Charsets.UTF_8))
            }
            val ok = conn.responseCode == 200
            val cookie = if (ok) {
                conn.headerFields["Set-Cookie"]
                    ?.firstOrNull { it.startsWith("mb_admin=") }
                    ?.substringBefore(';')
            } else null
            conn.disconnect()
            if (cookie != null) { cookieCache = base to cookie; cookie } else null
        } catch (t: Throwable) {
            null
        }
    }

    /** کوکی معتبر برای سرور — کش‌شده یا با لاگین تازه؛ null یعنی هر دو روش شکست. */
    private fun cookieFor(serverUrl: String, adminKey: String, serverPass: String): String? {
        adminCookieLogin(serverUrl, serverPass)?.let { return it }
        // بعضی سرورها پسورد مدیر را همان کلید sync قرار می‌دهند
        return if (adminKey.isNotBlank() && adminKey != serverPass) adminCookieLogin(serverUrl, adminKey) else null
    }

    /** حذف کش کوکی (مثلاً بعد از تغییر رمز در پنل). */
    fun adminResetCookie() { cookieCache = null }

    /** اتصال با کوکی مدیر — بدون هدر کلید (سرور قدیمی). */
    private fun adminCookieConn(serverUrl: String, cookie: String, path: String, method: String): HttpURLConnection {
        val base = serverUrl.trim().trimEnd('/')
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.requestMethod = method
        conn.setRequestProperty("Cookie", cookie)
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        return conn
    }

    /**
     * درج کانفیگ با هر دو مکانیزم احراز:
     * اول x-admin-key (سرور جدید)؛ اگر نشد کوکی با رمز مدیر (سرور قدیمی) —
     * تا انتشار کانفیگ حتی قبل از به‌روز شدن سرور کار کند.
     */
    fun adminAddConfigAny(
        serverUrl: String,
        adminKey: String,
        serverPass: String,
        name: String,
        country: String,
        link: String,
        premium: Boolean,
    ): String {
        // کلید ممکن است خالی باشد (require داخل adminAddConfig) — اینجا امن بگیر
        val keyOk = runCatching {
            adminAddConfig(serverUrl, adminKey, name, country, link, premium)
        }.getOrDefault(false)
        if (keyOk) return "key"
        val cookie = cookieFor(serverUrl, adminKey, serverPass) ?: return "none"
        val payload = JSONObject()
            .put("name", name)
            .put("country", country)
            .put("links", link)
            .put("premium", premium)
        val conn = adminCookieConn(serverUrl, cookie, "/api/admin/configs", "POST")
        return try {
            sendJson(conn, payload)
            if (readOk(conn)) "cookie" else "none"
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            "none"
        }
    }

    private fun adminConn(serverUrl: String, adminKey: String, path: String, method: String): HttpURLConnection {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        require(adminKey.isNotBlank()) { "کلید مدیر سرور تنظیم نشده" }
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 12000
        conn.requestMethod = method
        conn.setRequestProperty("x-admin-key", adminKey)
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        return conn
    }

    private fun sendJson(conn: HttpURLConnection, body: JSONObject) {
        conn.doOutput = true
        conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
    }

    private fun readOk(conn: HttpURLConnection): Boolean = try {
        val code = conn.responseCode
        if (code in 200..299) {
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            JSONObject(body).optBoolean("ok", true)
        } else false
    } catch (t: Throwable) {
        false
    } finally {
        conn.disconnect()
    }

    /** تست سریع کلید مدیر — برای دکمه «تست اتصال» پنل (با fallback کوکی). */
    fun adminTestKey(serverUrl: String, adminKey: String): Boolean {
        if (!serverUrl.trim().startsWith("http") || adminKey.isBlank()) return false
        return try {
            val conn = adminConn(serverUrl, adminKey, "/api/admin/configs", "GET")
            val ok = conn.responseCode == 200
            conn.disconnect()
            ok
        } catch (t: Throwable) {
            false
        }
    }

    /** تست اتصال پنل مدیر: کلید یا کوکی هرکدام کار کند موفق است. */
    fun adminTestAny(serverUrl: String, adminKey: String, serverPass: String): Boolean {
        if (!serverUrl.trim().startsWith("http")) return false
        if (adminTestKey(serverUrl, adminKey)) return true
        return cookieFor(serverUrl, adminKey, serverPass) != null
    }

    /** Full config list for the admin panel (incl. inactive). Throws on failure. */
    fun adminListConfigs(serverUrl: String, adminKey: String): List<RemoteConfig> {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/configs", "GET")
        try {
            if (conn.responseCode != 200) {
                throw IllegalStateException("admin list failed: ${conn.responseCode}")
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val arr = JSONObject(body).optJSONArray("configs") ?: JSONArray()
            return (0 until arr.length()).mapNotNull { i ->
                val o = arr.getJSONObject(i)
                val link = o.optString("link")
                if (link.isNullOrBlank()) return@mapNotNull null
                RemoteConfig(
                    id = o.optString("id"),
                    name = o.optString("name").ifBlank { "سرور" },
                    country = o.optString("country").ifBlank { "نامشخص" },
                    link = link,
                    premium = o.optBoolean("premium", false),
                    active = o.optBoolean("active", true),
                )
            }
        } finally {
            conn.disconnect()
        }
    }

    /**
     * لیست کامل کانفیگ‌ها با fallback کوکی — برای سرورهای قدیمی.
     * اول کلید؛ اگر شکست خورد، لاگین با رمز مدیر و کوکی.
     */
    fun adminListConfigsAny(serverUrl: String, adminKey: String, serverPass: String): List<RemoteConfig> {
        return try {
            adminListConfigs(serverUrl, adminKey)
        } catch (t: Throwable) {
            val cookie = cookieFor(serverUrl, adminKey, serverPass)
                ?: throw IllegalStateException("no admin auth")
            val conn = adminCookieConn(serverUrl, cookie, "/api/admin/configs", "GET")
            try {
                if (conn.responseCode != 200) throw IllegalStateException("admin list failed: ${conn.responseCode}")
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONObject(body).optJSONArray("configs") ?: JSONArray()
                (0 until arr.length()).mapNotNull { i ->
                    val o = arr.getJSONObject(i)
                    val link = o.optString("link")
                    if (link.isNullOrBlank()) return@mapNotNull null
                    RemoteConfig(
                        id = o.optString("id"),
                        name = o.optString("name").ifBlank { "سرور" },
                        country = o.optString("country").ifBlank { "نامشخص" },
                        link = link,
                        premium = o.optBoolean("premium", false),
                        active = o.optBoolean("active", true),
                    )
                }
            } finally {
                conn.disconnect()
            }
        }
    }

    /** Publish a new config to the server — every user in its category gets it. */
    fun adminAddConfig(
        serverUrl: String,
        adminKey: String,
        name: String,
        country: String,
        link: String,
        premium: Boolean,
    ): Boolean {
        val payload = JSONObject()
            .put("name", name)
            .put("country", country)
            .put("links", link)
            .put("premium", premium)
        val conn = adminConn(serverUrl, adminKey, "/api/admin/configs", "POST")
        return try {
            sendJson(conn, payload)
            readOk(conn)
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            false
        }
    }

    /** Toggle active / premium flag of a server config. */
    fun adminPatchConfig(serverUrl: String, adminKey: String, id: String, body: JSONObject): Boolean {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/configs/$id", "PATCH")
        return try {
            sendJson(conn, body)
            readOk(conn)
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            false
        }
    }

    /** Delete a config from the server (stops distributing it to everyone). */
    fun adminDeleteConfig(serverUrl: String, adminKey: String, id: String): Boolean {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/configs/$id", "DELETE")
        return readOk(conn)
    }

    // ------------------------------------------------------------------
    // Admin API — orders (server-wide, all devices)
    // ------------------------------------------------------------------

    /** لیست سفارش‌های همه‌ی کاربران. Throws on failure. */
    fun adminListOrders(serverUrl: String, adminKey: String): List<RemoteOrder> {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/orders", "GET")
        try {
            if (conn.responseCode != 200) {
                throw IllegalStateException("orders list failed: ${conn.responseCode}")
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val arr = JSONObject(body).optJSONArray("orders") ?: JSONArray()
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                RemoteOrder(
                    id = o.optString("id"),
                    deviceId = o.optString("deviceId"),
                    plan = o.optString("plan"),
                    price = o.optLong("price"),
                    via = o.optString("via"),
                    status = o.optString("status", "pending"),
                    createdAt = o.optLong("createdAt", 0L),
                )
            }
        } finally {
            conn.disconnect()
        }
    }

    /** تأیید یا رد سفارش. action = "approve" | "reject" */
    fun adminOrderAction(serverUrl: String, adminKey: String, id: String, action: String): Boolean {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/orders/$id", "POST")
        return try {
            sendJson(conn, JSONObject().put("action", action))
            readOk(conn)
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            false
        }
    }

    // ------------------------------------------------------------------
    // Admin API — devices (premium management, e.g. Telegram purchases)
    // ------------------------------------------------------------------

    /** لیست دستگاه‌های متصل. Throws on failure. */
    fun adminListDevices(serverUrl: String, adminKey: String): List<RemoteDevice> {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/devices", "GET")
        try {
            if (conn.responseCode != 200) {
                throw IllegalStateException("devices list failed: ${conn.responseCode}")
            }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val arr = JSONObject(body).optJSONArray("devices") ?: JSONArray()
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                RemoteDevice(
                    id = o.optString("id"),
                    premium = o.optBoolean("premium", false),
                    premiumUntil = if (o.isNull("premiumUntil")) 0L else o.optLong("premiumUntil", 0L),
                    label = o.optString("label"),
                    lastSeenAt = o.optLong("lastSeenAt", 0L),
                )
            }
        } finally {
            conn.disconnect()
        }
    }

    /** پرمیوم‌کردن دستگاه (days روز؛ 0 یعنی لغو). */
    fun adminDevicePremium(serverUrl: String, adminKey: String, deviceId: String, days: Int): Boolean {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/devices/$deviceId", "POST")
        return try {
            sendJson(conn, JSONObject().put("action", if (days > 0) "premium" else "revoke").put("days", days))
            readOk(conn)
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            false
        }
    }

    // ------------------------------------------------------------------
    // Admin API — payment info (card-to-card)
    // ------------------------------------------------------------------

    /** خواندن تنظیمات پرداخت فعلی. */
    fun adminGetPayInfo(serverUrl: String, adminKey: String): PayInfo? {
        return try {
            val conn = adminConn(serverUrl, adminKey, "/api/admin/settings", "GET")
            if (conn.responseCode != 200) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()
            val o = JSONObject(body)
            PayInfo(
                card = o.optString("payCard"),
                holder = o.optString("payHolder"),
                note = o.optString("payNote"),
            )
        } catch (t: Throwable) {
            null
        }
    }

    /** ذخیره‌ی تنظیمات پرداخت (شماره کارت و …) برای نمایش در اپ کاربران. */
    fun adminSavePayInfo(serverUrl: String, adminKey: String, info: PayInfo): Boolean {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/settings", "PUT")
        return try {
            sendJson(
                conn,
                JSONObject()
                    .put("payCard", info.card)
                    .put("payHolder", info.holder)
                    .put("payNote", info.note),
            )
            readOk(conn)
        } catch (t: Throwable) {
            runCatching { conn.disconnect() }
            false
        }
    }
}
