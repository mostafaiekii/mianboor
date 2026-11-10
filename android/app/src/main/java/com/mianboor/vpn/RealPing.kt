package com.mianboor.vpn

import android.content.Context
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
 * ── پینگِ واقعی (v2.9.6) — همان «Real Delay» ویتوری/v2rayNG ──
 *
 * تفاوت با ServerTester (TCP):
 *   ServerTester  → فقط می‌گوید پورت سرور باز است (TCP handshake) — سرور ممکن است
 *                   روشن باشد ولی تونل اصلاً کار نکند (فیلتر DPI، هندشیک شکسته…)
 *   RealPing      → برای هر کانفیگ یک هستهٔ Xray موقت روی پورت سوکسِ آزاد بالا
 *                   می‌آید، یک درخواست HTTPS واقعی از «داخل تونل» به
 *                   generate_204 می‌فرستد و زمان پاسخ = تاخیر واقعی.
 *                   اگر کانفیگ واقعاً اینترنت رد نکند → null (مرده).
 *
 * نکتهٔ مهم (درس v2.9.5): کانفیگ هستهٔ موقت باید از همان سازندهٔ کانفیگ سرویس
 * اصلی (buildConfigJson) ساخته شود — با ماژول DNS و sniffing — وگرنه روی
 * اندروید resolve شدنِ دامنهٔ خود سرور شکست می‌خورد و کانفیگی که در ویتوری
 * جواب می‌دهد، اینجا بی‌دلیل «مرده» اعلام می‌شود.
 *
 * کاملاً مستقل است: هیچ وابستگی به سرویس VPN/ServerTester ندارد.
 * با اتصال فعال هم تداخل ندارد (پورت تصادفی + هستهٔ جدا).
 */
object RealPing {

    // آدرس‌های تست — به‌ترتیب امتحان می‌شوند:
    //  ۱) cp.cloudflare (بررسی captive-portal کلادفلر؛ در ایران فیلتر/پویسنی نمی‌شود)
    //  ۲) همان با HTTP ساده — بدون دست‌دادن TLS، سریع‌ترین سنجهٔ عبور ترافیک
    //  ۳) گالری گوگل (فال‌بک نهایی؛ همان پیش‌فرض ویتوری)
    private val TEST_URLS = listOf(
        "https://cp.cloudflare.com/generate_204",
        "http://cp.cloudflare.com/generate_204",
        "https://www.gstatic.com/generate_204",
    )

    private const val BOOT_TIMEOUT_MS = 6000L    // حداکثر بوت هستهٔ موقت
    private const val HTTP_TIMEOUT_MS = 12000    // حداکثر انتظار برای پاسخ واقعی
    private const val MAX_PARALLEL = 3           // همزمان حداکثر ۳ هستهٔ موقت — گوشی نفس بکشد

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
            // همان سازندهٔ کانفیگ سرویس اصلی — با ماژول DNS؛ فقط ساده و بدون تنظیمات جانبی
            val confJson = runCatching {
                XrayConfigBuilder.buildConfigJson(
                    parsed,
                    blockQuic = false,
                    stealth = "normal",
                    dnsMode = "auto",
                    tgSocks = null,
                    tgOnly = false,
                    mux = false,
                    guardian = emptySet(),
                    blockIr = false,
                    socksPort = port,
                    listenAll = false,
                    withHttpInbound = false,
                    minimal = false,
                )
            }.getOrNull() ?: return null
            confFile.writeText(confJson)
            proc = ProcessBuilder(bin.absolutePath, "run", "-c", confFile.absolutePath)
                .redirectErrorStream(true)
                .start()
            // خالی‌کردن خروجی تا لولهٔ پر نشود و هسته قفل نکند
            val p = proc
            Thread { runCatching { p.inputStream.bufferedReader().readText() } }
                .apply { isDaemon = true; start() }
            if (!waitSocksUp(port, BOOT_TIMEOUT_MS)) return null
            return probeThroughSocks(port)
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
                    val (i, ms) = f.get(45, TimeUnit.SECONDS)
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

    /**
     * یک درخواست واقعی از داخل تونلِ سوکسی که همین حالا روی این پورت بالاست.
     * توسط خود سرویس هم استفاده می‌شود تا «وصل‌شدن» را واقعاً تأیید کند —
     * عدد پینگ بدون عبور ترافیک بی‌معناست (همان قرارداد ویتوری).
     */
    fun probeThroughSocks(port: Int, timeoutMs: Int = HTTP_TIMEOUT_MS): Long? {
        for (u in TEST_URLS) {
            httpThroughSocks(port, u, timeoutMs)?.let { return it }
        }
        return null
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
    private fun httpThroughSocks(port: Int, urlStr: String, timeoutMs: Int): Long? = runCatching {
        val proxy = Proxy(Proxy.Type.SOCKS, InetSocketAddress("127.0.0.1", port))
        val conn = URL(urlStr).openConnection(proxy) as HttpURLConnection
        conn.connectTimeout = timeoutMs
        conn.readTimeout = timeoutMs
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
