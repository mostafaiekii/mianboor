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
    val link: String
)

/**
 * Fetches the active VPN configs from the Mianboor server.
 *
 * Endpoint: GET {serverUrl}/api/client/configs?token={clientToken}
 * Raw config links are only ever held in memory — never shown in the UI.
 */
object MianboorApi {

    fun fetchConfigs(serverUrl: String, clientToken: String): List<RemoteConfig> {
        val base = serverUrl.trim().trimEnd('/')
        require(base.startsWith("http")) { "آدرس سرور معتبر نیست" }
        require(clientToken.isNotBlank()) { "توکن کلاینت تنظیم نشده" }

        val url = "$base/api/client/configs?token=" + URLEncoder.encode(clientToken, "UTF-8")
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
                    link = link
                )
            }
        } finally {
            conn.disconnect()
        }
    }
}
