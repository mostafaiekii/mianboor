package com.mianboor.vpn

import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * TCP-connect "ping" against every server; returns the fastest reachable one.
 * Runs completely behind the scenes — the user only ever sees
 * «در حال یافتن سریع‌ترین مسیر…».
 */
object ServerTester {

    private const val CONNECT_TIMEOUT_MS = 2500

    fun testAll(servers: List<ParsedServer>): ParsedServer? {
        if (servers.isEmpty()) return null
        if (servers.size == 1) return tcpPing(servers[0].host, servers[0].port)?.let { servers[0] }

        val pool = Executors.newFixedThreadPool(minOf(servers.size, 8))
        val futures = servers.map { s ->
            pool.submit(Callable { s to tcpPing(s.host, s.port) })
        }
        try {
            var best: Pair<ParsedServer, Long>? = null
            for (f in futures) {
                val r = try {
                    f.get(6, TimeUnit.SECONDS)
                } catch (t: Throwable) {
                    null
                } ?: continue
                val ping = r.second ?: continue
                if (best == null || ping < best.second) best = r.first to ping
            }
            return best?.first
        } finally {
            pool.shutdownNow()
        }
    }

    private fun tcpPing(host: String, port: Int): Long? = try {
        Socket().use { s ->
            val t0 = System.currentTimeMillis()
            s.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
            System.currentTimeMillis() - t0
        }
    } catch (t: Throwable) {
        null
    }
}
