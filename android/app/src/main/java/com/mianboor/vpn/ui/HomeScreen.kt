package com.mianboor.vpn.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.R
import java.util.Locale

fun fmtTimer(sec: Int): String = String.format(
    Locale.US, "%02d:%02d:%02d", sec / 3600, (sec % 3600) / 60, sec % 60,
)

/** ۱٫۲ GB / ۳۴۰ MB — حجم مصرف‌شده به‌جای سرعت لحظه‌ای. */
fun fmtBytes(b: Long): String {
    if (b < 1024L) return "$b B"
    val kb = b / 1024.0
    if (kb < 1024.0) return String.format(Locale.US, "%.0f KB", kb)
    val mb = kb / 1024.0
    if (mb < 1024.0) {
        return String.format(Locale.US, if (mb < 100.0) "%.1f MB" else "%.0f MB", mb)
    }
    return String.format(Locale.US, "%.2f GB", mb / 1024.0)
}

@Composable
fun HomeScreen(
    lang: Lang,
    state: String,                    // "off" | "connecting" | "on" | "blocked"
    onToggle: () -> Unit,
    seconds: Int,
    server: ConfigItem?,
    warn: String?,
    onPickServer: () -> Unit,
    onOpenSettings: () -> Unit,
    onSupport: () -> Unit,
    downBytes: Long,
    upBytes: Long,
    originIp: String? = null,
    originCc: String = "ir",
    showFlash: Boolean = false,
    updateTag: String? = null,
    onUpdateClick: () -> Unit = {},
    onDismissUpdate: () -> Unit = {},
    unreadNotices: Int = 0,
    onOpenInbox: () -> Unit = {},
    // ── v2 ──
    quotaWarnPct: Int? = null,
    expiryDays: Int? = null,
    onRenew: () -> Unit = {},
    stealthOn: Boolean = false,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val on = state == "on"
    val busy = state == "connecting"
    val blocked = state == "blocked"
    val label = when {
        blocked -> t.blockedTitle
        on -> t.connected
        busy -> t.connecting
        else -> t.notConnected
    }

    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {

        // ── بنر نسخهٔ جدید ──
        if (updateTag != null) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(mb.gold.copy(alpha = 0.1f))
                    .border(1.dp, mb.gold.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(mb.gold.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.updateTitle, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        t.updateSub(updateTag), color = mb.dim, fontSize = 12.sp,
                        maxLines = 1, modifier = Modifier.padding(top = 2.dp),
                    )
                }
                Spacer(Modifier.width(10.dp))
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        t.updateBtn, color = mb.night, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(mb.gold)
                            .clickable { onUpdateClick() }
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                    )
                    Text(
                        t.updateLater, color = mb.dim, fontSize = 11.sp,
                        modifier = Modifier
                            .padding(top = 3.dp)
                            .clickable { onDismissUpdate() },
                    )
                }
            }
        }

        // ── بنرهای هشدار: مصرف ۸۰٪ و انقضای نزدیک پلن (نسخهٔ ۲) ──
        if (quotaWarnPct != null || expiryDays != null) {
            Column(Modifier.fillMaxWidth().padding(top = 10.dp)) {
                if (quotaWarnPct != null) {
                    HomeWarnBanner(
                        text = t.quotaWarn(quotaWarnPct), cta = t.quotaWarnCta, onClick = onRenew,
                    )
                }
                if (expiryDays != null) {
                    Box(Modifier.height(8.dp))
                    HomeWarnBanner(
                        text = t.expiryWarn(expiryDays), cta = t.expiryWarnCta, onClick = onRenew,
                    )
                }
            }
        }

        // ── header ──
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(26.dp))
            Spacer(Modifier.width(10.dp))
            Brand(lang)
            Spacer(Modifier.weight(1f))
            Box {
                Icon(
                    ic(R.drawable.ic_bell), t.inbox,
                    tint = if (unreadNotices > 0) mb.gold else mb.dim,
                    modifier = Modifier.size(21.dp).clickable { onOpenInbox() },
                )
                if (unreadNotices > 0) {
                    Box(
                        Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 6.dp, y = (-4).dp)
                            .size(15.dp)
                            .clip(CircleShape)
                            .background(mb.gold),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "$unreadNotices",
                            color = mb.night,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Icon(
                ic(R.drawable.ic_send), t.support,
                tint = mb.dim, modifier = Modifier.size(20.dp).clickable { onSupport() },
            )
            Spacer(Modifier.width(14.dp))
            Icon(
                ic(R.drawable.ic_settings), t.settings,
                tint = mb.dim, modifier = Modifier.size(22.dp).clickable { onOpenSettings() },
            )
        }

        // ── power ring ──
        Box(
            Modifier.fillMaxWidth().padding(top = 26.dp).height(192.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (on) {
                // حلقهٔ ضربان‌دار پشت دکمه — پالس ملایم بیرون/درون
                val pulse = rememberInfiniteTransition(label = "pulse")
                val pulseAlpha by pulse.animateFloat(
                    0.85f, 0.25f, infiniteRepeatable(tween(1050), RepeatMode.Reverse), label = "pulseA",
                )
                val pulseScale by pulse.animateFloat(
                    1f, 1.09f, infiniteRepeatable(tween(1050), RepeatMode.Reverse), label = "pulseS",
                )
                Box(
                    Modifier
                        .size(176.dp)
                        .scale(pulseScale)
                        .alpha(pulseAlpha)
                        .border(2.dp, mb.glow, CircleShape),
                )
            }
            if (on) {
                val breathe = rememberInfiniteTransition(label = "breathe")
                val ba by breathe.animateFloat(
                    0.25f, 0.45f,
                    infiniteRepeatable(tween(3200), RepeatMode.Reverse), label = "ba",
                )
                Box(
                    Modifier
                        .size(224.dp)
                        .drawBehind {
                            drawCircle(
                                Brush.radialGradient(
                                    colors = listOf(mb.glow.copy(alpha = ba), Color.Transparent),
                                    radius = size.minDimension / 2f,
                                ),
                            )
                        },
                )
            }
            PowerRing(
                on = on, busy = busy, blocked = blocked, onTap = onToggle,
                modifier = Modifier.size(176.dp),
            )
        }

        // ── status ──
        Column(Modifier.fillMaxWidth().padding(top = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                label,
                color = when {
                    blocked -> mb.danger
                    on -> mb.glow
                    else -> mb.ink
                },
                fontSize = 24.sp, fontWeight = FontWeight.Bold,
            )
            Text(
                when {
                    blocked -> t.blockedSub
                    on -> fmtTimer(seconds)
                    else -> t.tapProtect
                },
                color = mb.dim, fontSize = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp),
            )
            if (stealthOn && on) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(mb.glow.copy(alpha = 0.10f))
                        .border(1.dp, mb.glow.copy(alpha = 0.4f), RoundedCornerShape(50))
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                ) {
                    Icon(ic(R.drawable.ic_shield_alert), null, tint = mb.glow, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(t.stealthBadge, color = mb.glow, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            if (showFlash && on && server != null) {
                // فلش لحظه اتصال: پرچم مبدا → متن → پرچم سرور
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(mb.glow.copy(alpha = 0.10f))
                        .border(1.dp, mb.glow.copy(alpha = 0.4f), RoundedCornerShape(50))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Flag(originCc, 18.dp)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        t.connectFlash(
                            COUNTRIES[originCc] ?: originCc,
                            COUNTRIES[server.country] ?: server.country,
                        ),
                        color = mb.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                    )
                    Spacer(Modifier.width(6.dp))
                    Text("→", color = mb.dim, fontSize = 12.sp)
                    Spacer(Modifier.width(6.dp))
                    Flag(server.country, 18.dp)
                }
            }
            if (warn != null && !on) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(mb.danger.copy(alpha = 0.1f))
                        .border(1.dp, mb.danger.copy(alpha = 0.4f), RoundedCornerShape(50))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Icon(ic(R.drawable.ic_shield_alert), null, tint = mb.danger, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(warn, color = mb.danger, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
        }

        // ── current server card ──
        PanelCard(
            Modifier.padding(top = 20.dp),
            onClick = onPickServer,
        ) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                if (server != null) Flag(server.country, 40.dp)
                else Box(Modifier.size(40.dp).clip(CircleShape).background(mb.ink.copy(alpha = 0.1f)))
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(server?.name ?: t.noMatch, color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    if (server != null) {
                        Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Bars(server.ping)
                            Spacer(Modifier.width(8.dp))
                            Text("${server.ping} ms", color = mb.dim, fontSize = 13.sp)
                        }
                    }
                }
                FwdChevron(rtl)
            }
        }

        // ── کارت‌های مصرف — حجم دانلود و آپلود این سشن کنار هم ──
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            UsageCard(t.download, R.drawable.ic_arrow_down, if (on) downBytes else 0L, mb.glow, Modifier.weight(1f))
            UsageCard(t.upload, R.drawable.ic_arrow_up, if (on) upBytes else 0L, mb.up, Modifier.weight(1f))
        }

        // ── آی‌پی مبدا (قبل از اتصال گرفته می‌شود) — زیر دو کارت، دقیقا وسط ──
        OriginCard(
            originIp, originCc, ipLabel = t.yourIp,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
    }
}

/** نوار آی‌پی مبدا — زیر کارت‌های سرعت، کاملا وسط‌چین: پرچم + IP مونواسپیس + نام کشور. */
@Composable
private fun OriginCard(ip: String?, cc: String, ipLabel: String, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    PanelCard(modifier) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (ip != null) {
                Flag(cc, 22.dp)
                Spacer(Modifier.width(9.dp))
                Text(ip, color = mb.ink, fontSize = 13.sp, fontFamily = FontFamily.Monospace, maxLines = 1)
                Spacer(Modifier.width(9.dp))
                Text("·", color = mb.dim, fontSize = 13.sp)
                Spacer(Modifier.width(9.dp))
                Text(COUNTRIES[cc] ?: cc, color = mb.dim, fontSize = 12.sp, maxLines = 1)
            } else {
                Text("🌐", color = mb.dim, fontSize = 15.sp)
                Spacer(Modifier.width(8.dp))
                Text(ipLabel, color = mb.dim, fontSize = 13.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun UsageCard(title: String, icon: Int, bytes: Long, tint: Color, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    PanelCard(modifier) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(icon), null, tint = tint, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(title, color = mb.dim, fontSize = 13.sp)
            }
            Text(
                fmtBytes(bytes), color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 10.dp), maxLines = 1,
            )
        }
    }
}

/**
 * The demo power button: static panel-edge ring when off, glowing double ring
 * when on, spinning arc when connecting — and a red blocked ring for Kill Switch.
 */
@Composable
private fun PowerRing(on: Boolean, busy: Boolean, blocked: Boolean = false, onTap: () -> Unit, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    val spin = rememberInfiniteTransition(label = "spin")
    val angle by spin.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(1000, easing = LinearEasing), RepeatMode.Restart), label = "angle",
    )

    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(176.dp)
                .clickable { onTap() },
        ) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val rOuter = size.minDimension / 2f - 2.dp.toPx()
            if (on) {
                drawCircle(mb.glow, radius = rOuter, style = Stroke(4.dp.toPx()))
                drawCircle(mb.glow.copy(alpha = 0.25f), radius = rOuter, style = Stroke(9.dp.toPx()))
            } else if (blocked) {
                drawCircle(mb.danger, radius = rOuter, style = Stroke(4.dp.toPx()))
                drawCircle(mb.danger.copy(alpha = 0.25f), radius = rOuter, style = Stroke(9.dp.toPx()))
            } else if (busy) {
                rotate(angle, Offset(cx, cy)) {
                    drawArc(
                        mb.glow, startAngle = 0f, sweepAngle = 96f, useCenter = false,
                        style = Stroke(4.dp.toPx(), cap = StrokeCap.Round),
                        topLeft = Offset(cx - rOuter, cy - rOuter),
                        size = androidx.compose.ui.geometry.Size(rOuter * 2, rOuter * 2),
                    )
                }
                drawCircle(mb.glow.copy(alpha = 0.25f), radius = rOuter, style = Stroke(4.dp.toPx()))
            } else {
                drawCircle(mb.panelEdge, radius = rOuter, style = Stroke(4.dp.toPx()))
            }
        }
        Box(
            Modifier
                .size(128.dp)
                .clip(CircleShape)
                .background(mb.panel),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                ic(R.drawable.ic_power), null,
                tint = when {
                    on -> mb.glow
                    blocked -> mb.danger
                    else -> mb.dim
                },
                modifier = Modifier.size(48.dp),
            )
        }
    }
}

/** بنر هشدار خانه — متن + دکمهٔ اقدام (نسخهٔ ۲). */
@Composable
private fun HomeWarnBanner(text: String, cta: String, onClick: () -> Unit) {
    val mb = LocalMb.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(mb.gold.copy(alpha = 0.10f))
            .border(1.dp, mb.gold.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, color = mb.ink, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(8.dp))
        Text(
            cta, color = mb.night, fontSize = 11.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(mb.gold)
                .clickable { onClick() }
                .padding(horizontal = 10.dp, vertical = 5.dp),
        )
    }
}
