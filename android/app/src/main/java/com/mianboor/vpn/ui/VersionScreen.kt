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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R

/** وضعیت صفحهٔ نسخه — چرخهٔ کامل به‌روزرسانی داخل اپ. */
sealed class VerState {
    object Idle : VerState()
    object Checking : VerState()
    object UpToDate : VerState()
    data class Available(val version: String) : VerState()
    data class Downloading(val pct: Int) : VerState()
    object ReadyToInstall : VerState()
    object PermNeeded : VerState()
    object CheckFailed : VerState()
}

/**
 * صفحهٔ نسخه (نسخهٔ ۲٫۷) — حلقه‌های متحرک + وضعیت به‌روزبودن + نصب کامل داخل اپ.
 * هیچ لینک بیرونی باز نمی‌شود؛ دانلود و نصب هر دو داخل خود میانبر انجام می‌شود.
 */
@Composable
fun VersionScreen(
    lang: Lang,
    version: String,
    state: VerState,
    onCheck: () -> Unit,
    onDownload: () -> Unit,
    onInstall: () -> Unit,
    onPerm: () -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA

    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Icon(
            ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            "back", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )
        Text(t.versionRow, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp))

        // ── حلقه‌های متحرک ──
        Box(
            Modifier.fillMaxWidth().padding(top = 26.dp, bottom = 20.dp).height(170.dp),
            contentAlignment = Alignment.Center,
        ) {
            val busy = state is VerState.Checking || state is VerState.Downloading
            val spin = rememberInfiniteTransition(label = "verring")
            val angle by spin.animateFloat(
                0f, 360f,
                infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Restart), label = "va",
            )
            val breathe = rememberInfiniteTransition(label = "verbreathe")
            val pulse by breathe.animateFloat(
                0.85f, 1.08f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "vp",
            )
            if (busy) {
                Box(
                    Modifier
                        .size(150.dp)
                        .scale(pulse)
                        .alpha(0.5f)
                        .border(2.dp, mb.glow.copy(alpha = 0.5f), CircleShape),
                )
            }
            Canvas(Modifier.size(150.dp)) {
                val cx = size.width / 2f
                val cy = size.height / 2f
                val r = size.minDimension / 2f - 6.dp.toPx()
                when (state) {
                    is VerState.Downloading -> {
                        // حلقهٔ پیشرفت دانلود
                        drawCircle(mb.panelEdge, radius = r, style = Stroke(5.dp.toPx()))
                        val sweep = 360f * (state.pct.coerceIn(0, 100) / 100f)
                        rotate(-90f, Offset(cx, cy)) {
                            drawArc(
                                mb.glow, startAngle = 0f, sweepAngle = sweep, useCenter = false,
                                style = Stroke(5.dp.toPx(), cap = StrokeCap.Round),
                                topLeft = Offset(cx - r, cy - r),
                                size = androidx.compose.ui.geometry.Size(r * 2, r * 2),
                            )
                        }
                    }
                    is VerState.Checking -> {
                        rotate(angle, Offset(cx, cy)) {
                            drawArc(
                                mb.glow, startAngle = 0f, sweepAngle = 100f, useCenter = false,
                                style = Stroke(5.dp.toPx(), cap = StrokeCap.Round),
                                topLeft = Offset(cx - r, cy - r),
                                size = androidx.compose.ui.geometry.Size(r * 2, r * 2),
                            )
                        }
                        drawCircle(mb.glow.copy(alpha = 0.2f), radius = r, style = Stroke(5.dp.toPx()))
                    }
                    is VerState.Available, VerState.PermNeeded -> {
                        drawCircle(mb.gold, radius = r, style = Stroke(5.dp.toPx()))
                        drawCircle(mb.gold.copy(alpha = 0.25f), radius = r, style = Stroke(11.dp.toPx()))
                    }
                    VerState.ReadyToInstall -> {
                        drawCircle(mb.glow, radius = r, style = Stroke(5.dp.toPx()))
                        drawCircle(mb.glow.copy(alpha = 0.25f), radius = r, style = Stroke(11.dp.toPx()))
                    }
                    VerState.UpToDate -> {
                        drawCircle(mb.glow, radius = r, style = Stroke(5.dp.toPx()))
                        drawCircle(mb.glow.copy(alpha = 0.22f), radius = r - 12.dp.toPx(), style = Stroke(3.dp.toPx()))
                    }
                    else -> {
                        drawCircle(mb.panelEdge, radius = r, style = Stroke(5.dp.toPx()))
                    }
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "v$version",
                    color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold,
                )
                Text(
                    when (state) {
                        is VerState.Checking -> t.verChecking
                        is VerState.Downloading -> t.verDownloading(state.pct)
                        is VerState.Available -> t.verNewAvailable(state.version)
                        VerState.ReadyToInstall -> t.verReady
                        VerState.PermNeeded -> t.verPermNeeded
                        VerState.UpToDate -> t.verUpToDate
                        VerState.CheckFailed -> t.verCheckFail
                        VerState.Idle -> t.verReady
                    },
                    color = when (state) {
                        is VerState.Available, VerState.PermNeeded -> mb.gold
                        VerState.CheckFailed -> mb.danger
                        else -> mb.dim
                    },
                    fontSize = 13.sp, textAlign = TextAlign.Center,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(top = 6.dp, start = 30.dp, end = 30.dp),
                )
            }
        }

        // ── دکمهٔ اقدام ──
        when (state) {
            VerState.Idle, VerState.UpToDate, VerState.CheckFailed -> {
                PrimaryAction(if (lang == Lang.FA) "بررسی نسخهٔ جدید" else "Check for updates", mb.glow) { onCheck() }
            }
            is VerState.Available -> {
                PrimaryAction(t.verDownloadBtn, mb.gold) { onDownload() }
            }
            VerState.PermNeeded -> {
                PrimaryAction(if (lang == Lang.FA) "اجازهٔ نصب" else "Allow install", mb.gold) { onPerm() }
            }
            VerState.ReadyToInstall -> {
                PrimaryAction(t.verInstallBtn, mb.glow) { onInstall() }
            }
            else -> {}
        }

        // یادداشت — به‌روزرسانی داخل اپ، بدون مرورگر
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.dim, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                if (lang == Lang.FA)
                    "دانلود و نصب نسخهٔ جدید کاملاً داخل خود اپ انجام می‌شود — نیازی به خروج از میانبر نیست."
                else
                    "Downloading and installing new versions happens fully inside Mianboor — you never leave the app.",
                color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
            )
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun PrimaryAction(label: String, color: Color, onClick: () -> Unit) {
    val mb = LocalMb.current
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(color)
            .clickable { onClick() }
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold,
        )
    }
}
