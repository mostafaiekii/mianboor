package com.mianboor.vpn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.R
import com.mianboor.vpn.XrayConfigBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URL
import java.util.Locale

/**
 * شیت‌های نسخهٔ ۲ — اسپیدتست واقعی از داخل تونل، وضعیت زندهٔ سرورها و ورود کانفیگ
 * (لینک / اشتراک / QR با دوربین). پورت از دمو؛ «آزمایشگاه دمو» عمداً در اپ اصلی نیست.
 */

// ─────────────────────────────────────────────────────────────────
// موتور اسپیدتست — دانلود/آپلود واقعی از مسیر SOCKS (تونل)
// ─────────────────────────────────────────────────────────────────

object SpeedTester {

    data class Progress(
        val phase: String = "down", // down | up | done
        val downMbps: Double = 0.0,
        val upMbps: Double = 0.0,
    )

    /**
     * اندازه‌گیری واقعی پهنای‌باند: دانلود ۱۲MB و آپلود ۳MB به speed.cloudflare.com
     * از مسیر SOCKS تونل (اگر تونل روشن باشد اندازه‌گیری «از داخل تونل» است).
     */
    suspend fun measure(onProgress: (Progress) -> Unit) {
        val proxy = Proxy(Proxy.Type.SOCKS, InetSocketAddress("127.0.0.1", XrayConfigBuilder.SOCKS_PORT))
        val down = withContext(Dispatchers.IO) { runCatching { downloadMbps(proxy, onProgress) }.getOrDefault(0.0) }
        onProgress(Progress("up", down, 0.0))
        val up = withContext(Dispatchers.IO) { runCatching { uploadMbps(proxy) }.getOrDefault(0.0) }
        onProgress(Progress("done", down, up))
    }

    private fun downloadMbps(proxy: Proxy, onProgress: (Progress) -> Unit): Double {
        val conn = URL("https://speed.cloudflare.com/__down?bytes=12000000").openConnection(proxy) as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 15000
        try {
            val t0 = System.nanoTime()
            var total = 0L
            val buf = ByteArray(64 * 1024)
            conn.inputStream.use { ins ->
                while (true) {
                    val n = ins.read(buf)
                    if (n < 0) break
                    total += n
                    val sec = (System.nanoTime() - t0) / 1_000_000_000.0
                    if (sec > 0.35) onProgress(Progress("down", total * 8 / sec / 1_000_000.0, 0.0))
                    if (sec > 9) break
                }
            }
            val sec = (System.nanoTime() - t0) / 1_000_000_000.0
            return if (sec > 0) total * 8 / sec / 1_000_000.0 else 0.0
        } finally {
            conn.disconnect()
        }
    }

    private fun uploadMbps(proxy: Proxy): Double {
        val payload = ByteArray(3 * 1024 * 1024)
        val conn = URL("https://speed.cloudflare.com/__up").openConnection(proxy) as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 15000
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.setFixedLengthStreamingMode(payload.size)
        conn.setRequestProperty("Content-Type", "application/octet-stream")
        try {
            val t0 = System.nanoTime()
            conn.outputStream.use { os ->
                var written = 0
                while (written < payload.size) {
                    os.write(payload, written, minOf(64 * 1024, payload.size - written))
                    written += 64 * 1024
                }
                os.flush()
            }
            runCatching { conn.responseCode }
            val sec = (System.nanoTime() - t0) / 1_000_000_000.0
            return if (sec > 0) payload.size * 8 / sec / 1_000_000.0 else 0.0
        } finally {
            conn.disconnect()
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// قالب مشترک شیت پایین‌صفحه
// ─────────────────────────────────────────────────────────────────

@Composable
fun SheetScaffold(
    title: String,
    icon: Int,
    onClose: () -> Unit,
    content: @Composable () -> Unit,
) {
    val mb = LocalMb.current
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
            .background(mb.panel)
            .border(1.dp, mb.glow.copy(alpha = 0.3f), RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(ic(icon), null, tint = mb.glow, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(title, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Icon(
                ic(R.drawable.ic_x), "close", tint = mb.dim,
                modifier = Modifier
                    .size(20.dp)
                    .clickable { onClose() },
            )
        }
        Spacer(Modifier.height(12.dp))
        Box(Modifier.fillMaxWidth().height(320.dp)) {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
            ) {
                content()
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// شیت اسپیدتست
// ─────────────────────────────────────────────────────────────────

@Composable
fun SpeedTestSheet(lang: Lang, server: ConfigItem?, onClose: () -> Unit) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    var phase by remember { mutableStateOf("idle") }
    var down by remember { mutableStateOf(0.0) }
    var up by remember { mutableStateOf(0.0) }
    var hist by remember { mutableStateOf(listOf<Double>()) }

    LaunchedEffect(Unit) {
        phase = "down"
        SpeedTester.measure { p ->
            phase = p.phase
            down = p.downMbps
            up = p.upMbps
            if (p.phase == "down") hist = (hist + listOf(p.downMbps)).takeLast(34)
        }
    }

    SheetScaffold(title = t.speedTest, icon = R.drawable.ic_activity, onClose = onClose) {
        if (server != null) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.night)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Flag(server.country, 28.dp)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(server.name, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    Text(t.speedResultSub, color = mb.dim, fontSize = 11.sp)
                }
                Text(
                    "${t.speedPing}: ${server.ping} ms",
                    color = pingColor(server.ping, mb),
                    fontSize = 12.sp,
                )
            }
        }

        Column(
            Modifier
                .fillMaxWidth()
                .padding(top = 10.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(mb.night)
                .padding(vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val shown = if (phase == "up") up else down
            Text(
                String.format(Locale.US, "%.1f", shown),
                color = mb.glow, fontSize = 40.sp, fontWeight = FontWeight.Bold,
            )
            Text("Mbps", color = mb.dim, fontSize = 12.sp)
            Spacer(Modifier.height(6.dp))
            Text(
                when (phase) {
                    "down" -> "${t.speedDown} · ${t.speedTesting}"
                    "up" -> "${t.speedUp} · ${t.speedTesting}"
                    else -> t.speedDone
                },
                color = mb.dim, fontSize = 12.sp,
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp)
                    .height(56.dp)
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                val max = (hist.maxOrNull() ?: 1.0).coerceAtLeast(1.0)
                if (hist.isEmpty()) {
                    Box(Modifier.weight(1f).height(2.dp).background(mb.ink.copy(alpha = 0.1f)))
                } else {
                    hist.forEach { v ->
                        Box(
                            Modifier
                                .weight(1f)
                                .fillMaxHeight(Math.max(0.04f, (v / max).toFloat()))
                                .background(mb.glow.copy(alpha = 0.75f), RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp)),
                        )
                    }
                }
            }
        }

        if (phase == "done") {
            Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SpeedCard(t.speedDown, down, Modifier.weight(1f))
                SpeedCard(t.speedUp, up, Modifier.weight(1f))
            }
        }
        if (phase == "done" && down <= 0.0 && up <= 0.0) {
            Text(t.speedFail, color = mb.danger, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

@Composable
private fun SpeedCard(label: String, v: Double, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(mb.night)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = mb.dim, fontSize = 11.sp)
        Text(
            String.format(Locale.US, "%.1f Mbps", v),
            color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 3.dp),
        )
    }
}

// ─────────────────────────────────────────────────────────────────
// شیت وضعیت سرورها — وضعیت زندهٔ واقعی از موتور پینگ
// ─────────────────────────────────────────────────────────────────

@Composable
fun StatusSheet(lang: Lang, configs: List<ConfigItem>, onClose: () -> Unit) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    SheetScaffold(title = t.statusTitle, icon = R.drawable.ic_shield_check, onClose = onClose) {
        Text(t.statusSub, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            configs.sortedBy { it.ping }.forEach { c ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Flag(c.country, 26.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(c.name, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                        Text(
                            if (c.ping >= 999) t.statusDown else t.statusLive,
                            color = if (c.ping >= 999) mb.danger else mb.dim,
                            fontSize = 11.sp,
                        )
                    }
                    Text("${c.ping} ms", color = pingColor(c.ping, mb), fontSize = 13.sp)
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// شیت ورود کانفیگ — لینک اشتراکی / لینک اشتراک / QR
// ─────────────────────────────────────────────────────────────────

@Composable
fun ImportSheet(
    lang: Lang,
    busy: Boolean,
    onClose: () -> Unit,
    onAddLink: (name: String, country: String, link: String) -> Unit,
    onFetchSub: (url: String) -> Unit,
    onScanQr: () -> Unit,
    toast: (String) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    var tab by remember { mutableStateOf("link") }
    var link by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }

    SheetScaffold(title = t.importTitle, icon = R.drawable.ic_plus, onClose = onClose) {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(mb.night)
                .padding(4.dp),
        ) {
            ImportTab(t.importLinkTab, tab == "link", Modifier.weight(1f)) { tab = "link" }
            ImportTab(t.importSubTab, tab == "sub", Modifier.weight(1f)) { tab = "sub" }
        }

        if (tab == "link") {
            V2TextField(link, { link = it }, t.importLinkHint, Modifier.padding(top = 10.dp))
            V2TextField(name, { name = it }, t.importName, Modifier.padding(top = 8.dp), ltr = false)
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (link.isBlank()) mb.panel else mb.glow)
                    .clickable(enabled = link.isNotBlank() && !busy) {
                        val parsed = XrayConfigBuilder.parseLink(link, name.ifBlank { t.importDefaultName }, "de")
                        if (parsed == null) {
                            toast(t.importInvalid)
                        } else {
                            onAddLink(parsed.name, parsed.country.ifBlank { "de" }, link.trim())
                        }
                    }
                    .padding(vertical = 13.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    t.importAdd,
                    color = if (link.isBlank()) mb.dim else mb.onGlow,
                    fontSize = 14.sp, fontWeight = FontWeight.Bold,
                )
            }
        } else {
            V2TextField(url, { url = it }, t.importSubHint, Modifier.padding(top = 10.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (busy || url.isBlank()) mb.panel else mb.glow)
                    .clickable(enabled = !busy && url.isNotBlank()) { onFetchSub(url.trim()) }
                    .padding(vertical = 13.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (busy) t.importFetching else t.importFetch,
                    color = if (busy || url.isBlank()) mb.dim else mb.onGlow,
                    fontSize = 14.sp, fontWeight = FontWeight.Bold,
                )
            }
        }

        // اسکن QR با دوربین — مجوز خودش درخواست می‌شود
        Box(
            Modifier
                .fillMaxWidth()
                .padding(top = 10.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                .clickable { onScanQr() }
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_key_round), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(t.qrScan, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        Text(t.qrNote, color = mb.dim, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
private fun ImportTab(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val mb = LocalMb.current
    Box(
        modifier
            .clip(RoundedCornerShape(9.dp))
            .background(if (active) mb.panel else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (active) mb.ink else mb.dim,
            fontSize = 13.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            textAlign = TextAlign.Center,
        )
    }
}

/** فیلد متنی سبک مشترک شیت‌های v2 — با placeholder درست. */
@Composable
fun V2TextField(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier, ltr: Boolean = true) {
    val mb = LocalMb.current
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(mb.night)
            .padding(horizontal = 12.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                Box {
                    if (value.isEmpty()) Text(hint, color = mb.dim, fontSize = 13.sp, maxLines = 1)
                    inner()
                }
            },
        )
    }
}
