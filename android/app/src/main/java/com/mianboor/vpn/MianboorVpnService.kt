package com.mianboor.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.ServiceInfo
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

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_DISCONNECT) {
            VpnState.phase.value = Phase.DISCONNECTING
            scope.launch {
                shutdown()
                VpnState.phase.value = Phase.IDLE
                stopSelf()
            }
            return START_NOT_STICKY
        }

        val link = intent?.getStringExtra(EXTRA_LINK)
        val name = intent?.getStringExtra(EXTRA_NAME) ?: "سرور میانبر"
        val country = intent?.getStringExtra(EXTRA_COUNTRY) ?: "نامشخص"

        if (link.isNullOrBlank()) {
            VpnState.phase.value = Phase.IDLE
            stopSelf()
            return START_NOT_STICKY
        }

        scope.launch {
            try {
                startTunnel(link, name, country)
            } catch (t: Throwable) {
                VpnState.errorMessage.value = friendlyError(t)
                runCatching { shutdown() }
                VpnState.phase.value = Phase.IDLE
                stopSelf()
            }
        }
        return START_STICKY
    }

    // ------------------------------------------------------------------
    // Connection pipeline
    // ------------------------------------------------------------------

    private suspend fun startTunnel(link: String, name: String, country: String) {
        promoteToForeground()
        VpnState.phase.value = Phase.CONNECTING
        VpnState.coverMsg.value = CONNECT_MSGS.random()

        // 1) Parse the link into an xray outbound (never surfaced in UI)
        val server = XrayConfigBuilder.parseLink(link, name, country)
            ?: throw IllegalStateException("این نوع کانفیگ هنوز پشتیبانی نمی‌شود")

        // 2) Bring up the TUN interface first (independent of xray boot — saves
        //    the whole establish() latency out of the critical connect path)
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

        // 3) Launch the bundled xray core
        val confFile = File(filesDir, "xray.json")
        confFile.writeText(XrayConfigBuilder.buildConfigJson(server))
        val bin = File(applicationInfo.nativeLibraryDir, "libxray.so")
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
        val started = TProxyService.start(tunConf.absolutePath, fd.fd)
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
        VpnState.phase.value = Phase.CONNECTED

        statsJob = scope.launch {
            var retries = 0
            while (isActive) {
                if (!TProxyService.isRunning()) {
                    if (AppPrefs.killSwitch(this@MianboorVpnService) && retries < 1) {
                        // kill switch: silently re-establish the tunnel once
                        retries++
                        runCatching { shutdown() }
                        VpnState.phase.value = Phase.CONNECTING
                        delay(1200)
                        runCatching { startTunnel(link, name, country) }
                        break
                    }
                    VpnState.errorMessage.value = "اتصال قطع شد؛ دوباره تلاش کن"
                    shutdown()
                    VpnState.phase.value = Phase.IDLE
                    stopSelf()
                    break
                }
                val st = TProxyService.stats()
                VpnState.txBytes.value = if (st.size > 1) st[1] else 0L
                VpnState.rxBytes.value = if (st.size > 3) st[3] else 0L
                delay(1000)
            }
        }
    }

    /**
     * Real split tunneling: exclude mode disallows the selected packages,
     * include mode allows ONLY the selected packages (self always excluded
     * from the tunnel so xray traffic never loops).
     */
    private fun applySplitTunneling(builder: Builder) {
        val mode = AppPrefs.splitMode(this)
        val apps = AppPrefs.splitApps(this)
        if (mode == "include" && apps.isNotEmpty()) {
            apps.forEach { pkg ->
                runCatching { builder.addAllowedApplication(pkg) }
            }
        } else if (mode == "exclude") {
            apps.forEach { pkg ->
                runCatching { builder.addDisallowedApplication(pkg) }
            }
        }
    }

    private fun isIncludeMode(): Boolean =
        AppPrefs.splitMode(this) == "include" && AppPrefs.splitApps(this).isNotEmpty()

    private suspend fun shutdown() {
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
        socks5:
          address: 127.0.0.1
          port: ${XrayConfigBuilder.SOCKS_PORT}
          udp: 'udp'
        misc:
          log-level: warn
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
        val notif = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text))
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
        } else {
            startForeground(NOTIF_ID, notif)
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
            shutdown()
            VpnState.phase.value = Phase.IDLE
            stopSelf()
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
