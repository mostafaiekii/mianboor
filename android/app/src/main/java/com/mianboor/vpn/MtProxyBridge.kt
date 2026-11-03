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
 * پل پروکسی MTProto داخل اپ (نسخهٔ ۲٫۴) — مبدل واقعی پروتکل.
 *
 * چرا این کلاس وجود دارد؟
 *   نسخه‌های قبلی برای پروکسی‌های mtproto لینک tg://proxy را به تلگرام می‌فرستادند —
 *   یعنی پروکسی برای همیشه در لیست پروکسی‌های تلگرام کاربر ذخیره می‌شد و بعد از
 *   پایان اشتراک هم دسترسی می‌ماند. حالا اپ خودش کلاینت MTProto-پروکسی است:
 *
 *       تلگرام ← TUN ← xray(socks) ← این پل (socks روی لوکال‌هاست) ← پروکسی MTProto ← دیتاسنتر
 *
 * ── چرا نسخهٔ ۲٫۳ کار نمی‌کرد (باگ ریشه‌ای) ──
 *   پروکسی MTProto «تونل TCP خام» نیست! بعد از هندشیکِ ۶۴ بایتی، پروتکل انتظار
 *   «پاکت‌های قاب‌شدهٔ MTProto» را دارد (intermediate یا padded-intermediate —
 *   مرجع: mtg فقط 0xDDDDDDDD را قبول می‌کند و بعدش رِلی خام به DC است).
 *   نسخهٔ ۲٫۳ بایت‌های خام جریان تلگرام↔دیتاسنتر (که خودش یک جریان obfuscated2
 *   کامل با هندشیک و قاب‌بندی abridged است) را عیناً داخل سشن پروکسی پمپ می‌کرد؛
 *   پروکسی این بایت‌ها را به‌عنوان قاب MTProto می‌خواند → طول نامعتبر → اتصال بی‌صدا
 *   بسته می‌شد. نتیجه: «متصل» ولی تلگرام هیچی نمی‌آمد.
 *
 * ── معماری نسخهٔ ۲٫۴ (مبدل سه‌لایه) ──
 *   سمت تلگرام (بدون سکرت — مرجع: tgnet خود تلگرام + tdlib):
 *     • تلگرام اندروید برای اتصال به DC همیشه obfuscated2 استفاده می‌کند:
 *       فریم ۶۴ بایتی؛ [56..60)=0xEFEFEFEF (abridged)؛ کلید AES = بایت‌های خام
 *       [8..40) — بدون SHA256 و بدون سکرت — و IV = [40..56).
 *     • بعدش پاکت‌های abridged: [len/4][payload] یا [0x7f][len/4 سه‌بایتی][payload].
 *   سمت پروکسی (با سکرت — مرجع: mtg v2):
 *     • FakeTLS: ClientHello (طول دقیقاً ۵۱۲) + ردِ ServerHello/CCS/نویز؛
 *     • فریم ۶۴ بایتی با ct=0xDDDDDDDD و شمارهٔ DC؛ کلید = SHA256([8..40)+سکرت)؛
 *     • ترافیک دوطرفه داخل رکوردهای TLS-AppData، درونش padded-intermediate:
 *       [len32LE][payload]؛ توکن quick-ack سرور = بدنه با 0xFFFFFFFF.
 *   پل: قاب‌بندی تلگرام را باز می‌کند، بدنهٔ پیام MTProto را بی‌دست‌می‌زند، و با
 *   قاب‌بندی پروکسی دوباره می‌بندد (و برعکس). بدنهٔ پیام هرگز رمزگشایی نمی‌شود —
 *   رمزنگاری انتها-به-انتها با auth key تلگرام حفظ می‌ماند.
 *
 * این پل یک SOCKS5 سادهٔ TCP-only روی 127.0.0.1:PORT است — UDP/BIND رد می‌شود
 * (تماس صوتی از مسیر MTProto-پروکسی اصلاً پشتیبانی نمی‌شود؛ مثل خود تلگرام).
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
            val buffered = BufferedInputStream(client.getInputStream(), 32 * 1024)
            val ins = DataInputStream(buffered)
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

            // ── اتصال به پروکسی MTProto + هندشیک FakeTLS/obfuscated2 ──
            val proxy = Socket()
            proxy.tcpNoDelay = true
            proxy.connect(InetSocketAddress(p.host, p.port), 10_000)
            upstream = proxy
            conns[proxy] = true
            proxy.soTimeout = 30_000
            val session = ProxySession(
                p, dc,
                proxy.getInputStream(), proxy.getOutputStream(),
            )
            session.handshake()
            proxy.soTimeout = 0

            // ── جواب موفق SOCKS — باید قبل از خواندنِ جریان تلگرام باشد، وگرنه
            //    xray منتظر جواب می‌ماند و جریان هرگز شروع نمی‌شود (بن‌بست!) ──
            outs.write(byteArrayOf(5, 0, 0, 1, 0, 0, 0, 0, 0, 0))
            outs.flush()

            // ── سمت تلگرام: تشخیص ترنسپورت (obfuscated2 بدون سکرت) ──
            // اگر هندشیک تلگرام شناخته نشد، همین‌جا اتصال بسته می‌شود و تلگرام
            // با ترنسپورت دیگری دوباره تلاش می‌کند.
            val tg = TgSide(ins, outs)
            tg.detect()

            // ── پمپ دوطرفه با مبدل قاب‌بندی ──
            val exec = pool ?: return
            val down = exec.submit {
                runCatching {
                    while (true) {
                        val body = session.recvBody() ?: break
                        tg.writeBody(body)
                    }
                }
                runCatching { client.close() }
                runCatching { proxy.close() }
            }
            runCatching {
                while (true) {
                    val up = tg.readBody() ?: break
                    session.sendBody(up.first, up.second)
                }
            }
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

    /**
     * نگاشت مقصد → شمارهٔ DC — فقط برای IP لفظی.
     * برای دامنه‌ها هرگز DNS resolve نمی‌کنیم: در ایران DNS مسدود/مسوم است و
     * resolve فقط هنگ می‌کند؛ مقصد دامنه = DC2 پیش‌فرض.
     */
    private fun dcOf(host: String): Int {
        val ip = host.trim()
        if (ip.isEmpty()) return 2
        val literal: String? = if (ip.contains(':')) {
            // IPv6 لفظی — بدون DNS
            runCatching { InetAddress.getByName(ip).hostAddress }.getOrNull()
        } else {
            // فقط رقم و نقطه = IPv4 لفظی؛ دامنه → بدون resolve
            if (ip.contains('.') && ip.all { it.isDigit() || it == '.' }) ip else null
        }
        return dcAddresses[literal] ?: 2
    }

    // ------------------------------------------------------------------
    // کمکی‌های مشترک
    // ------------------------------------------------------------------

    private fun sha256(data: ByteArray): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(data)

    private fun ctrCipher(key: ByteArray, iv: ByteArray, mode: Int): Cipher =
        Cipher.getInstance("AES/CTR/NoPadding").apply {
            init(mode, SecretKeySpec(key, "AES"), IvParameterSpec(iv))
        }

    private fun le32(b: ByteArray, off: Int): Int =
        (b[off].toInt() and 0xff) or
            ((b[off + 1].toInt() and 0xff) shl 8) or
            ((b[off + 2].toInt() and 0xff) shl 16) or
            ((b[off + 3].toInt() and 0xff) shl 24)

    private fun putLe32(b: ByteArray, off: Int, v: Int) {
        b[off] = (v and 0xff).toByte()
        b[off + 1] = ((v shr 8) and 0xff).toByte()
        b[off + 2] = ((v shr 16) and 0xff).toByte()
        b[off + 3] = ((v shr 24) and 0xff).toByte()
    }

    /** سقف منطقی پاکت MTProto — تلگرام خودش پاکت‌های >2MB را نمی‌پذیرد. */
    private const val MAX_BODY = 2 * 1024 * 1024 + 16 * 1024

    private fun requireBodySize(n: Int) {
        if (n <= 0 || n > MAX_BODY) throw IOException("طول پاکت نامعتبر: $n")
    }

    // ==================================================================
    // سمت پروکسی — FakeTLS + obfuscated2(سکرت) + padded-intermediate
    // (عین مرجع mtg v2)
    // ==================================================================

    private class ProxySession(
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

        /** بافر تجمعی قاب‌های padded-intermediate که بین رکوردهای TLS شکسته‌اند. */
        private var buf = ByteArray(16 * 1024)
        private var bufLen = 0

        init {
            val (key, host) = parseSecret(p.secret)
                ?: throw IOException("سکرت پروکسی نامعتبر است")
            secretKey = key
            fakeTlsHost = host
            val rng = SecureRandom()

            // ── فریم ۶۴ بایتی obfuscated2 (عین mtg generateHandshake) ──
            val frame = ByteArray(64)
            while (true) {
                rng.nextBytes(frame)
                if (frame[0] == 0xef.toByte()) continue // هدر abridged
                val le0 = le32(frame, 0)
                if (le0 == 0x44414548 || // HEAD
                    le0 == 0x54534f50 || // POST
                    le0 == 0x20544547 || // GET␣
                    le0 == 0x4954504f || // OPTI
                    le0 == 0x02010316 || // ؟؟
                    le0 == 0xdddddddd.toInt() || // padded intermediate
                    le0 == 0xeeeeeeee.toInt()    // intermediate
                ) continue
                if (frame[4].toInt() == 0 && frame[5].toInt() == 0 &&
                    frame[6].toInt() == 0 && frame[7].toInt() == 0
                ) continue
                break
            }
            // mtg فقط 0xDDDDDDDD را قبول می‌کند («We support only fake tls»)
            frame[56] = 0xdd.toByte(); frame[57] = 0xdd.toByte()
            frame[58] = 0xdd.toByte(); frame[59] = 0xdd.toByte()
            frame[60] = (dc and 0xff).toByte()
            frame[61] = ((dc shr 8) and 0xff).toByte()

            // کلید/IV ارسال و دریافت — عین mtg: SHA256([8..40)+سکرت)، IV=[40..56)؛
            // دریافت از ناحیهٔ REVERSE شدهٔ [8..56).
            val sendKey = sha256(frame.copyOfRange(8, 40) + secretKey)
            val sendIv = frame.copyOfRange(40, 56)
            val rev = frame.copyOfRange(8, 56).reversedArray()
            val recvKey = sha256(rev.copyOfRange(0, 32) + secretKey)
            val recvIv = rev.copyOfRange(32, 48)

            sendCipher = ctrCipher(sendKey, sendIv, Cipher.ENCRYPT_MODE)
            recvCipher = ctrCipher(recvKey, recvIv, Cipher.DECRYPT_MODE)

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
            // فریم obfuscated2 — در حالت FakeTLS داخل اولین رکورد AppData می‌رود؛
            // عین tdlib: قبل از اولین رکورد، یک رکورد ChangeCipherSpec می‌آید.
            if (fakeTlsHost != null) {
                proxyOut.write(byteArrayOf(0x14, 0x03, 0x03, 0x00, 0x01, 0x01))
                writeTlsRecord(proxyOut, wireFrame, 0, wireFrame.size)
            } else {
                proxyOut.write(wireFrame)
            }
            proxyOut.flush()
        }

        /**
         * بدنهٔ پیام MTProto را در قاب padded-intermediate می‌فرستد.
         * قاب: [len32LE][payload] — بدون پدینگِ ترنسپورت (پدینگ MTProto v2 داخل
         * خود پیام است؛ DC بایت اضافهٔ انتهایی را نادیده می‌گیرد — مرجع: tgnet).
         * quickAck: بیت بالای len (درخواست quick-ack کلاینت→سرور، عین تلگرام).
         */
        fun sendBody(body: ByteArray, quickAck: Boolean) {
            requireBodySize(body.size)
            val env = ByteArray(4 + body.size)
            putLe32(env, 0, if (quickAck) (body.size or (1 shl 31)) else body.size)
            body.copyInto(env, 4)
            val enc = sendCipher.update(env)
            // رکورد TLS سقف 16379 بایت دارد — تیکه‌تیکه می‌فرستیم (CTR جریانی است)
            var off = 0
            while (off < enc.size) {
                val n = minOf(16379, enc.size - off)
                writeTlsRecord(proxyOut, enc, off, n)
                off += n
            }
            proxyOut.flush()
        }

        /**
         * یک بدنهٔ پیام از سمت پروکسی برمی‌دارد؛ null = اتصال تمام.
         *
         * نکتهٔ حیاتی (نسخهٔ ۲٫۶ — ریشهٔ «تلگرام بالا نمی‌آید»): پروکسی‌های MTProto
         * بعد از هندشیک، قاب‌های padded-intermediate را «عیناً» رله می‌کنند و
         * دیتاسنتر تلگرام انتهای هر قاب را با پدینگ ترنسپورت (۰ تا ۱۵ بایت و
         * گاهی بیشتر — اندازهٔ قاب کاملاً دلخواه است) پر می‌کند. اگر این پدینگ
         * برداشته نشود، قابِ حاصل برای ترنسپورت abridged سمت تلگرام (که طولش
         * باید مضرب ۴ باشد) نامعتبر است و اتصال بی‌صدا بسته می‌شد.
         * stripTransportPadding عین همان کاری است که tgnet خودش می‌کند:
         *   - پیام رمزشده: [auth_key_id(8)][msg_key(16)][رمز N%16==0][پدینگ P]
         *     ⟸ P = (len − 24) mod 16
         *   - پیام لختِ هندشیک (auth_key_id=0): [akid(8)][msg_id(8)][len(4)][بدنه]
         *     ⟸ هرچه بعد از ۲۰+len آمد پدینگ است.
         * توکن quick-ack سرور (۰xFFFFFFFF) هم همان‌جا رد می‌شود.
         */
        fun recvBody(): ByteArray? {
            while (true) {
                // تلاش برای پارس قاب کامل از بافر تجمعی
                if (bufLen >= 4) {
                    val total = le32(buf, 0)
                    if ((total and (1 shl 31)) != 0) {
                        // توکن quick-ack با بیتِ len — رد (فقط ۴ بایت هدر)
                        consume(4)
                        continue
                    }
                    requireBodySize(total)
                    if (bufLen >= 4 + total) {
                        var body = buf.copyOfRange(4, 4 + total)
                        consume(4 + total)
                        if (body.size >= 4 && le32(body, 0) == -1) {
                            continue // توکن quick-ack سرور (0xFFFFFFFF) — رد
                        }
                        body = stripTransportPadding(body)
                        if (body.isEmpty()) continue
                        return body
                    }
                }
                // دادهٔ بیشتر لازم است — رکورد TLS بعدی
                val (type, payload) = readTlsRecord(proxyIn)
                if (type != 0x17) continue // رکورد غیر-AppData رد می‌شود
                if (payload.isNotEmpty()) {
                    val dec = recvCipher.update(payload)
                    if (dec.isNotEmpty()) append(dec)
                }
            }
        }

        /**
         * پدینگ ترنسپورتِ انتهای قاب‌های padded-intermediate را می‌گیرد.
         * مرجع اندازه‌گیری: پاسخ واقعی دیتاسنتر به req_pq_multi (۱۲ بار تست مستقیم)
         * طول‌های ۱۰۲/۱۰۳/۱۹۲/۱۶۶/... — یعنی اکثراً مضرب ۴ نیستند.
         */
        private fun stripTransportPadding(body: ByteArray): ByteArray {
            if (body.size < 24) return body // قاب‌های خطا/کوچک — دست نمی‌زنیم
            var zero = true
            for (i in 0 until 8) {
                if (body[i].toInt() != 0) {
                    zero = false
                    break
                }
            }
            return if (zero && body.size >= 20) {
                // پیام لخت هندشیک — طول واقعی پیام داخل قاب است
                val msgLen = le32(body, 16)
                if (msgLen >= 4 && msgLen <= body.size - 20) body.copyOf(20 + msgLen) else body
            } else {
                // پیام رمزشده — بخش رمز باید مضرب ۱۶ باشد؛ باقیِ انتهایی پدینگ است
                val pad = (body.size - 24) % 16
                if (pad > 0) body.copyOf(body.size - pad) else body
            }
        }

        private fun append(dec: ByteArray) {
            if (bufLen + dec.size > buf.size) {
                var cap = maxOf(buf.size * 2, bufLen + dec.size)
                if (cap < 16 * 1024) cap = 16 * 1024
                buf = buf.copyOf(cap)
            }
            dec.copyInto(buf, bufLen)
            bufLen += dec.size
        }

        private fun consume(n: Int) {
            buf.copyInto(buf, 0, n, bufLen)
            bufLen -= n
        }

        // ── FakeTLS ClientHello (عین mtg ReadClientHello) ──

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
            // ── FakeTLS پدینگ — حیاتی ──
            // سرورهای MTProto-پروکسی برای تشخیص TLS واقعی، طول رکورد ClientHello را
            // چک می‌کنند: < ۵۱۲ یعنی «TLS نیست» → هندشیک بی‌صدا رد می‌شود.
            // اکستنشن padding (0x0015) همیشه آخرین اکستنشن است؛ طول hs دقیقاً ۵۱۲.
            val extBytes = run {
                val base = ext.toByteArray()
                val bodyNoPad = 2 + 32 + 1 + 32 + 2 + suites.size + 2 + 2 + base.size
                val padLen = 512 - 4 - bodyNoPad - 4
                if (padLen > 0) {
                    val pad = ByteArray(padLen).also { rng.nextBytes(it) }
                    val padded = ByteArrayOutputStream(base.size + padLen + 4)
                    padded.write(base)
                    padded.write(0x00); padded.write(0x15)
                    padded.write((padLen shr 8) and 0xff); padded.write(padLen and 0xff)
                    padded.write(pad)
                    padded.toByteArray()
                } else {
                    base
                }
            }

            // body: version + random(صفر) + sid + suites + comp + extensions
            // ساختار دقیق TLS ClientHello: version(2) random(32) sidLen(1) sid(32)
            // suitesLen(2) suites compLen(1=0x01) comp(1=0x00) extLen(2) ext
            // (نسخهٔ قبلی یک 0x00 اضافه قبل از compLen داشت — پارس سخت‌گیرانهٔ سرور
            // مثل mtg از آن به بعد به‌هم می‌ریخت و هندشیک بی‌صدا رد می‌شد!)
            val body = ByteArrayOutputStream()
            body.write(0x03); body.write(0x03) // client version TLS1.2
            body.write(ByteArray(32)) // random — فعلاً صفر
            body.write(0x20) // session id len = 32
            val sid = ByteArray(32); rng.nextBytes(sid)
            body.write(sid)
            body.write(0x00); body.write(suites.size) // suites len = 16-bit BE
            body.write(suites)
            body.write(0x01) // compression methods len = 1
            body.write(0x00) // method: null
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

        private fun writeTlsRecord(out: OutputStream, payload: ByteArray, off: Int, len: Int) {
            out.write(
                byteArrayOf(
                    0x17, 0x03, 0x03,
                    ((len shr 8) and 0xff).toByte(),
                    (len and 0xff).toByte(),
                )
            )
            out.write(payload, off, len)
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

    // ==================================================================
    // سمت تلگرام — obfuscated2 بدون سکرت + ترنسپورت ef/ee/dd
    // (عین tgnet خود تلگرام برای اتصال به DC)
    // ==================================================================

    private class TgSide(
        private val ins: DataInputStream,
        private val outs: OutputStream,
    ) {
        private var transport = 0 // 1=abridged 2=intermediate 3=padded
        private var obfuscated = false

        /** دریافت (تلگرام→پل): کلید خام از فریم — عین tgnet بدون سکرت. */
        private var recvCipher: Cipher? = null

        /** ارسال (پل→تلگرام): کلید خام از ناحیهٔ معکوس. */
        private var sendCipher: Cipher? = null

        /** بایت‌های خوانده‌شدهٔ اضافه در تشخیص (حالت‌های بدون obfuscation). */
        private var pending: ByteArray = ByteArray(0)
        private var pendingOff = 0

        /** بافر رمزگشایی جریانی — برای خواندن‌های کوچکِ قاب. */
        private var decBuf = ByteArray(0)
        private var decLen = 0
        private var decOff = 0

        /**
         * هندشیک سمت تلگرام: ۶۴ بایت اول را می‌خواند و ترنسپورت را تشخیص می‌دهد.
         *  - بایت اول 0xEF → abridged خام
         *  - int اول 0xEEEEEEEE / 0xDDDDDDDD → intermediate / padded خام
         *  - وگرنه obfuscated2: کلید AES = بایت‌های خام [8..40) (بدون SHA256/سکرت)،
         *    IV = [40..56)؛ ترنسپورت واقعی از [56..60) رمزگشایی‌شده درمی‌آید.
         */
        fun detect() {
            val head = ins.readFully(64)
            val le0 = le32(head, 0)
            when {
                head[0] == 0xef.toByte() -> {
                    transport = 1
                    pending = head
                    pendingOff = 1
                }
                le0 == 0xeeeeeeee.toInt() -> {
                    transport = 2
                    pending = head
                    pendingOff = 4
                }
                le0 == 0xdddddddd.toInt() -> {
                    transport = 3
                    pending = head
                    pendingOff = 4
                }
                else -> {
                    obfuscated = true
                    // دریافت: کلید/IV از بایت‌های خام فریم (تلگرام این‌طوری رمز کرده)
                    recvCipher = ctrCipher(
                        head.copyOfRange(8, 40), head.copyOfRange(40, 56), Cipher.DECRYPT_MODE,
                    )
                    // ارسال: کلید/IV از ناحیهٔ معکوس‌شدهٔ [8..56) — کلیدِ رمزگشاییِ تلگرام
                    val rev = head.copyOfRange(8, 56).reversedArray()
                    sendCipher = ctrCipher(
                        rev.copyOfRange(0, 32), rev.copyOfRange(32, 48), Cipher.ENCRYPT_MODE,
                    )
                    val plain = recvCipher!!.update(head)
                    val b56 = plain[56]
                    if (plain[57] != b56 || plain[58] != b56 || plain[59] != b56) {
                        throw IOException("فریم تلگرام نامعتبر است")
                    }
                    transport = when (b56.toInt() and 0xff) {
                        0xef -> 1
                        0xee -> 2
                        0xdd -> 3
                        else -> throw IOException("ترنسپورت تلگرام پشتیبانی نمی‌شود")
                    }
                }
            }
        }

        /**
         * بدنهٔ پیام بعدی از تلگرام؛ null = اتصال بسته.
         * خروجی: (بدنه، درخواست quick-ack) — بیت در قاب مقصد حفظ می‌شود.
         */
        fun readBody(): Pair<ByteArray, Boolean>? {
            var quickAck = false
            when (transport) {
                1 -> { // abridged
                    val b = nextByte() ?: return null
                    val len4: Int
                    if ((b and 0x80) != 0) {
                        quickAck = true
                        len4 = b and 0x7f
                    } else if (b == 0x7f) {
                        val b0 = nextByte() ?: return null
                        val b1 = nextByte() ?: return null
                        val b2 = nextByte() ?: return null
                        len4 = b0 or (b1 shl 8) or (b2 shl 16)
                    } else {
                        len4 = b
                    }
                    if (len4 <= 0) return null
                    val size = len4 * 4
                    requireBodySize(size)
                    return Pair(readN(size) ?: return null, quickAck)
                }
                else -> { // intermediate / padded — [len32LE][payload(+padding)]
                    val h = readN(4) ?: return null
                    val len = le32(h, 0)
                    if ((len and (1 shl 31)) != 0) {
                        // درخواست quick-ack — tgnet/tdlib آن را همراه payload می‌فرستد
                        quickAck = true
                        val real = len and 0x7fffffff
                        requireBodySize(real)
                        return Pair(readN(real) ?: return null, quickAck)
                    }
                    requireBodySize(len)
                    return Pair(readN(len) ?: return null, false)
                }
            }
        }

        /** بدنهٔ پیام را در ترنسپورت تلگرام قاب می‌کند و (در صورت obfuscation) رمز می‌کند. */
        fun writeBody(body: ByteArray) {
            requireBodySize(body.size)
            val frame: ByteArray = when (transport) {
                1 -> { // abridged — طول باید مضرب ۴ باشد
                    if (body.size % 4 != 0) throw IOException("بدنهٔ غیرمضرب ۴ در abridged")
                    val q = body.size / 4
                    if (q < 0x7f) {
                        byteArrayOf(q.toByte()) + body
                    } else {
                        byteArrayOf(0x7f) +
                            byteArrayOf(
                                (q and 0xff).toByte(),
                                ((q shr 8) and 0xff).toByte(),
                                ((q shr 16) and 0xff).toByte(),
                            ) + body
                    }
                }
                else -> { // intermediate / padded — [len32LE][body]
                    val env = ByteArray(4 + body.size)
                    putLe32(env, 0, body.size)
                    body.copyInto(env, 4)
                    env
                }
            }
            val wire = if (obfuscated) sendCipher!!.update(frame) else frame
            outs.write(wire)
            outs.flush()
        }

        // ── خواندن جریانی (بایت‌های pending + رمزگشایی CTR جریانی) ──

        private fun nextByte(): Int? {
            if (pendingOff < pending.size) {
                val v = pending[pendingOff].toInt() and 0xff
                pendingOff++
                return v
            }
            if (decOff < decLen) {
                val v = decBuf[decOff].toInt() and 0xff
                decOff++
                return v
            }
            if (obfuscated) {
                // چند بایت یک‌جا رمزگشایی می‌کنیم تا هر بایت یک فراخوانی JNI نشود
                val raw = ByteArray(4096)
                val n = ins.read(raw)
                if (n < 0) return null
                if (n > 0) {
                    val dec = recvCipher!!.update(raw, 0, n)
                    decBuf = dec
                    decLen = dec.size
                    decOff = 0
                }
                return nextByte()
            }
            val v = ins.read()
            return if (v < 0) null else v
        }

        private fun readN(n: Int): ByteArray? {
            if (n == 0) return ByteArray(0)
            val out = ByteArray(n)
            var off = 0
            // اول بافر رمزگشایی‌شدهٔ مانده
            if (decOff < decLen) {
                val take = minOf(n - off, decLen - decOff)
                System.arraycopy(decBuf, decOff, out, off, take)
                decOff += take
                off += take
            }
            // بعد بایت‌های pending تشخیص
            if (off < n && pendingOff < pending.size) {
                val take = minOf(n - off, pending.size - pendingOff)
                System.arraycopy(pending, pendingOff, out, off, take)
                pendingOff += take
                off += take
            }
            if (off == n) return out
            if (obfuscated) {
                val raw = ByteArray(n - off)
                ins.readFully(raw)
                val dec = recvCipher!!.update(raw)
                if (dec.size != raw.size) throw IOException("رمزگشایی جریان ناقص")
                System.arraycopy(dec, 0, out, off, dec.size)
                return out
            }
            ins.readFully(out, off, n - off)
            return out
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
