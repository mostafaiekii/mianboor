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

/**
 * Connection to the Mianboor server.
 *
 * - fetchConfigs: GET {serverUrl}/api/client/configs?token=…&plan=free|premium
 *   The server only returns the configs allowed for this user category —
 *   premium links never even reach a free device.
 * - admin* helpers publish / manage configs with the x-admin-key header.
 *
 * Raw config links are only ever held in memory — never shown in the UI.
 */
object MianboorApi {

    fun fetchConfigs(serverUrl: String, clientToken: String, plan: String = "free"): List<RemoteConfig> {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        require(clientToken.isNotBlank()) { "توکن کلاینت تنظیم نشده" }

        val url = "$base/api/client/configs?token=" + URLEncoder.encode(clientToken, "UTF-8") +
            "&plan=" + URLEncoder.encode(plan, "UTF-8")
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
            val trimmed = body.trim()
            // سازگاری کامل: هم آرایه‌ی خام و هم شیء { ok, configs } پشتیبانی می‌شود
            val arr = if (trimmed.startsWith("["))
                JSONArray(trimmed)
            else
                JSONObject(trimmed).optJSONArray("configs") ?: JSONArray()
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
                )
            }
        } finally {
            conn.disconnect()
        }
    }

    // ------------------------------------------------------------------
    // Admin API (hidden panel → server publishing)
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

    /** Full config list for the admin panel (incl. inactive). */
    fun adminListConfigs(serverUrl: String, adminKey: String): List<RemoteConfig> {
        val conn = adminConn(serverUrl, adminKey, "/api/admin/configs", "GET")
        return try {
            if (conn.responseCode != 200) return emptyList()
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
        } catch (t: Throwable) {
            emptyList()
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
            conn.doOutput = true
            conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
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
            conn.doOutput = true
            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
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
}
