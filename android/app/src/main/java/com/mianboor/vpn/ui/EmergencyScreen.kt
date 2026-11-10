package com.mianboor.vpn.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.EmergencyGate
import com.mianboor.vpn.R
import com.mianboor.vpn.RealPing
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ── بخش اضطراری (v2.9.3) — صفحهٔ کاملاً مستقل ──
 *
 * برای لحظه‌هایی که فیلترینگ شدید می‌شود یا اینترنت عملاً قطع است:
 *   ۱) دامنه‌های زنده را از روی CDN پیدا می‌کند
 *   ۲) استخرِ کانفیگ‌های اضطراری را می‌گیرد (توکن → seeds عمومی → حافظه)
 *   ۳) هر کانفیگ «کپی» و «هم‌رسانی» دارد — کاربر می‌تواند برای بقیه بفرستد
 *   ۴) اتصال با حالت سخت‌گیر (fragment) انجام می‌شود
 *
 * همهٔ متن‌ها داخل همین فایل است تا حذف این بخش، هیچ اثری روی بقیهٔ اپ نگذارد.
 */

private class EmgStrings(lang: Lang) {
    val rtl = lang == Lang.FA
    val title = if (rtl) "وضعیت اضطراری" else "Emergency mode"
    val sub = if (rtl)
        "وقتی فیلترینگ شدید شد یا اینترنت قطع شد — میانبر خودش راه زنده را پیدا می‌کند."
    else
        "When filtering goes hard or the internet is cut — Mianboor finds a live route by itself."
    val start = if (rtl) "جست‌وجوی راه زنده" else "Find a live route"
    val searching = if (rtl) "در حال جست‌وجو…" else "Searching…"
    val logTitle = if (rtl) "گزارش" else "Log"
    val poolTitle = if (rtl) "کانفیگ‌های اضطراری — یکی را وصل کن" else "Emergency configs — connect to one"
    val connect = if (rtl) "وصل شو" else "Connect"
    val copy = if (rtl) "کپی" else "Copy"
    val copied = if (rtl) "کپی شد ✓" else "Copied ✓"
    val share = if (rtl) "هم‌رسانی" else "Share"
    val mirrorsTitle = if (rtl) "دامنه‌های زنده — باز کن یا برای دوستات بفرست" else "Live mirrors — open or share with friends"
    val cacheNote = if (rtl) "از حافظهٔ اضطراری (آخرین دریافت موفق: %s)" else "From emergency cache (last success: %s)"
    val connectedNote = if (rtl)
        "اتصال اضطراری با حالت سخت‌گیر (تیکه‌تکه‌کردن TLS) برقرار می‌شود."
    else
        "Emergency connections always use strict stealth (TLS fragmenting)."
    val empty = if (rtl)
        "هیچ راهی پیدا نشد — دوباره امتحان کن؛ هر بار دامنه‌های تازه بررسی می‌شوند. وقتی آنلاین شوی، همین صفحه مهمات را برای لحظهٔ قطعی ذخیره می‌کند."
    else
        "No route found — try again; fresh mirrors are checked each time. Whenever you get online, this page stores supplies for the next blackout."
    // ── v2.9.3: تست واقعی هر کانفیگ (مثل Real Delay ویتوری) ──
    val realScan = if (rtl)
        "— تست واقعی هر کانفیگ (هستهٔ موقت + درخواست اینترنتی واقعی)…"
    else
        "— real-testing each config (temp core + real request)…"
    val realScanDone = if (rtl)
        "✓ تست واقعی تمام شد — %d از %d تونل واقعاً کار می‌کند"
    else
        "✓ real test done — %d of %d tunnels really work"
    val rowTesting = if (rtl) "در حال تست واقعی…" else "Real testing…"
    val rowOk = if (rtl)
        "✓ %d ms — تونل واقعاً کار می‌کند (نه فقط TCP باز)"
    else
        "✓ %d ms — tunnel really works (not just open TCP)"
    val rowDead = if (rtl)
        "✗ TCP باز است ولی تونل واقعی کار نکرد"
    else
        "✗ TCP opens but the tunnel really failed"
    val back = "back"
}

@Composable
fun EmergencyScreen(
    lang: Lang,
    serverUrl: String,
    clientToken: String,
    onBack: () -> Unit,
    onConnect: (ConfigItem) -> Unit,
) {
    val mb = LocalMb.current
    val t = EmgStrings(lang)
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current

    val logs = remember { mutableStateListOf<String>() }
    var busy by remember { mutableStateOf(false) }
    var searched by remember { mutableStateOf(false) }
    var fromCache by remember { mutableStateOf(false) }
    var cacheWhen by remember { mutableStateOf("") }
    val pool = remember { mutableStateListOf<EmergencyGate.ELink>() }
    val mirrors = remember { mutableStateListOf<String>() }
    var copiedIdx by remember { mutableStateOf(-1) }
    // ── v2.9.3: نتیجهٔ تست واقعی هر کانفیگ — هم‌تراز با pool ──
    var realTesting by remember { mutableStateOf(false) }
    val realMs = remember { mutableStateListOf<Long?>() }

    // callback از ترد IO می‌آید — به‌روزرسانی UI همیشه روی ترد اصلی
    val main = remember { Handler(Looper.getMainLooper()) }

    fun log(s: String) {
        val ts = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.US)
            .format(java.util.Date())
        logs.add("[$ts] $s")
        if (logs.size > 120) logs.removeAt(0)
    }

    fun copyCfg(i: Int, link: String) {
        runCatching {
            val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Mianboor", link))
            copiedIdx = i
        }
    }

    fun shareCfg(link: String, name: String) {
        runCatching {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, "Mianboor Emergency")
                putExtra(Intent.EXTRA_TEXT, "$name\n$link")
            }
            ctx.startActivity(Intent.createChooser(intent, t.share))
        }
    }

    fun openMirror(url: String) {
        runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }

    fun runRescue() {
        if (busy) return
        busy = true
        searched = true
        pool.clear()
        mirrors.clear()
        realMs.clear()
        realTesting = false
        fromCache = false
        scope.launch(Dispatchers.IO) {
            withContext(Dispatchers.Main) { logs.clear() }
            val p = EmergencyGate.rescue(ctx, serverUrl, clientToken) { s ->
                main.post { log(s) }
            }
            withContext(Dispatchers.Main) {
                pool.clear()
                mirrors.clear()
                fromCache = p?.fromCache == true
                cacheWhen = p?.savedAtText ?: ""
                p?.links?.let { pool.addAll(it) }
                p?.mirrors?.let { ms -> ms.filter { it.startsWith("http") }.forEach { mirrors.add(it) } }
            }
            // ── v2.9.3: فقط فهرست‌کردن کافی نیست — هر کانفیگ با تونل واقعی سنجیده می‌شود ──
            val links = p?.links?.map { it.link } ?: emptyList()
            if (links.isNotEmpty()) {
                withContext(Dispatchers.Main) {
                    realTesting = true
                    realMs.clear()
                    repeat(links.size) { realMs.add(null) }
                    log(t.realScan)
                }
                val res = RealPing.testAll(ctx, links, parallel = 3)
                withContext(Dispatchers.Main) {
                    res.forEachIndexed { i, ms -> if (i < realMs.size) realMs[i] = ms }
                    realTesting = false
                    val alive = res.count { it != null }
                    log(t.realScanDone.format(alive, links.size))
                }
            }
            withContext(Dispatchers.Main) {
                if (p == null) log(if (t.rtl) "— هیچ راهی پیدا نشد" else "— no route found")
                busy = false
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Icon(
            ic(if (t.rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            t.back, tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )

        // ── هدر قرمز/کهربایی ──
        Row(
            Modifier.padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(mb.gold.copy(alpha = 0.16f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_shield_alert), null, tint = mb.gold, modifier = Modifier.size(26.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(t.title, color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(t.sub, color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp)
            }
        }

        // ── دکمهٔ شروع ──
        Box(
            Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(mb.gold)
                .clickable { runRescue() }
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (busy) t.searching else t.start,
                color = mb.night,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        // ── دامنه‌های زنده — بازکردنی/هم‌رسانی‌شدنی ──
        if (mirrors.isNotEmpty()) {
            Text(t.mirrorsTitle, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 16.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .horizontalScroll(rememberScrollState()),
            ) {
                mirrors.forEach { m ->
                    Box(
                        Modifier
                            .padding(end = 6.dp)
                            .clip(RoundedCornerShape(50))
                            .background(mb.glow.copy(alpha = 0.14f))
                            .clickable { openMirror(m) }
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                    ) {
                        Text(
                            m.replace(Regex("^https?://"), ""),
                            color = mb.glow, fontSize = 11.sp, fontFamily = FontFamily.Monospace,
                        )
                    }
                }
            }
        }

        // ── گزارش زنده ──
        if (logs.isNotEmpty()) {
            Text(t.logTitle, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 16.dp))
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.night)
                    .padding(10.dp),
            ) {
                logs.takeLast(14).forEach { line ->
                    Text(
                        line,
                        color = if (line.contains("✓")) mb.glow else if (line.contains("✗")) mb.gold else mb.dim,
                        fontSize = 11.sp,
                        lineHeight = 15.sp,
                        fontFamily = FontFamily.Monospace,
                    )
                }
            }
        }

        // ── اعلان حافظهٔ اضطراری ──
        if (fromCache) {
            Text(
                t.cacheNote.format(cacheWhen),
                color = mb.gold, fontSize = 11.sp, lineHeight = 15.sp,
                modifier = Modifier.padding(top = 12.dp),
            )
        }

        // ── استخر اضطراری — با کپی و هم‌رسانی واقعی ──
        if (pool.isNotEmpty()) {
            Text(
                t.poolTitle, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 18.dp),
            )
            pool.forEachIndexed { i, e ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(12.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                "${e.country} ${e.name.ifBlank { "EMG-${i + 1}" }}",
                                color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "${EmergencyGate.protoOf(e.link)} · ${EmergencyGate.hostOf(e.link)}:${EmergencyGate.portOf(e.link)}",
                                color = mb.dim, fontSize = 11.sp,
                            )
                            // ── v2.9.3: نتیجهٔ تست واقعی — «واقعاً کار می‌کند» یا «فقط TCP باز» ──
                            val ms = realMs.getOrNull(i)
                            if (realTesting || ms != null || realMs.isNotEmpty()) {
                                Text(
                                    when {
                                        realTesting && ms == null -> "⏳ ${t.rowTesting}"
                                        ms != null -> t.rowOk.format(ms)
                                        else -> t.rowDead
                                    },
                                    color = when {
                                        realTesting && ms == null -> mb.dim
                                        ms != null -> mb.glow
                                        else -> mb.danger
                                    },
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(mb.gold.copy(alpha = 0.18f))
                                .clickable {
                                    onConnect(
                                        ConfigItem(
                                            key = "emg:$i",
                                            name = e.name.ifBlank { "EMG-${i + 1}" },
                                            country = e.country,
                                            protocol = EmergencyGate.protoOf(e.link),
                                            host = EmergencyGate.hostOf(e.link),
                                            port = EmergencyGate.portOf(e.link),
                                            ping = 0,
                                            premium = false,
                                            enabled = true,
                                            link = e.link,
                                            local = false,
                                        ),
                                    )
                                }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                        ) {
                            Text(t.connect, color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    // ── ردیف کپی/هم‌رسانی — خروجی صفحه «قابل استفاده» است ──
                    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(mb.panel)
                                .clickable { copyCfg(i, e.link) }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        ) {
                            Text(
                                if (copiedIdx == i) t.copied else t.copy,
                                color = if (copiedIdx == i) mb.glow else mb.ink,
                                fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(mb.panel)
                                .clickable { shareCfg(e.link, e.name.ifBlank { "EMG-${i + 1}" }) }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        ) {
                            Text(t.share, color = mb.ink, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            e.link.take(38) + "…",
                            color = mb.dim, fontSize = 10.sp, fontFamily = FontFamily.Monospace,
                            maxLines = 1,
                        )
                    }
                }
            }
        } else if (searched && !busy) {
            Text(
                t.empty, color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
                modifier = Modifier.padding(top = 14.dp),
            )
        }

        if (pool.isNotEmpty()) {
            Text(
                t.connectedNote, color = mb.dim, fontSize = 11.sp, lineHeight = 15.sp,
                modifier = Modifier.padding(top = 12.dp),
            )
        }

        Spacer(Modifier.height(28.dp))
    }
}
