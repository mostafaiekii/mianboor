package com.mianboor.vpn

import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * پل پروکسی MTProto داخل اپ (نسخهٔ ۲٫۳) — «اتصال مثل کانفیگ، بدون تلگرام».
 *
 * چرا این کلاس وجود دارد؟
 *   نسخه‌های قبلی برای پروکسی‌های mtproto لینک tg://proxy را به تلگرام می‌فرستادند —
 *   یعنی پروکسی برای همیشه در لیست پروکسی‌های تلگرام کاربر ذخیره می‌شد و بعد از
 *   پایان اشتراک هم دسترسی می‌ماند. حالا اپ خودش کلاینت MTProto-پروکسی است:
 *
 *       تلگرام ← TUN ← xray(socks) ← این پل (socks روی لوکال‌هاست) ← پروکسی MTProto ← دیتاسنتر
 *
 *   هیچ چیزی به تلگرام کاربر اضافه نمی‌شود؛ مدیر هر لحظه می‌تواند پروکسی را از پنل
 *   حذف کند و دسترسی کامل قطع می‌شود.
 *
 * پروتکل (عین مرجع mtg / obfuscator.c):
 *  ۱) فریم ۶۴ بایتی obfuscated2:
 *       [0..8) نویز | [8..40) کلید | [40..56) IV | [56..60) نوع اتصال | [60..62) DC (LE) | [62..64) نویز
 *     روی سیم: ناحیهٔ [8..56) خام می‌ماند؛ بقیهٔ بایت‌ها با AES-256-CTR رمز می‌شوند
 *     (کلید ارسال = SHA256(frame[8..40) ‖ secret)، IV = frame[40..56)) و جریانِ
 *     بعدی از آفست ۶۴ همان CTR ادامه می‌یابد. کلیدِ دریافت = ناحیهٔ REVERSE شده.
 *  ۲) سکرت دارای دامنه (first byte 0xee/0xdd + کلید ۱۶ بایتی + دامنه؛ hex یا base64url)
 *     → FakeTLS: ClientHello با SNI دامنهٔ سکرت و
 *     random = HMAC-SHA256(key, hello با random صفر) ⊕ (۲۸ بایت صفر + timestamp LE)؛
 *     ServerHello(0x16) + ChangeCipherSpec(0x14) + یک AppData نویز خوانده و رد می‌شوند؛
 *     ادامهٔ ترافیک دوطرفه داخل رکوردهای ApplicationData (0x17، نسخهٔ 03 03) می‌رود.
 *  ۳) سکرت بدون دامنه → حالت خام (نوع اتصال 0xEEEEEEEE، بدون TLS).
 *  ۴) شمارهٔ DC از IP مقصد (دیتاسنترهای شناخته‌شدهٔ تلگرام) درمی‌آید؛ ناشناخته = DC2.
 *
 * این پل یک SOCKS5 سادهٔ TCP-only روی 127.0.0.1:PORT است — UDP/BIND رد می‌شود
 * (DNS از ماژول DNS خودِ xray جواب می‌گیرد و مسیر UDP اصلاً به اینجا نمی‌رسد).
 */
object MtProxyBridge {

    /** پورت پل روی لوکال‌هاست — outbound سمت xray به همین‌جا وصل می‌شود. */
    const val PORT = 10907

    /** پارامترهای پروکسی مقصد — از لینک tg://proxy پارس شده. */
    data class Params(val host: String, val port: Int, val secret: String)

    private val running = AtomicBoolean(false)

    @Volatile private var server: ServerSocket? = null
    @Volatile private var pool: ExecutorService? = null
    @Volatile private var params: Params? = null
    private val conns = ConcurrentHashMap<Socket, Boolean>()

    fun isRunning(): Boolean = running.get() && server != null && !server!!.isClosed

    /** پل را روی لوکال‌هاست بالا می‌آورد؛ اگر با همین پارامترها روشن است، دست نمی‌زند. */
    @Synchronized
    fun start(p: Params): Boolean = try {
        if (isRunning() && params == p) {
            true
        } else {
            stopInternal()
            val ss = ServerSocket()
            ss.bind(InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT), 64)
            server = ss
            params = p
            running.set(true)
            val exec = Executors.newCachedThreadPool { r ->
                Thread(r, "MtProxyBridge").apply { isDaemon = true }
            }
            pool = exec
            Thread({
                while (running.get()) {
                    val client = try {
                        ss.accept()
                    } catch (t: Throwable) {
                        break
                    }
                    exec.execute { handleClient(client, p) }
                }
            }, "MtProxyBridge-Accept").apply {
                isDaemon = true
                start()
            }
            true
        }
    } catch (t: Throwable) {
        false
    }

    @Synchronized
    fun stop() {
        stopInternal()
    }

    private fun stopInternal() {
        running.set(false)
        runCatching { server?.close() }
        server = null
        conns.keys.forEach { runCatching { it.close() } }
        conns.clear()
        runCatching { pool?.shutdownNow() }
        pool = null
        params = null
    }

    // ------------------------------------------------------------------
    // SOCKS5 سمت لوکال (xray وصل می‌شود)
    // ------------------------------------------------------------------

    private fun handleClient(client: Socket, p: Params) {
        conns[client] = true
        var upstream: Socket? = null
        try {
            client.tcpNoDelay = true
            val ins = DataInputStream(BufferedInputStream(client.getInputStream(), 32 * 1024))
            val outs = client.getOutputStream()

            // ── greeting: 05 nmethods methods… → 05 00 ──
            if (ins.readByte().toInt() != 5) return
            val nmethods = ins.readByte().toInt() and 0xff
            if (nmethods <= 0) return
            ins.readFully(ByteArray(nmethods))
            outs.write(byteArrayOf(5, 0))

            // ── request: 05 cmd 00 atyp addr… port ──
            val head = ByteArray(4)
            ins.readFully(head)
            val cmd = head[1].toInt() and 0xff
            val atyp = head[3].toInt() and 0xff
            val host: String = when (atyp) {
                1 -> InetAddress.getByAddress(ins.readFully(4)).hostAddress ?: return
                4 -> InetAddress.getByAddress(ins.readFully(16)).hostAddress ?: return
                3 -> {
                    val len = ins.readByte().toInt() and 0xff
                    String(ins.readFully(len), Charsets.US_ASCII)
                }
                else -> { socksReply(outs, 0x08); return }
            }
            val portHi = ins.readByte().toInt() and 0xff
            val portLo = ins.readByte().toInt() and 0xff
            val port = (portHi shl 8) or portLo

            if (cmd != 1) { socksReply(outs, 0x07); return } // فقط CONNECT

            val dc = dcOf(host)

            // ── اتصال به پروکسی MTProto + هندشیک واقعی ──
            val proxy = Socket()
            proxy.tcpNoDelay = true
            proxy.connect(InetSocketAddress(p.host, p.port), 10_000)
            upstream = proxy
            conns[proxy] = true
            proxy.soTimeout = 30_000
            val pin = proxy.getInputStream()
            val pout = proxy.getOutputStream()
            val session = Session(p, dc, pin, pout)
            session.handshake()
            proxy.soTimeout = 0

            // ── جواب موفق SOCKS ──
            outs.write(byteArrayOf(5, 0, 0, 1, 0, 0, 0, 0, 0, 0))
            outs.flush()

            // ── پمپ دوطرفه تا قطع ──
            val exec = pool ?: return
            val down = exec.submit {
                runCatching { session.pumpDownstream(outs) }
                runCatching { client.close() }
                runCatching { proxy.close() }
            }
            runCatching { session.pumpUpstream(ins, pout) }
            runCatching { proxy.shutdownOutput() }
            runCatching { down.get(3, TimeUnit.SECONDS) }
        } catch (t: Throwable) {
            // هر خطا = بستن هر دو سمت
        } finally {
            conns.remove(client)
            runCatching { client.close() }
            upstream?.let {
                conns.remove(it)
                runCatching { it.close() }
            }
        }
    }

    private fun socksReply(outs: OutputStream, code: Int) {
        runCatching { outs.write(byteArrayOf(5, code.toByte(), 0, 1, 0, 0, 0, 0, 0, 0)) }
    }

    private fun DataInputStream.readFully(n: Int): ByteArray =
        ByteArray(n).also { readFully(it) }

    // ------------------------------------------------------------------
    // نگاشت IP → شمارهٔ دیتاسنتر تلگرام
    // ------------------------------------------------------------------

    private val dcAddresses: Map<String, Int> = listOf(
        "149.154.175.53" to 1,
        "149.154.167.51" to 2,
        "149.154.175.100" to 3,
        "149.154.167.91" to 4,
        "91.108.56.130" to 5,
        "2001:b28:f23d:f001::a" to 1,
        "2001:67c:4e8:f002::a" to 2,
        "2001:b28:f23d:f003::a" to 3,
        "2001:67c:4e8:f004::a" to 4,
        "2001:b28:f23f:f005::a" to 5,
    ).mapNotNull { (ip, dc) ->
        runCatching { InetAddress.getByName(ip).hostAddress to dc }.getOrNull()
    }.toMap()

    private fun dcOf(host: String): Int = try {
        dcAddresses[InetAddress.getByName(host).hostAddress] ?: 2
    } catch (t: Throwable) {
        2
    }

    // ------------------------------------------------------------------
    // سشن MTProto — هندشیک + پمپ رمزی
    // ------------------------------------------------------------------

    private class Session(
        p: Params,
        private val dc: Int,
        private val proxyIn: InputStream,
        private val proxyOut: OutputStream,
    ) {
        private val secretKey: ByteArray
        private val fakeTlsHost: String?

        private val sendCipher: Cipher
        private val recvCipher: Cipher
        private val wireFrame: ByteArray

        init {
            val (key, host) = parseSecret(p.secret)
                ?: throw IOException("سکرت پروکسی نامعتبر است")
            secretKey = key
            fakeTlsHost = host
            val rng = SecureRandom()

            // ── فریم ۶۴ بایتی obfuscated2 ──
            val frame = ByteArray(64)
            while (true) {
                rng.nextBytes(frame)
                if (frame[0] == 0xef.toByte()) continue // هدر abridged
                val le32 = (frame[0].toInt() and 0xff) or
                    ((frame[1].toInt() and 0xff) shl 8) or
                    ((frame[2].toInt() and 0xff) shl 16) or
                    ((frame[3].toInt() and 0xff) shl 24)
                if (le32 == 0x44414548 || // HEAD
                    le32 == 0x54534f50 || // POST
                    le32 == 0x20544547 || // GET␣
                    le32 == 0x4954504f || // OPTI
                    le32 == 0x02010316 || // ؟؟
                    le32 == 0xdddddddd.toInt() || // padded intermediate
                    le32 == 0xeeeeeeee.toInt()    // intermediate
                ) continue
                if (frame[4].toInt() == 0 && frame[5].toInt() == 0 &&
                    frame[6].toInt() == 0 && frame[7].toInt() == 0
                ) continue
                break
            }
            val ct = if (fakeTlsHost != null) 0xdd else 0xee
            frame[56] = ct.toByte(); frame[57] = ct.toByte()
            frame[58] = ct.toByte(); frame[59] = ct.toByte()
            frame[60] = (dc and 0xff).toByte()
            frame[61] = ((dc shr 8) and 0xff).toByte()

            // کلید/IV ارسال و دریافت (دریافت = معکوس‌شدهٔ ناحیهٔ [8..56))
            val sendKey = sha256(frame.copyOfRange(8, 40) + secretKey)
            val sendIv = frame.copyOfRange(40, 56)
            val rev = frame.copyOfRange(8, 56).reversedArray()
            val recvKey = sha256(rev.copyOfRange(0, 32) + secretKey)
            val recvIv = rev.copyOfRange(32, 48)

            sendCipher = Cipher.getInstance("AES/CTR/NoPadding")
            sendCipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(sendKey, "AES"), IvParameterSpec(sendIv))
            recvCipher = Cipher.getInstance("AES/CTR/NoPadding")
            recvCipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(recvKey, "AES"), IvParameterSpec(recvIv))

            // روی سیم: کل فریم با CTR رمز می‌شود؛ بعد ناحیهٔ کلید/IV خام برمی‌گردد.
            // نکتهٔ حیاتی: update — نه doFinal! doFinal کایفر را reset می‌کند و
            // keystream جریان بعدی از صفر شروع می‌شود (خرابی کامل ترافیک).
            val wire = sendCipher.update(frame.copyOf())
            System.arraycopy(frame, 8, wire, 8, 48)
            wireFrame = wire
        }

        /** هندشیک کامل با پروکسی — بعد از این، پمپ آماده است. */
        fun handshake() {
            if (fakeTlsHost != null) {
                proxyOut.write(clientHello(fakeTlsHost))
                proxyOut.flush()
                // ServerHello(0x16) + ChangeCipherSpec(0x14) + نویز — تا اولین AppData رد می‌کنیم
                var seenAppData = false
                while (!seenAppData) {
                    val (type, _) = readTlsRecord(proxyIn)
                    if (type == 0x17) seenAppData = true
                }
            }
            // فریم obfuscated2 — در حالت FakeTLS داخل اولین رکورد AppData می‌رود
            if (fakeTlsHost != null) {
                writeTlsRecord(proxyOut, wireFrame)
            } else {
                proxyOut.write(wireFrame)
            }
            proxyOut.flush()
        }

        fun pumpUpstream(localIn: InputStream, proxyOut: OutputStream) {
            // سقف payload رکورد TLS = 16379 بایت (16384 منهای هدر)
            val buf = ByteArray(16379)
            while (true) {
                val n = localIn.read(buf)
                if (n < 0) break
                if (n == 0) continue
                val data = sendCipher.update(buf, 0, n)
                if (fakeTlsHost != null) writeTlsRecord(proxyOut, data) else proxyOut.write(data)
                proxyOut.flush()
            }
        }

        fun pumpDownstream(localOut: OutputStream) {
            if (fakeTlsHost != null) {
                while (true) {
                    val (type, payload) = readTlsRecord(proxyIn)
                    if (type != 0x17) continue // رکورد غیر-AppData رد می‌شود
                    val dec = recvCipher.update(payload)
                    if (dec.isNotEmpty()) {
                        localOut.write(dec)
                        localOut.flush()
                    }
                }
            } else {
                val buf = ByteArray(16 * 1024)
                while (true) {
                    val n = proxyIn.read(buf)
                    if (n < 0) break
                    if (n == 0) continue
                    val dec = recvCipher.update(buf, 0, n)
                    if (dec.isNotEmpty()) {
                        localOut.write(dec)
                        localOut.flush()
                    }
                }
            }
        }

        // ── FakeTLS ClientHello ──

        private fun clientHello(host: String): ByteArray {
            val rng = SecureRandom()
            val hostBytes = host.toByteArray(Charsets.US_ASCII)

            val suites = byteArrayOf(
                0x13, 0x01, 0x13, 0x02, 0x13, 0x03, // TLS 1.3
                0xc0.toByte(), 0x2b, 0xc0.toByte(), 0x2f, 0xc0.toByte(), 0x2c, 0xc0.toByte(), 0x30,
                0xcc.toByte(), 0xa9.toByte(), 0xcc.toByte(), 0xa8.toByte(), 0xc0.toByte(), 0x13, 0xc0.toByte(), 0x14,
                0x00, 0x9c.toByte(), 0x00, 0x9d.toByte(), 0x00, 0x2f, 0x00, 0x35,
            )

            // extensions — SNI اجباری است؛ بقیه برای واقعی‌نمایی
            val ext = ByteArrayOutputStream()
            // SNI (0x0000): [listLen16][type=0][hostLen16][host]
            val sniListLen = 3 + hostBytes.size
            ext.write(0x00); ext.write(0x00)
            ext.write(0x00); ext.write(sniListLen + 2) // ext_data = listLen16 + list
            ext.write((sniListLen shr 8) and 0xff); ext.write(sniListLen and 0xff)
            ext.write(0x00)
            ext.write((hostBytes.size shr 8) and 0xff); ext.write(hostBytes.size and 0xff)
            ext.write(hostBytes)
            // supported_groups (0x000a): x25519, secp256r1, secp384r1
            ext.write(0x00); ext.write(0x0a)
            ext.write(0x00); ext.write(0x08)
            ext.write(0x00); ext.write(0x06)
            ext.write(0x00); ext.write(0x1d); ext.write(0x00); ext.write(0x17); ext.write(0x00); ext.write(0x18)
            // signature_algorithms (0x000d)
            val sigAlgs = byteArrayOf(0x04, 0x03, 0x08, 0x04, 0x04, 0x01, 0x08, 0x05, 0x05, 0x01, 0x08, 0x06)
            ext.write(0x00); ext.write(0x0d)
            ext.write(0x00); ext.write(sigAlgs.size + 2)
            ext.write((sigAlgs.size shr 8) and 0xff); ext.write(sigAlgs.size and 0xff)
            ext.write(sigAlgs)
            // supported_versions (0x002b): TLS1.3 + TLS1.2
            ext.write(0x00); ext.write(0x2b)
            ext.write(0x00); ext.write(0x05)
            ext.write(0x04) // ۴ بایت لیست
            ext.write(0x03); ext.write(0x04)
            ext.write(0x03); ext.write(0x03)
            val extBytes = ext.toByteArray()

            // body: version + random(صفر) + sid + suites + comp + extensions
            val body = ByteArrayOutputStream()
            body.write(0x03); body.write(0x03) // client version TLS1.2
            body.write(ByteArray(32)) // random — فعلاً صفر
            body.write(0x20) // session id len = 32
            val sid = ByteArray(32); rng.nextBytes(sid)
            body.write(sid)
            body.write(0x00); body.write(suites.size)
            body.write(suites)
            body.write(0x00); body.write(0x01)
            body.write(0x00)
            body.write((extBytes.size shr 8) and 0xff); body.write(extBytes.size and 0xff)
            body.write(extBytes)
            val bodyBytes = body.toByteArray()

            // handshake: 01 + len24 + body
            val handshake = ByteArrayOutputStream()
            handshake.write(0x01)
            handshake.write(0x00)
            handshake.write((bodyBytes.size shr 8) and 0xff)
            handshake.write(bodyBytes.size and 0xff)
            handshake.write(bodyBytes)
            val hsBytes = handshake.toByteArray()

            // record: 16 03 01 + len16 + handshake (نسخهٔ رکورد = 03 01 — سمت سرور سخت‌گیرانه چک می‌شود)
            val record = ByteArrayOutputStream()
            record.write(0x16)
            record.write(0x03); record.write(0x01)
            record.write((hsBytes.size shr 8) and 0xff); record.write(hsBytes.size and 0xff)
            record.write(hsBytes)
            val recBytes = record.toByteArray()

            // random = HMAC-SHA256(secret, record با random صفر) ⊕ (۲۸ صفر + timestamp LE)
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(secretKey, "HmacSHA256"))
            val digest = mac.doFinal(recBytes)
            val ro = 11 // record(5) + handshakeHeader(4) + version(2) = آفست random
            System.arraycopy(digest, 0, recBytes, ro, 28)
            val ts = (System.currentTimeMillis() / 1000L).toInt()
            for (j in 0 until 4) {
                val b = (ts shr (8 * j)) and 0xff
                recBytes[ro + 28 + j] = (digest[28 + j].toInt() xor b).toByte()
            }
            return recBytes
        }

        // ── TLS record framing (قاب فقط — رمز واقعی همان CTR بالا است) ──

        private fun writeTlsRecord(out: OutputStream, payload: ByteArray) {
            out.write(
                byteArrayOf(
                    0x17, 0x03, 0x03,
                    ((payload.size shr 8) and 0xff).toByte(),
                    (payload.size and 0xff).toByte(),
                )
            )
            out.write(payload)
        }

        private fun readTlsRecord(ins: InputStream): Pair<Int, ByteArray> {
            val head = ByteArray(5)
            var off = 0
            while (off < 5) {
                val n = ins.read(head, off, 5 - off)
                if (n < 0) throw IOException("TLS record cut")
                off += n
            }
            val type = head[0].toInt() and 0xff
            val len = ((head[3].toInt() and 0xff) shl 8) or (head[4].toInt() and 0xff)
            if (len <= 0 || len > 18_432) throw IOException("bad TLS record len $len")
            val payload = ByteArray(len)
            var o = 0
            while (o < len) {
                val n = ins.read(payload, o, len - o)
                if (n < 0) throw IOException("TLS payload cut")
                o += n
            }
            return type to payload
        }
    }

    // ------------------------------------------------------------------
    // پارس سکرت — [mode][key 16B][host] به‌صورت hex یا base64url
    // ------------------------------------------------------------------

    /**
     * خروجی: (کلید ۱۶ بایتی، دامنه یا null).
     *  - سکرت با دامنه (بایت اول 0xee/0xdd) → FakeTLS با SNI همان دامنه
     *  - سکرت ۱۶ بایتی بدون دامنه → حالت خام
     */
    fun parseSecret(raw: String): Pair<ByteArray, String?>? {
        val s = raw.trim()
        if (s.isEmpty()) return null
        val decoded: ByteArray = runCatching { hexDecode(s) }.getOrElse {
            runCatching { b64UrlDecode(s) }.getOrNull() ?: return null
        }
        if (decoded.isEmpty()) return null
        val mode = decoded[0].toInt() and 0xff
        return if ((mode == 0xee || mode == 0xdd) && decoded.size >= 17) {
            val key = decoded.copyOfRange(1, 17)
            if (decoded.size > 17) {
                val host = String(decoded.copyOfRange(17, decoded.size), Charsets.US_ASCII).trim()
                if (host.isNotEmpty() && host.all { it.code in 0x21..0x7e }) key to host else key to null
            } else {
                key to null
            }
        } else {
            decoded to null
        }
    }

    private fun sha256(data: ByteArray): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(data)

    private fun hexDecode(s: String): ByteArray {
        if (s.length % 2 != 0 || !s.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }) {
            throw IllegalArgumentException("not hex")
        }
        return ByteArray(s.length / 2) { i ->
            ((Character.digit(s[2 * i], 16) shl 4) or Character.digit(s[2 * i + 1], 16)).toByte()
        }
    }

    private fun b64UrlDecode(s: String): ByteArray {
        val b64 = s.replace('-', '+').replace('_', '/')
        val pad = (4 - b64.length % 4) % 4
        return android.util.Base64.decode(b64 + "=".repeat(pad), android.util.Base64.DEFAULT)
    }
}
