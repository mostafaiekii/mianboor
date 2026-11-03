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
import java.util.Locale

/** وضعیت صفحهٔ نسخه — چرخهٔ کامل به‌روزرسانی داخل اپ (v2.9: نسخهٔ جدید در همهٔ وضعیت‌ها). */
sealed class VerState {
    object Idle : VerState()
    object Checking : VerState()
    object UpToDate : VerState()
    data class Available(val version: String, val sizeBytes: Long = -1L) : VerState()
    data class Downloading(
        val pct: Int,
        val version: String,
        val sizeBytes: Long = -1L,
        val doneBytes: Long = 0L,
    ) : VerState()
    data class ReadyToInstall(val version: String) : VerState()
    data class PermNeeded(val version: String) : VerState()
    object CheckFailed : VerState()
}

/**
 * صفحهٔ نسخه (v2.9) — بازطراحی دقیقاً مطابق دمو:
 * نشان سفید وسط با نسخه، حلقهٔ وضعیت، بج تأیید طلایی، دکمهٔ کپسولی و کارت توضیح.
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

        // عنوان — مثل دمو وسط‌چین
        Text(
            t.versionRow, color = mb.ink, fontSize = 20.sp, fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )

        // v2.9 — نسخه‌ای که در نشان وسط نمایش داده می‌شود:
        // وقتی آپدیت جدید در جریان است «نسخهٔ جدید»، وقتی به‌روز است نسخهٔ فعلی.
        val shownVer = when (state) {
            is VerState.Available -> state.version
            is VerState.Downloading -> state.version
            is VerState.ReadyToInstall -> state.version
            is VerState.PermNeeded -> state.version
            else -> version
        }

        // ── حلقه‌ها + نشان سفید وسط ──
        Box(
            Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 12.dp).height(238.dp),
            contentAlignment = Alignment.Center,
        ) {
            val checking = state is VerState.Checking
            val spin = rememberInfiniteTransition(label = "verring")
            val angle by spin.animateFloat(
                0f, 360f,
                infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Restart), label = "va",
            )
            val breathe = rememberInfiniteTransition(label = "verbreathe")
            val pulse by breathe.animateFloat(
                0.97f, 1.03f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "vp",
            )

            // کرهٔ محو پس‌زمینه
            Box(
                Modifier
                    .size(228.dp)
                    .clip(CircleShape)
                    .background(mb.panel.copy(alpha = 0.55f))
            )
            // حلقهٔ بیرونی خیلی کم‌رنگ
            Box(Modifier.size(184.dp).border(1.dp, mb.ink.copy(alpha = 0.10f), CircleShape))
            // حلقهٔ وضعیت
            Box(
                Modifier
                    .size(164.dp)
                    .scale(pulse)
                    .border(
                        2.dp,
                        when (state) {
                            is VerState.Available, is VerState.PermNeeded -> mb.gold.copy(alpha = 0.8f)
                            VerState.UpToDate, is VerState.ReadyToInstall -> mb.glow.copy(alpha = 0.8f)
                            else -> mb.ink.copy(alpha = 0.14f)
                        },
                        CircleShape,
                    )
            )
            // حلقهٔ پیشرفت دانلود
            if (state is VerState.Downloading) {
                Canvas(Modifier.size(184.dp)) {
                    val cx = size.width / 2f
                    val cy = size.height / 2f
                    val r = size.minDimension / 2f - 4.dp.toPx()
                    drawCircle(mb.ink.copy(alpha = 0.12f), radius = r, style = Stroke(5.dp.toPx()))
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
            }
            // اسپینر «در حال بررسی»
            if (checking) {
                Canvas(Modifier.size(184.dp)) {
                    val cx = size.width / 2f
                    val cy = size.height / 2f
                    val r = size.minDimension / 2f - 4.dp.toPx()
                    drawCircle(mb.ink.copy(alpha = 0.10f), radius = r, style = Stroke(5.dp.toPx()))
                    rotate(angle, Offset(cx, cy)) {
                        drawArc(
                            mb.glow, startAngle = 0f, sweepAngle = 90f, useCenter = false,
                            style = Stroke(5.dp.toPx(), cap = StrokeCap.Round),
                            topLeft = Offset(cx - r, cy - r),
                            size = androidx.compose.ui.geometry.Size(r * 2, r * 2),
                        )
                    }
                }
            }
            // نشان سفید وسط — شمارهٔ نسخه
            Box(
                Modifier
                    .size(102.dp)
                    .clip(CircleShape)
                    .background(mb.ink),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "v$shownVer",
                    color = mb.night, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold,
                )
            }
        }

        // ── متن وضعیت + دکمهٔ اقدام ──
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            when (state) {
                VerState.Checking -> Text(t.verChecking, color = mb.dim, fontSize = 14.sp)
                VerState.UpToDate -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_badge_check), null, tint = mb.glow, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(t.verUpToDate, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        t.verReady, color = mb.dim, fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                is VerState.Available -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_badge_check), null, tint = mb.gold, modifier = Modifier.size(22.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            t.verNewAvailable(state.version),
                            color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                    Text(
                        if (state.sizeBytes > 0)
                            t.verNewSub + " · " + String.format(Locale.US, "%.1f MB", state.sizeBytes / 1_000_000.0)
                        else t.verNewSub,
                        color = mb.dim, fontSize = 13.sp, textAlign = TextAlign.Center,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(top = 6.dp, start = 14.dp, end = 14.dp),
                    )
                }
                is VerState.Downloading -> {
                    Text(
                        t.verDownloading(state.pct),
                        color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold,
                    )
                    if (state.sizeBytes > 0) {
                        Text(
                            String.format(
                                Locale.US, "%.1f / %.1f MB",
                                state.doneBytes / 1_000_000.0, state.sizeBytes / 1_000_000.0,
                            ),
                            color = mb.dim, fontSize = 13.sp,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }
                is VerState.ReadyToInstall -> Text(
                    t.verReadyInstall,
                    color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                is VerState.PermNeeded -> Text(
                    t.verPermNeeded,
                    color = mb.gold, fontSize = 14.sp, textAlign = TextAlign.Center,
                    lineHeight = 20.sp,
                    modifier = Modifier.padding(horizontal = 10.dp),
                )
                VerState.CheckFailed -> Text(
                    t.verCheckFail, color = mb.danger, fontSize = 14.sp, textAlign = TextAlign.Center,
                )
                VerState.Idle -> {}
            }
        }

        // دکمهٔ کپسولی — مثل دمو
        when (state) {
            VerState.Idle, VerState.CheckFailed -> {
                PillButton(
                    if (lang == Lang.FA) "بررسی نسخهٔ جدید" else "Check for updates",
                    mb.panel, mb.ink, Modifier.padding(top = 16.dp),
                ) { onCheck() }
            }
            VerState.UpToDate -> {} // دمو: دکمه ندارد
            is VerState.Available -> {
                PillButton(t.verDownloadBtn, mb.gold, mb.night, Modifier.padding(top = 16.dp)) { onDownload() }
            }
            is VerState.PermNeeded -> {
                PillButton(
                    if (lang == Lang.FA) "اجازهٔ نصب" else "Allow install",
                    mb.gold, mb.night, Modifier.padding(top = 16.dp),
                ) { onPerm() }
            }
            is VerState.ReadyToInstall -> {
                PillButton(t.verInstallBtn, mb.glow, mb.night, Modifier.padding(top = 16.dp)) { onInstall() }
            }
            is VerState.Downloading -> {}
        }

        // یادداشت — به‌روزرسانی داخل اپ، بدون مرورگر و بدون گیت‌هاب
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 18.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(14.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.dim, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                t.verInAppNote,
                color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
            )
        }
        Spacer(Modifier.height(12.dp))
    }
}

/** دکمهٔ کپسولی وسط‌چین — دقیقاً مثل دمو (rounded-full، سایهٔ ملایم). */
@Composable
private fun PillButton(
    label: String,
    bg: Color,
    fg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .clip(RoundedCornerShape(50))
                .background(bg)
                .clickable { onClick() }
                .padding(horizontal = 30.dp, vertical = 13.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(label, color = fg, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
    }
}
