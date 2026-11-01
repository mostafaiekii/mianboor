package com.mianboor.vpn

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.net.URLDecoder

/**
 * TCP-handshake ping برای پروکسی‌های تلگرام (نسخهٔ ۲٫۱) —
 * عین الگوی ServerTester: یک سوکت TCP به host:port، زمانِ دست‌دادن = تأخیر.
 * هر پروکسی همزمان پینگ می‌شود و خروجی بر اساس تأخیر صعودی مرتب است؛
 * نامرئی‌ها 999 می‌گیرند و ته لیست می‌افتند.
 */
object TgProxyManager {

    /**
     * پارس لینک کامل پروکسی تلگرام — نسخهٔ ۲٫۱ (پنل مدیر: فقط لینک، بدون ورود دستی فیلدها)
     *
     * فرمت‌های پشتیبانی‌شده (همان که تلگرام با «Copy Proxy Link» می‌دهد):
     *   tg://proxy?server=HOST&port=PORT&secret=SECRET
     *   https://t.me/proxy?server=HOST&port=PORT&secret=SECRET
     *   tg://socks?server=HOST&port=PORT&user=USER&pass=PASS
     *   https://t.me/socks?server=HOST&port=PORT&user=USER&pass=PASS
     *
     * خروجی: TgProxy آماده (کشور=gift — لوکیشن از لینک معلوم نیست) یا null اگر نامعتبر باشد.
     */
    fun parseLink(raw: String): TgProxy? {
        val l = raw.trim()
        if (l.isEmpty()) return null
        val lower = l.lowercase()
        val isMtproto = lower.startsWith("tg://proxy?") || lower.startsWith("https://t.me/proxy?") ||
            lower.startsWith("http://t.me/proxy?")
        val isSocks = lower.startsWith("tg://socks?") || lower.startsWith("https://t.me/socks?") ||
            lower.startsWith("http://t.me/socks?")
        if (!isMtproto && !isSocks) return null

        val q = l.substringAfter('?', "")
        val params = HashMap<String, String>()
        for (pair in q.split('&')) {
            if (pair.isEmpty()) continue
            val eq = pair.indexOf('=')
            if (eq <= 0) continue
            val k = pair.substring(0, eq).trim().lowercase()
            var v = pair.substring(eq + 1).trim()
            runCatching { v = URLDecoder.decode(v.replace("+", "%20"), "UTF-8") }
            if (k.isNotEmpty()) params[k] = v
        }

        val host = params["server"]?.trim().orEmpty()
        val port = params["port"]?.trim()?.toIntOrNull() ?: 0
        if (host.isEmpty() || port < 1 || port > 65535) return null

        return if (isMtproto) {
            val secret = params["secret"]?.trim().orEmpty()
            if (secret.isEmpty()) return null
            TgProxy(
                title = "پروکسی تلگرام",
                server = host,
                port = port,
                kind = "mtproto",
                secret = secret,
                country = "gift",
            )
        } else {
            val user = params["user"]?.trim().orEmpty()
            val pass = params["pass"]?.trim().orEmpty()
            TgProxy(
                title = "پروکسی تلگرام",
                server = host,
                port = port,
                kind = "socks",
                secret = if (user.isEmpty()) "" else "$user:$pass",
                country = "gift",
            )
        }
    }

    /** همه را همزمان پینگ می‌کند و بر اساس latency مرتب برمی‌گرداند (سریع‌ترین اول). */
    suspend fun measureAll(proxies: List<TgProxy>): List<TgProxy> =
        if (proxies.isEmpty()) proxies
        else withContext(Dispatchers.IO) {
            coroutineScope {
                proxies.map { p ->
                    async {
                        val ms = runCatching { ServerTester.ping(p.server, p.port) }.getOrNull()
                        p.copy(latency = ms?.toInt() ?: 999)
                    }
                }.awaitAll().sortedBy { it.latency }
            }
        }
}
