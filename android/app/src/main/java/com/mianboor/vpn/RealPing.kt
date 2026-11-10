package com.mianboor.vpn

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.ServerSocket
import java.net.Socket
import java.net.URL
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * ── پینگِ واقعی (v2.9.3) — همان «Real Delay» ویتوری/v2rayNG ──
 *
 * تفاوت با ServerTester (TCP):
 *   ServerTester  → فقط می‌گوید پورت سرور باز است (TCP handshake) — سرور ممکن است
 *                   روشن باشد ولی تونل اصلاً کار نکند (فیلتر DPI، هندشیک شکسته…)
 *   RealPing      → برای هر کانفیگ یک هستهٔ Xray موقت روی پورت سوکس آزاد بالا
 *                   می‌آید، یک درخواست HTTPS واقعی از «داخل تونل» به
 *                   generate_204 می‌فرستد و زمان پاسخ = تاخیر واقعی.
 *                   اگر کانفیگ واقعاً اینترنت رد نکند → null (مرده).
 *
 * کاملاً مستقل است: هیچ وابستگی به سرویس VPN/ServerTester ندارد.
 * با اتصال فعال هم تداخل ندارد (پورت تصادفی + هستهٔ جدا).
 */
object RealPing {

    // آدرس تست — cp.cloudflare.com (بررسی captive-portal کلادفلر؛ در ایران فیلتر نیست، 204)
    // + گالری فال‌بک گوگل. اولی جواب نداد دومی سنجیده می‌شود.
    private val TEST_URLS = listOf(
        "https://cp.cloudflare.com/generate_204",
        "https://www.gstatic.com/generate_204",
    )

    private const val BOOT_TIMEOUT_MS = 5000L   // حداکثر بوت هستهٔ موقت
    private const val HTTP_TIMEOUT_MS = 9000    // حداکثر انتظار برای پاسخ واقعی
    private const val MAX_PARALLEL = 3          // همزمان حداکثر ۳ هستهٔ موقت — گوشی نفس بکشد

    /** یک لینک کانفیگ → تاخیر واقعی (ms) یا null اگر تونل واقعاً کار نکرد. */
    fun test(ctx: Context, link: String): Long? {
        val bin = File(ctx.applicationInfo.nativeLibraryDir, "libxray.so")
        if (!bin.exists()) return null
        val parsed = runCatching { XrayConfigBuilder.parseLink(link, "realping", "—") }.getOrNull()
            ?: return null
        val port = freePort() ?: return null
        val confFile = File(ctx.cacheDir, "realping_$port.json")
        var proc: Process? = null
        try {
            confFile.writeText(minimalConfig(parsed.outbound, port))
            proc = ProcessBuilder(bin.absolutePath, "run", "-c", confFile.absolutePath)
                .redirectErrorStream(true)
                .start()
            // خالی‌کردن خروجی تا لولهٔ پر نشود و هسته قفل نکند
            val p = proc
            Thread { runCatching { p.inputStream.bufferedReader().readText() } }
                .apply { isDaemon = true; start() }
            if (!waitSocksUp(port, BOOT_TIMEOUT_MS)) return null
            for (u in TEST_URLS) {
                httpThroughSocks(port, u)?.let { return it }
            }
            return null
        } catch (t: Throwable) {
            return null
        } finally {
            runCatching { proc?.destroy() }
            runCatching { confFile.delete() }
        }
    }

    /**
     * چند کانفیگ را موازی (حداکثر ۳ هستهٔ همزمان) واقعاً می‌سنجد.
     * خروجی هم‌تراز ورودی است — null یعنی آن کانفیگ تونل واقعی نداشت.
     */
    fun testAll(ctx: Context, links: List<String>, parallel: Int = MAX_PARALLEL): List<Long?> {
        if (links.isEmpty()) return emptyList()
        val pool = Executors.newFixedThreadPool(parallel.coerceIn(1, MAX_PARALLEL))
        val results = arrayOfNulls<Long>(links.size)
        try {
            val futures = links.mapIndexed { i, l ->
                pool.submit(Callable { i to runCatching { test(ctx, l) }.getOrNull() })
            }
            futures.forEach { f ->
                try {
                    val (i, ms) = f.get(40, TimeUnit.SECONDS)
                    results[i] = ms
                } catch (t: Throwable) {
                    // همان اندیس null می‌ماند = مرده
                }
            }
        } finally {
            pool.shutdownNow()
        }
        return results.toList()
    }

    // ── کانفیگ حداقلی هستهٔ موقت: سوکس لوکال + همان outbound کانفیگ ──

    private fun minimalConfig(outbound: JSONObject, socksPort: Int): String {
        val inbound = JSONObject()
            .put("listen", "127.0.0.1")
            .put("port", socksPort)
            .put("protocol", "socks")
            .put("settings", JSONObject().put("udp", false))
        val freedom = JSONObject().put("protocol", "freedom").put("tag", "direct")
        val root = JSONObject()
            .put("log", JSONObject().put("loglevel", "none"))
            .put("inbounds", JSONArray().put(inbound))
            .put("outbounds", JSONArray().put(outbound).put(freedom))
        return root.toString()
    }

    private fun waitSocksUp(port: Int, timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (socksUp(port)) return true
            Thread.sleep(120)
        }
        return false
    }

    private fun socksUp(port: Int): Boolean = try {
        Socket().use { s -> s.connect(InetSocketAddress("127.0.0.1", port), 500); true }
    } catch (t: Throwable) {
        false
    }

    /** درخواست HTTPS واقعی از داخل تونل سوکس → ms یا null. */
    private fun httpThroughSocks(port: Int, urlStr: String): Long? = runCatching {
        val proxy = Proxy(Proxy.Type.SOCKS, InetSocketAddress("127.0.0.1", port))
        val conn = URL(urlStr).openConnection(proxy) as HttpURLConnection
        conn.connectTimeout = HTTP_TIMEOUT_MS
        conn.readTimeout = HTTP_TIMEOUT_MS
        conn.instanceFollowRedirects = true
        conn.useCaches = false
        conn.setRequestProperty("User-Agent", "Mianboor-RealPing")
        val t0 = System.currentTimeMillis()
        try {
            val code = conn.responseCode
            if (code in 200..399) System.currentTimeMillis() - t0 else null
        } finally {
            runCatching { conn.inputStream?.close() }
            runCatching { conn.errorStream?.close() }
            conn.disconnect()
        }
    }.getOrNull()

    private fun freePort(): Int? = runCatching {
        ServerSocket(0, 1, InetAddress.getByName("127.0.0.1")).use { it.localPort }
    }.getOrNull()
}
