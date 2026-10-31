package com.mianboor.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import java.net.InetSocketAddress
import java.net.Socket

/**
 * سرویس تونل میانبر — نسخهٔ ۲:
 *
 *  - Kill Switch واقعی: اگر موتور تونل وسط کار بمیرد و Kill Switch روشن باشد،
 *    اینترفیس TUN **باز نگه داشته می‌شود** (ترافیک به تونلِ بدون خروجی می‌رود و
 *    «بلعیده» می‌شود = هیچ بسته‌ای با آی‌پی واقعی بیرون نمی‌رود) و موتور تا
 *    ۲ بار همان سرور و بعد بهترین سرور جایگزین تلاش می‌شود. اگر هیچ‌کدام
 *    نشد، سرویس در فاز BLOCKED می‌ماند تا کاربر خودش دکمه را بزند.
 *  - Kill Switch خاموش: خرابی = قطع عادی (ترافیک با اینترنت واقعی ادامه پیدا می‌کند).
 *  - Auto-reconnect: با تغییر شبکه (وای‌فای ↔ دیتا) اگر تونل افتاده باشد،
 *    خودکار دوباره برقرار می‌شود.
 */
class MianboorVpnService : VpnService() {

    companion object {
        const val ACTION_CONNECT = "com.mianboor.vpn.action.CONNECT"
        const val ACTION_DISCONNECT = "com.mianboor.vpn.action.DISCONNECT"
        const val EXTRA_LINK = "link"
        const val EXTRA_NAME = "name"
        const val EXTRA_COUNTRY = "country"

        private const val CHANNEL_ID = "mianboor_vpn"
        private const val NOTIF_ID = 1001
        private const val MTU = 8500
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var tun: ParcelFileDescriptor? = null
    private var xray: Process? = null
    private var statsJob: Job? = null

    /** لینک سرور فعلی — برای تلاش مجدد/تعویض خودکار. */
    private var currentLink: String? = null
    private var currentName: String = "سرور میانبر"
    private var currentCountry: String = "نامشخص"

    override fun onCreate() {
        super.onCreate()
        registerNetworkWatch()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISCONNECT) {
            VpnState.phase.value = Phase.DISCONNECTING
            scope.launch {
                fullShutdown()
                VpnState.phase.value = Phase.IDLE
                stopSelf()
            }
            return START_NOT_STICKY
        }

        val link = intent?.getStringExtra(EXTRA_LINK) ?: currentLink
        val name = intent?.getStringExtra(EXTRA_NAME) ?: currentName
        val country = intent?.getStringExtra(EXTRA_COUNTRY) ?: currentCountry

        if (link.isNullOrBlank()) {
            scope.launch {
                fullShutdown()
                VpnState.phase.value = Phase.IDLE
                stopSelf()
            }
            return START_NOT_STICKY
        }

        // درخواست اتصال (اولین بار یا تعویض سرور): همه‌چیز از صفر برپا می‌شود
        scope.launch {
            try {
                currentLink = link
                currentName = name
                currentCountry = country
                establishTunnel(link, name, country)
                watchTunnel()
            } catch (t: Throwable) {
                VpnState.errorMessage.value = friendlyError(t)
                runCatching { fullShutdown() }
                VpnState.phase.value = Phase.IDLE
                stopSelf()
            }
        }
        return START_STICKY
    }

    // ------------------------------------------------------------------
    // Connection pipeline
    // ------------------------------------------------------------------

    private suspend fun establishTunnel(link: String, name: String, country: String) {
        promoteToForeground()
        VpnState.phase.value = Phase.CONNECTING
        VpnState.coverMsg.value = CONNECT_MSGS.random()

        // 1) Parse the link into an xray outbound (never surfaced in UI)
        val server = XrayConfigBuilder.parseLink(link, name, country)
            ?: throw IllegalStateException("این نوع کانفیگ هنوز پشتیبانی نمی‌شود")

        // 2) Bring up the TUN interface first (independent of xray boot — saves
        //    the whole establish() latency out of the critical connect path)
        if (tun == null) {
            val builder = Builder()
                .setSession("Mianboor")
                .setMtu(MTU)
                .addAddress("198.18.0.2", 32)
                .addAddress("fdfe:dcba:9876::1", 128)
                .addDnsServer("8.8.8.8")
                .addDnsServer("1.1.1.1")
                .addRoute("0.0.0.0", 0)
                .addRoute("::", 0)
            applySplitTunneling(builder)
            // Our own traffic (including the xray child process) must bypass
            // the VPN, otherwise the tunneled traffic loops forever.
            if (!isIncludeMode()) builder.addDisallowedApplication(packageName)
            val fd = builder.establish() ?: throw IllegalStateException("اجازه اتصال داده نشد")
            tun = fd
        }

        // 3) Launch the bundled xray core — با تنظیمات v2 (استلث + DNS انتخابی)
        val confFile = File(filesDir, "xray.json")
        confFile.writeText(
            XrayConfigBuilder.buildConfigJson(
                server,
                AppPrefs.blockQuic(this),
                AppPrefs.stealth(this),
                AppPrefs.dnsMode(this),
                AppPrefs.dnsCustom(this),
            )
        )
        val bin = File(applicationInfo.nativeLibraryDir, "libxray.so")
        runCatching { xray?.destroy() }
        val proc = ProcessBuilder(bin.absolutePath, "run", "-c", confFile.absolutePath)
            .redirectErrorStream(true)
            .start()
        xray = proc
        // Drain output so the process never blocks on a full pipe
        Thread { runCatching { proc.inputStream.bufferedReader().forEachLine { } } }.start()

        // 4) Wait for the local SOCKS port to come up
        if (!waitForSocks(XrayConfigBuilder.SOCKS_PORT, timeoutMs = 6000)) {
            throw IllegalStateException("هسته اتصال راه نیفتاد")
        }

        // 5) Start the socks5 tunnel (TUN -> xray)
        val tunConf = File(filesDir, "tunnel.yaml")
        tunConf.writeText(tunnelYaml())
        runCatching { TProxyService.stop() }
        val started = TProxyService.start(tunConf.absolutePath, tun!!.fd)
        if (!started) throw IllegalStateException("تونل امن راه نیفتاد")

        var waited = 0
        while (!TProxyService.isRunning() && waited < 2500) {
            delay(60)
            waited += 60
        }
        if (!TProxyService.isRunning()) throw IllegalStateException("تونل امن راه نیفتاد")

        // 6) Connected — remember for boot auto-connect, then start the stats loop
        AppPrefs.setLastServer(this, link, name, country)
        VpnState.serverName.value = server.name
        VpnState.serverCountry.value = country
        VpnState.coverMsg.value = ""
        VpnState.errorMessage.value = null
        VpnState.phase.value = Phase.CONNECTED
    }

    /**
     * حلقهٔ پایش تونل — خرابی موتور را می‌گیرد و طبق Kill Switch/Failover واکنش نشان می‌دهد.
     */
    private suspend fun watchTunnel() {
        statsJob?.cancel()
        statsJob = scope.launch {
            var retries = 0
            while (isActive) {
                if (!TProxyService.isRunning()) {
                    if (AppPrefs.killSwitch(this@MianboorVpnService)) {
                        // ── Kill Switch: TUN باز می‌ماند (ترافیک بلعیده می‌شود) و موتور دوباره برپا می‌شود ──
                        if (retries < 2) {
                            retries++
                            VpnState.phase.value = Phase.CONNECTING
                            VpnState.coverMsg.value = ""
                            delay(900)
                            val ok = runCatching { establishTunnel(currentLink!!, currentName, currentCountry) }.isSuccess
                            if (ok) {
                                retries = 0
                                continue
                            }
                        } else if (AppPrefs.failover(this@MianboorVpnService)) {
                            // بهترین سرور جایگزین از کش — تعویض خودکار
                            val alt = alternateLink(exclude = currentLink)
                            if (alt != null) {
                                retries = 0
                                currentLink = alt.link
                                currentName = alt.name
                                currentCountry = alt.country
                                VpnState.phase.value = Phase.CONNECTING
                                delay(600)
                                val ok = runCatching { establishTunnel(alt.link, alt.name, alt.country) }.isSuccess
                                if (ok) continue
                            }
                        }
                        // هیچ مسیری جواب نداد → BLOCKED: تونل باز می‌ماند تا کاربر خودش تصمیم بگیرد
                        VpnState.phase.value = Phase.BLOCKED
                        updateNotification(getString(R.string.notif_blocked))
                    } else {
                        // Kill Switch خاموش — قطع عادی
                        VpnState.errorMessage.value = "اتصال قطع شد؛ دوباره تلاش کن"
                        fullShutdown()
                        VpnState.phase.value = Phase.IDLE
                        stopSelf()
                        break
                    }
                }
                val st = TProxyService.stats()
                VpnState.txBytes.value = if (st.size > 1) st[1] else 0L
                VpnState.rxBytes.value = if (st.size > 3) st[3] else 0L
                delay(1000)
            }
        }
    }

    /** بهترین سرور جایگزین از کش سرورها + کانفیگ‌های محلی (به‌جز سرور مرد). */
    private fun alternateLink(exclude: String?): Alt? {
        val candidates = mutableListOf<Alt>()
        AppPrefs.serverCache(this).filter { it.active }.forEach {
            candidates.add(Alt(it.link, it.name, it.country))
        }
        AppPrefs.localConfigs(this).filter { it.enabled }.forEach {
            candidates.add(Alt(it.link, it.name, it.country))
        }
        return candidates
            .filter { it.link != exclude && it.link.isNotBlank() }
            .distinctBy { it.link }
            .firstOrNull()
    }

    private data class Alt(val link: String, val name: String, val country: String)

    /**
     * Auto-reconnect واقعی — با تغییر شبکه (وای‌فای ↔ دیتا) اگر تونل مرده باشد
     * و کاربر خواسته باشد متصل بماند، خودکار دوباره برپا می‌شود.
     */
    private fun registerNetworkWatch() {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return
        runCatching {
            cm.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    if (!AppPrefs.autoReconnect(applicationContext)) return
                    val phase = VpnState.phase.value
                    if (phase != Phase.CONNECTED && phase != Phase.BLOCKED) return
                    val link = currentLink ?: return
                    if (TProxyService.isRunning() && engineAlive()) return
                    scope.launch {
                        delay(700) // چند لحظه صبر تا شبکه واقعا پایدار شود
                        if (VpnState.phase.value.let { it == Phase.CONNECTED || it == Phase.BLOCKED } &&
                            !TProxyService.isRunning()
                        ) {
                            runCatching { establishTunnel(link, currentName, currentCountry) }
                        }
                    }
                }
            })
        }
    }

    private fun engineAlive(): Boolean = xray?.isAlive == true

    /**
     * خاموشی کامل — TUN هم بسته می‌شود؛ فقط وقتی کاربر خودش قطع کرده یا اجازه
     * گرفته شده صدا زده می‌شود (در Kill Switch هرگز).
     */
    private suspend fun fullShutdown() {
        statsJob?.cancel()
        statsJob = null
        runCatching { TProxyService.stop() }
        runCatching { xray?.destroy() }
        xray = null
        runCatching { tun?.close() }
        tun = null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private fun tunnelYaml(): String = """
        tunnel:
          mtu: $MTU
          ipv4: 198.18.0.1
          ipv6: 'fc00::1'
          tcp:
            buffer-size: 1024
            keep-alive: 15
          udp:
            buffer-size: 1024
            gc-interval: 120
        socks5:
          address: 127.0.0.1
          port: ${XrayConfigBuilder.SOCKS_PORT}
          udp: 'udp'
        misc:
          log-level: warn
          task-stack-size: 20480
          connect-timeout: 5000
          read-write-timeout: 60000
    """.trimIndent() + "\n"

    private fun waitForSocks(port: Int, timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (xray?.isAlive != true) return false
            try {
                Socket().use { it.connect(InetSocketAddress("127.0.0.1", port), 500) }
                return true
            } catch (t: Throwable) {
                Thread.sleep(150)
            }
        }
        return false
    }

    private fun promoteToForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "وضعیت میانبر", NotificationManager.IMPORTANCE_LOW)
        )
        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        val notif = baseNotification(pi)
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun baseNotification(pi: PendingIntent): Notification =
        Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text))
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()

    /** به‌روزرسانی متن نوتیف در فاز BLOCKED — کاربر حتی بیرون از اپ می‌فهمد اینترنت بسته است. */
    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        runCatching {
            nm.notify(
                NOTIF_ID,
                Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle(getString(R.string.notif_title))
                    .setContentText(text)
                    .setSmallIcon(R.drawable.ic_launcher_monochrome)
                    .setContentIntent(pi)
                    .setOngoing(true)
                    .build()
            )
        }
    }

    private fun friendlyError(t: Throwable): String = when {
        t is IllegalStateException && t.message?.contains("اجازه") == true ->
            "اجازه اتصال VPN داده نشد"
        t is IllegalStateException && t.message?.contains("پشتیبانی") == true ->
            "این نوع کانفیگ هنوز پشتیبانی نمی‌شود"
        else -> "اتصال برقرار نشد؛ یک بار دیگه امتحان کن"
    }

    override fun onRevoke() {
        scope.launch {
            fullShutdown()
            VpnState.phase.value = Phase.IDLE
            stopSelf()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
