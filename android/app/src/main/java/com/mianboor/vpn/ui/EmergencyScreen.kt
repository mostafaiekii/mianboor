package com.mianboor.vpn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.EmergencyGate
import com.mianboor.vpn.LocalMb
import com.mianboor.vpn.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ── بخش اضطراری (v2.9.2) — صفحهٔ کاملاً مستقل ──
 *
 * برای لحظه‌هایی که فیلترینگ شدید می‌شود یا اینترنت عملاً قطع است:
 *   ۱) دامنه‌های زنده را از روی CDN پیدا می‌کند
 *   ۲) استخرِ کانفیگ‌های اضطراری را می‌گیرد
 *   ۳) اتصال با حالت سخت‌گیر (fragment) انجام می‌شود
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
    val connectedNote = if (rtl)
        "اتصال اضطراری با حالت سخت‌گیر (تیکه‌تکه‌کردن TLS) برقرار می‌شود."
    else
        "Emergency connections always use strict stealth (TLS fragmenting)."
    val empty = if (rtl)
        "هیچ راهی پیدا نشد — دوباره امتحان کن؛ هر بار دامنه‌های تازه بررسی می‌شوند."
    else
        "No route found — try again; fresh mirrors are checked each time."
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

    val logs = remember { mutableStateListOf<String>() }
    var busy by remember { mutableStateOf(false) }
    var searched by remember { mutableStateOf(false) }
    val pool = remember { mutableStateListOf<EmergencyGate.ELink>() }

    fun log(s: String) {
        val ts = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.US)
            .format(java.util.Date())
        logs.add("[$ts] $s")
        if (logs.size > 120) logs.removeAt(0)
    }

    fun runRescue() {
        if (busy) return
        busy = true
        searched = true
        pool.clear()
        scope.launch(Dispatchers.IO) {
            withContext(Dispatchers.Main) { logs.clear() }
            val p = EmergencyGate.rescue(serverUrl, clientToken) { s ->
                withContext(Dispatchers.Main) { log(s) }
            }
            withContext(Dispatchers.Main) {
                pool.clear()
                p?.links?.let { pool.addAll(it) }
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

        // ── استخر اضطراری ──
        if (pool.isNotEmpty()) {
            Text(
                t.poolTitle, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 18.dp),
            )
            pool.forEachIndexed { i, e ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            e.name.ifBlank { "EMG-${i + 1}" },
                            color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "${EmergencyGate.protoOf(e.link)} · ${EmergencyGate.hostOf(e.link)}:${EmergencyGate.portOf(e.link)}",
                            color = mb.dim, fontSize = 11.sp,
                        )
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
