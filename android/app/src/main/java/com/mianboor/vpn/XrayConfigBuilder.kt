package com.mianboor.vpn

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLDecoder

/**
 * A server parsed from a share link, holding the ready-to-use xray outbound.
 */
data class ParsedServer(
    val name: String,
    val country: String,
    val protocol: String,
    val host: String,
    val port: Int,
    val rawLink: String,
    val outbound: JSONObject
)

/**
 * Parses vmess/vless/trojan/ss share links and turns them into an
 * Xray-core JSON config with a SOCKS5 inbound on 127.0.0.1:10809.
 */
object XrayConfigBuilder {

    const val SOCKS_PORT = 10809

    // ------------------------------------------------------------------
    // Link parsing
    // ------------------------------------------------------------------

    fun parseLink(raw: String, name: String, country: String): ParsedServer? {
        val link = raw.trim()
        return try {
            when {
                link.startsWith("vmess://") -> parseVmess(link, name, country)
                link.startsWith("vless://") -> parseUserPassLink(link, name, country, "vless")
                link.startsWith("trojan://") -> parseUserPassLink(link, name, country, "trojan")
                link.startsWith("ss://") -> parseShadowsocks(link, name, country)
                else -> null
            }
        } catch (t: Throwable) {
            null
        }
    }

    // ----- vmess://<base64 json> -----

    private fun parseVmess(link: String, name: String, country: String): ParsedServer? {
        val json = String(b64Decode(link.removePrefix("vmess://")), Charsets.UTF_8)
        val j = JSONObject(json)
        val host = j.optString("add")
        val port = j.optInt("port", 0)
        if (host.isBlank() || port <= 0) return null

        val user = JSONObject()
            .put("id", j.optString("id"))
            .put("alterId", j.optInt("aid", j.optInt("alterId", 0)))
            .put("security", j.optString("scy").ifBlank { "auto" })
            .put("level", 0)

        val settings = JSONObject().put(
            "vnext",
            JSONArray().put(
                JSONObject().put("address", host).put("port", port).put("users", JSONArray().put(user))
            )
        )

        val query = mapOf<String, String>(
            "type" to j.optString("net", "tcp"),
            "security" to j.optString("tls", ""),
            "sni" to j.optString("sni", ""),
            "host" to j.optString("host", ""),
            "path" to j.optString("path", ""),
            "alpn" to j.optString("alpn", ""),
            "fp" to j.optString("fp", "")
        )

        val stream = buildStreamSettings(j.optString("net", "tcp"), j.optString("tls", ""), query)
        val outbound = JSONObject()
            .put("protocol", "vmess")
            .put("settings", settings)
        if (stream != null) outbound.put("streamSettings", stream)

        return ParsedServer(
            name = j.optString("ps").ifBlank { name },
            country = country,
            protocol = "vmess",
            host = host,
            port = port,
            rawLink = link,
            outbound = outbound
        )
    }

    // ----- vless://uuid@host:port?params#name | trojan://pass@host:port?params#name -----

    private fun parseUserPassLink(
        link: String,
        name: String,
        country: String,
        protocol: String
    ): ParsedServer? {
        val rest = link.removePrefix("$protocol://")
        val (body, fragment) = splitFragment(rest)
        val qIdx = body.indexOf('?')
        val authority = if (qIdx >= 0) body.substring(0, qIdx) else body
        val query = parseQuery(if (qIdx >= 0) body.substring(qIdx + 1) else "")

        val atIdx = authority.lastIndexOf('@')
        if (atIdx <= 0) return null
        val secret = URLDecoder.decode(authority.substring(0, atIdx), "UTF-8")
        val hostPort = authority.substring(atIdx + 1)
        val (host, port) = splitHostPort(hostPort) ?: return null

        val security = query["security"] ?: if (protocol == "trojan") "tls" else ""
        val network = query["type"] ?: "tcp"

        val settings: JSONObject = when (protocol) {
            "vless" -> JSONObject().put(
                "vnext",
                JSONArray().put(
                    JSONObject()
                        .put("address", host)
                        .put("port", port)
                        .put(
                            "users",
                            JSONArray().put(
                                JSONObject()
                                    .put("id", secret)
                                    .put("encryption", "none")
                                    .put("level", 0)
                                    .apply {
                                        query["flow"]?.takeIf { it.isNotBlank() }?.let { put("flow", it) }
                                    }
                            )
                        )
                )
            )
            else -> JSONObject().put( // trojan
                "servers",
                JSONArray().put(
                    JSONObject()
                        .put("address", host)
                        .put("port", port)
                        .put("password", secret)
                )
            )
        }

        val stream = buildStreamSettings(network, security, query)
        val outbound = JSONObject()
            .put("protocol", protocol)
            .put("settings", settings)
        if (stream != null) outbound.put("streamSettings", stream)

        return ParsedServer(
            name = fragment?.let { URLDecoder.decode(it, "UTF-8") }?.ifBlank { null } ?: name,
            country = country,
            protocol = protocol,
            host = host,
            port = port,
            rawLink = link,
            outbound = outbound
        )
    }

    // ----- ss://-----

    private fun parseShadowsocks(link: String, name: String, country: String): ParsedServer? {
        val rest = link.removePrefix("ss://")
        val (body, fragment) = splitFragment(rest)
        val qIdx = body.indexOf('?')
        val mainPart = if (qIdx >= 0) body.substring(0, qIdx) else body
        val query = parseQuery(if (qIdx >= 0) body.substring(qIdx + 1) else "")

        // Reject plugin-based configs (simple-obfs / v2ray-plugin) — unsupported.
        if (query["plugin"]?.isNotBlank() == true) return null

        val atIdx = mainPart.lastIndexOf('@')
        val decoded: String
        val hostPort: String
        if (atIdx > 0) {
            // SIP002: [base64(method:pass)]@host:port
            val userInfo = mainPart.substring(0, atIdx)
            hostPort = mainPart.substring(atIdx + 1)
            decoded = if (userInfo.contains(':')) {
                userInfo
            } else {
                String(b64Decode(userInfo), Charsets.UTF_8)
            }
        } else {
            // Fully base64-encoded: base64(method:pass@host:port)
            decoded = String(b64Decode(mainPart), Charsets.UTF_8)
            val dAt = decoded.lastIndexOf('@')
            if (dAt <= 0) return null
            hostPort = decoded.substring(dAt + 1)
        }

        val colon = decoded.indexOf(':')
        if (colon <= 0) return null
        val method = decoded.substring(0, colon)
        val password = decoded.substring(colon + 1)
        val (host, port) = splitHostPort(hostPort) ?: return null

        val outbound = JSONObject()
            .put("protocol", "shadowsocks")
            .put(
                "settings",
                JSONObject().put(
                    "servers",
                    JSONArray().put(
                        JSONObject()
                            .put("address", host)
                            .put("port", port)
                            .put("method", method)
                            .put("password", password)
                    )
                )
            )

        return ParsedServer(
            name = fragment?.let { URLDecoder.decode(it, "UTF-8") }?.ifBlank { null } ?: name,
            country = country,
            protocol = "shadowsocks",
            host = host,
            port = port,
            rawLink = link,
            outbound = outbound
        )
    }

    // ------------------------------------------------------------------
    // Stream settings builder
    // ------------------------------------------------------------------

    private fun buildStreamSettings(network: String, security: String, q: Map<String, String>): JSONObject? {
        val stream = JSONObject()
        val sec = security.lowercase()

        when (sec) {
            "tls" -> {
                val tls = JSONObject()
                    .put("serverName", q["sni"]?.takeIf { it.isNotBlank() } ?: q["host"]?.takeIf { it.isNotBlank() } ?: "")
                    .put("allowInsecure", q["allowInsecure"] == "1")
                q["alpn"]?.takeIf { it.isNotBlank() }?.let {
                    tls.put("alpn", JSONArray(it.split(',').map { a -> a.trim() }.filter { a -> a.isNotEmpty() }))
                }
                q["fp"]?.takeIf { it.isNotBlank() }?.let { tls.put("fingerprint", it) }
                stream.put("security", "tls").put("tlsSettings", tls)
            }
            "reality" -> {
                val reality = JSONObject()
                    .put("serverName", q["sni"]?.takeIf { it.isNotBlank() } ?: "")
                    .put("fingerprint", q["fp"]?.takeIf { it.isNotBlank() } ?: "chrome")
                    .put("publicKey", q["pbk"] ?: "")
                    .put("shortId", q["sid"] ?: "")
                    .put("spiderX", q["spx"] ?: "")
                stream.put("security", "reality").put("realitySettings", reality)
            }
            "xtls" -> { // legacy; treat as tls
                val tls = JSONObject()
                    .put("serverName", q["sni"]?.takeIf { it.isNotBlank() } ?: "")
                    .put("allowInsecure", false)
                stream.put("security", "tls").put("tlsSettings", tls)
            }
            else -> stream.put("security", "none")
        }

        when (network) {
            "ws" -> {
                val ws = JSONObject().put("path", q["path"]?.takeIf { it.isNotBlank() } ?: "/")
                q["host"]?.takeIf { it.isNotBlank() }?.let {
                    ws.put("headers", JSONObject().put("Host", it))
                }
                stream.put("network", "ws").put("wsSettings", ws)
            }
            "grpc" -> {
                val grpc = JSONObject().put(
                    "serviceName",
                    q["serviceName"]?.takeIf { it.isNotBlank() } ?: q["path"]?.takeIf { it.isNotBlank() } ?: ""
                )
                stream.put("network", "grpc").put("grpcSettings", grpc)
            }
            "h2", "http" -> {
                val h2 = JSONObject().put("path", q["path"]?.takeIf { it.isNotBlank() } ?: "/")
                q["host"]?.takeIf { it.isNotBlank() }?.let {
                    h2.put("host", JSONArray(it.split(',').map { a -> a.trim() }.filter { a -> a.isNotEmpty() }))
                }
                stream.put("network", "h2").put("httpSettings", h2)
            }
            "httpupgrade" -> {
                val hu = JSONObject().put("path", q["path"]?.takeIf { it.isNotBlank() } ?: "/")
                q["host"]?.takeIf { it.isNotBlank() }?.let { hu.put("host", it) }
                stream.put("network", "httpupgrade").put("httpupgradeSettings", hu)
            }
            "xhttp", "splithttp" -> {
                val xh = JSONObject().put("path", q["path"]?.takeIf { it.isNotBlank() } ?: "/")
                q["host"]?.takeIf { it.isNotBlank() }?.let { xh.put("host", it) }
                stream.put("network", "xhttp").put("xhttpSettings", xh)
            }
            "tcp", "" -> {
                if (q["headerType"] == "http") {
                    val req = JSONObject()
                        .put("version", "1.1")
                        .put("method", "GET")
                        .put("path", JSONArray(listOf(q["path"]?.takeIf { it.isNotBlank() } ?: "/")))
                    q["host"]?.takeIf { it.isNotBlank() }?.let {
                        req.put("headers", JSONObject().put("Host", JSONArray(it.split(','))))
                    }
                    stream.put("network", "tcp").put(
                        "tcpSettings",
                        JSONObject().put("header", JSONObject().put("type", "http").put("request", req))
                    )
                } else {
                    stream.put("network", "tcp")
                }
            }
            else -> return null // kcp / quic unsupported
        }
        return stream
    }

    // ------------------------------------------------------------------
    // Full xray config
    // ------------------------------------------------------------------

    /**
     * Full xray config.
     *
     * تفاوت‌های سرعتی با نسخهٔ قدیمی (دلیل «کند بودن اپ نسبت به v2rayNG»):
     *  1) ماژول DNS با کش محلی + هِجِ UDP/53 — هر کوئری DNS قبلاً تا سرور می‌رفت
     *     و برمی‌گشت (یک RTT کامل به‌ازای هر دامنهٔ جدید!)؛ الان از کش محلی جواب
     *     می‌گیرد و فقط بار اول از مسیر پروکسی resolve می‌شود.
     *  2) queryStrategy=UseIPv4 — هیچ AAAA به اپ‌ها نمی‌رسد؛ پس هیچ سایتی روی
     *     IPv6 خرابِ مسیر گیر نمی‌کند و timeout نمی‌خورد (علت اصلی «کند باز شدن»).
     *  3) بستن QUIC (UDP/443) — مرورگر فوراً به HTTP/2 روی TCP برمی‌گردد که از
     *     دل تونل TCP بسیار سریع‌تر است؛ QUIC روی UDP-over-TCP همیشه سرکوب می‌شود.
     *
     * نسخهٔ ۲ — قابل انتخاب از تنظیمات:
     *  - stealth="strict": تیکه‌تیکه‌کردن TLS ClientHello (fragment) برای رد شدن
     *    از فیلترینگ سنگین — فقط روی TLS/Reality اعمال می‌شود و روی مسیرهای
     *    عادی هیچ تاثیری ندارد.
     *  - dnsMode: auto / cf (DoH کلودفلر) / google (DoH گوگل) / custom (IP دلخواه)
     *    — همیشه یک سرور سادهٔ پشتیبان هم در لیست هست تا اگر DoH از مسیر تونل
     *    جواب نداد، resolve هیچ‌وقت گیر نکند.
     */
    fun buildConfigJson(
        server: ParsedServer,
        blockQuic: Boolean = true,
        stealth: String = "normal",
        dnsMode: String = "auto",
        dnsCustom: String = "",
    ): String {
        val socksIn = JSONObject()
            .put("tag", "socks-in")
            .put("listen", "127.0.0.1")
            .put("port", SOCKS_PORT)
            .put("protocol", "socks")
            .put("settings", JSONObject().put("auth", "noauth").put("udp", true))
            .put(
                "sniffing",
                JSONObject().put("enabled", true).put("destOverride", JSONArray(listOf("http", "tls")))
            )

        val proxy = server.outbound.put("tag", "proxy")
        // بهینه‌سازی سرعت: حذف Nagle (tcpNoDelay) و TCP Fast Open در صورت پشتیبانی سرور —
        // دست‌دادن (handshake) سریع‌تر و تأخیر کمتر برای وب‌سوکت/CDN
        val stream = proxy.optJSONObject("streamSettings") ?: JSONObject()
        stream.put(
            "sockopt",
            JSONObject().put("tcpFastOpen", true).put("tcpNoDelay", true)
        )
        // حالت سخت‌گیر ضد-فیلترینگ: تیکه‌تیکه‌کردن TLS ClientHello
        if (stealth == "strict") {
            val sec = stream.optString("security")
            if (sec == "tls" || sec == "reality") {
                stream.put(
                    "fragment",
                    JSONObject()
                        .put("packets", "tlshello")
                        .put("length", "100-200")
                        .put("interval", "10-20")
                )
            }
        }
        proxy.put("streamSettings", stream)

        val direct = JSONObject().put("tag", "direct").put("protocol", "freedom").put("settings", JSONObject())
        val block = JSONObject().put("tag", "block").put("protocol", "blackhole").put("settings", JSONObject())
        // خروجی DNS: کوئری‌های هِج‌شدهٔ پورت ۵۳ را از ماژول DNS جواب می‌دهد
        val dnsOut = JSONObject().put("tag", "dns-out").put("protocol", "dns").put("settings", JSONObject())

        // ماژول DNS — سرورهای DNS از مسیر پروکسی resolve می‌شوند (دیدِ لوکیشن سرور) و جواب کش می‌شود.
        // آدرس‌های ساده: بدون outboundTag هم کوئری از اولین خروجی (proxy) می‌رود — سازگار با هر نسخهٔ Xray.
        // همیشه یک سرور سادهٔ پشتیبان آخر لیست هست تا resolve هیچ‌وقت گیر نکند.
        val dnsServers = when (dnsMode) {
            "cf" -> JSONArray().put("https://1.1.1.1/dns-query").put("1.1.1.1").put("8.8.8.8")
            "google" -> JSONArray().put("https://8.8.8.8/dns-query").put("8.8.8.8").put("1.1.1.1")
            "custom" -> {
                val arr = JSONArray()
                val ip = dnsCustom.trim()
                if (ip.isNotEmpty()) arr.put(ip)
                arr.put("8.8.8.8").put("1.1.1.1")
                arr
            }
            else -> JSONArray().put("8.8.8.8").put("1.1.1.1")
        }
        val dns = JSONObject()
            .put("queryStrategy", "UseIPv4")
            .put("disableCache", false)
            .put("servers", dnsServers)

        val rules = JSONArray()
            // ۱) هِج DNS: همهٔ کوئری‌های UDP/53 از ماژول DNS محلی جواب می‌گیرند
            .put(
                JSONObject().put("type", "field")
                    .put("inboundTag", JSONArray(listOf("socks-in")))
                    .put("port", 53).put("network", "udp")
                    .put("outboundTag", "dns-out")
            )
        if (blockQuic) {
            // ۲) بستن QUIC (UDP/443): مرورگر بلافاصله روی HTTP/2-TCP ادامه می‌دهد
            rules.put(
                JSONObject().put("type", "field")
                    .put("port", 443).put("network", "udp")
                    .put("outboundTag", "block")
            )
        }
        // ۳) بقیهٔ ترافیک → پروکسی
        rules.put(
            JSONObject().put("type", "field").put("port", "0-65535").put("outboundTag", "proxy")
        )

        val root = JSONObject()
            .put("log", JSONObject().put("loglevel", "warning"))
            .put("dns", dns)
            .put("inbounds", JSONArray().put(socksIn))
            .put("outbounds", JSONArray().put(proxy).put(direct).put(block).put(dnsOut))
            .put("routing", JSONObject().put("domainStrategy", "AsIs").put("rules", rules))

        return root.toString()
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    private fun splitFragment(rest: String): Pair<String, String?> {
        val i = rest.indexOf('#')
        return if (i >= 0) rest.substring(0, i) to rest.substring(i + 1) else rest to null
    }

    private fun parseQuery(q: String): Map<String, String> {
        if (q.isBlank()) return emptyMap()
        return q.split('&').mapNotNull { p ->
            val i = p.indexOf('=')
            if (i <= 0) null
            else try {
                URLDecoder.decode(p.substring(0, i), "UTF-8") to
                    URLDecoder.decode(p.substring(i + 1), "UTF-8")
            } catch (t: Throwable) {
                null
            }
        }.toMap()
    }

    /** Bracket-aware host:port splitter (handles IPv6). */
    private fun splitHostPort(hp: String): Pair<String, Int>? {
        val s = hp.trim()
        if (s.startsWith("[")) {
            val close = s.indexOf(']')
            if (close < 0) return null
            val host = s.substring(1, close)
            val portPart = s.substring(close + 1).removePrefix(":")
            val port = portPart.toIntOrNull() ?: return null
            return host to port
        }
        val i = s.lastIndexOf(':')
        if (i <= 0) return null
        val port = s.substring(i + 1).toIntOrNull() ?: return null
        return s.substring(0, i) to port
    }

    /** Tolerant base64: url-safe or standard, with or without padding. */
    private fun b64Decode(input: String): ByteArray {
        var s = input.trim().replace('-', '+').replace('_', '/').replace("\n", "").replace("\r", "")
        val pad = (4 - s.length % 4) % 4
        s += "=".repeat(pad)
        return try {
            Base64.decode(s, Base64.DEFAULT)
        } catch (t: Throwable) {
            Base64.decode(s, Base64.URL_SAFE)
        }
    }
}
