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
 *  - plan / premiumUntil: وضعیت پرمیوم مرجع (سرور تصمیم می‌گیرد)
 *  - pay: اطلاعات کارت‌به‌کارت برای صفحه خرید
 */
data class SyncResult(
    val configs: List<RemoteConfig>,
    val plan: String,
    val premiumUntil: Long,
    val pay: PayInfo,
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
            val obj = JSONObject(body.trim())
            return parseSync(obj)
        } finally {
            conn.disconnect()
        }
    }

    /** سازگاری با ساختار قدیمی (آرایه خام یا { configs }). */
    fun fetchConfigs(serverUrl: String, clientToken: String, plan: String = "free"): List<RemoteConfig> =
        sync(serverUrl, clientToken, "", plan).configs

    private fun parseSync(obj: JSONObject): SyncResult {
        val arr = obj.optJSONArray("configs") ?: JSONArray()
        val configs = (0 until arr.length()).mapNotNull { i ->
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
        val pay = obj.optJSONObject("pay")
        return SyncResult(
            configs = configs,
            plan = if (obj.optString("plan") == "premium") "premium" else "free",
            premiumUntil = if (obj.isNull("premiumUntil")) 0L else obj.optLong("premiumUntil", 0L),
            pay = PayInfo(
                card = pay?.optString("card")?.orEmpty() ?: "",
                holder = pay?.optString("holder")?.orEmpty() ?: "",
                note = pay?.optString("note")?.orEmpty() ?: "",
            ),
        )
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
    // Admin API (hidden panel → server)
    // ------------------------------------------------------------------

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

    /** تست سریع کلید مدیر — برای دکمه «تست اتصال» پنل. */
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
