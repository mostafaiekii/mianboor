package com.mianboor.vpn

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

/**
 * TCP-handshake ping برای پروکسی‌های تلگرام (نسخهٔ ۲٫۱) —
 * عین الگوی ServerTester: یک سوکت TCP به host:port، زمانِ دست‌دادن = تأخیر.
 * هر پروکسی همزمان پینگ می‌شود و خروجی بر اساس تأخیر صعودی مرتب است؛
 * نامرئی‌ها 999 می‌گیرند و ته لیست می‌افتند.
 */
object TgProxyManager {

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
