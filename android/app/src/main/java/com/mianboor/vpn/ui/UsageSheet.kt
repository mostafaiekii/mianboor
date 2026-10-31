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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.R
import com.mianboor.vpn.UsageTracker

/**
 * جزئیات مصرف — با لمس کارت «مصرف دیتا» در صفحه حساب باز می‌شود:
 * کاربر می‌بیند کدام اپ و کدام سرور چقدر مصرف کرده (پورت دموی وب).
 * ساختار اورلی عیناً از PlansSheet کپی شده — scrim کلیک‌خور → شیت پایین.
 */
@Composable
fun UsageSheet(
    lang: Lang,
    usedGb: Double,
    totalText: String,
    onDismiss: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val context = LocalContext.current
    val apps = remember { UsageTracker.topApps(context, 6) }
    val servers = remember { UsageTracker.topServers(context, 5) }
    val maxApp = apps.maxOfOrNull { it.second } ?: 1L
    val maxSrv = servers.maxOfOrNull { it.third } ?: 1L

    // scrim — کلیک بیرون شیت، بسته می‌کند
    Box(
        Modifier
            .fillMaxSize()
            .background(mb.night.copy(alpha = 0.7f))
            .clickable { onDismiss() },
        contentAlignment = Alignment.BottomCenter,
    ) {
        // خود شیت
        Column(
            Modifier
                .fillMaxWidth()
                .heightIn(max = 420.dp)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(mb.panel)
                .border(1.dp, mb.glow.copy(alpha = 0.3f), RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .consumeClicks(),
        ) {
            Box(
                Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .background(mb.ink.copy(alpha = 0.2f), RoundedCornerShape(50))
                    .align(Alignment.CenterHorizontally),
            )
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(t.usageDetails, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Icon(
                    ic(R.drawable.ic_x), null, tint = mb.dim,
                    modifier = Modifier.size(20.dp).clickable { onDismiss() },
                )
            }
            Text(
                "${t.usageThisMonth} · ${String.format(java.util.Locale.US, "%.1f", usedGb)} GB / $totalText",
                color = mb.dim, fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp),
            )

            // ── v2: نمودار مصرف ۱۴ روز اخیر ──
            UsageChart14(lang)

            if (apps.isEmpty() && servers.isEmpty()) {
                Text(
                    "—",
                    color = mb.dim, fontSize = 14.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
                )
                Text(
                    t.usageAppSub,
                    color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                )
            }

            // ── به تفکیک اپ ──
            if (apps.isNotEmpty()) {
                Text(
                    t.usageByApp, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Text(t.usageAppSub, color = mb.dim, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
                apps.forEach { (label, bytes) ->
                    UsageRow(label = label, flag = null, bytes = bytes, max = maxApp)
                }
            }

            // ── به تفکیک سرور ──
            if (servers.isNotEmpty()) {
                Text(
                    t.usageByServer, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Text(t.usageSrvSub, color = mb.dim, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
                servers.forEach { (name, cc, bytes) ->
                    UsageRow(label = name, flag = cc, bytes = bytes, max = maxSrv)
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

/** نمودار مصرف ۱۴ روز اخیر — واقعی از AppPrefs.dailyUsage (نسخهٔ ۲). */
@Composable
private fun UsageChart14(lang: Lang) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val context = LocalContext.current
    val days = remember {
        val map = AppPrefs.dailyUsage(context)
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
        val lbl = java.text.SimpleDateFormat("EEE", java.util.Locale.US)
        (13 downTo 0).map { i ->
            val d = java.util.Date(System.currentTimeMillis() - i * 86_400_000L)
            val key = fmt.format(d)
            Triple(lbl.format(d), map[key] ?: 0L, i == 0)
        }
    }
    val max = days.maxOfOrNull { it.second }?.coerceAtLeast(1L) ?: 1L

    Column(Modifier.fillMaxWidth().padding(top = 14.dp)) {
        Text(t.usageChart, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Text(t.usageChartSub, color = mb.dim, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .height(64.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(mb.night)
                .padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            days.forEach { (_, bytes, isToday) ->
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight(Math.max(0.03f, (bytes.toFloat() / max)))
                        .background(
                            if (isToday) mb.gold else mb.glow.copy(alpha = 0.7f),
                            RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp),
                        ),
                )
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 3.dp),
            horizontalArrangement = Arrangement.End,
        ) {
            Text(t.chartToday, color = mb.dim, fontSize = 9.sp)
        }
    }
}

/** یک ردیف مصرف: باکس ۳۶dp (پرچم یا حرف اول) + نام + نوار درصد + حجم. */
@Composable
private fun UsageRow(label: String, flag: String?, bytes: Long, max: Long) {
    val mb = LocalMb.current
    Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.ink.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            if (flag != null) Flag(flag, 22.dp)
            else Text(label.take(1).uppercase(), color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    label, color = mb.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 1, modifier = Modifier.weight(1f),
                )
                Text(fmtMb(bytes), color = mb.dim, fontSize = 10.sp)
            }
            Spacer(Modifier.height(4.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(50))
                    .background(mb.ink.copy(alpha = 0.08f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth((bytes.toFloat() / max.coerceAtLeast(1L).toFloat()).coerceIn(0.02f, 1f))
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(50))
                        .background(mb.glow),
                )
            }
        }
    }
}

private fun fmtMb(b: Long): String = when {
    b >= 1_073_741_824L -> String.format(java.util.Locale.US, "%.1f GB", b / 1_073_741_824.0)
    b >= 1_048_576L -> "${b / 1_048_576L} MB"
    else -> "${b / 1024L} KB"
}
