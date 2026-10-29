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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R
import java.util.Locale

fun fmtTimer(sec: Int): String = String.format(
    Locale.US, "%02d:%02d:%02d", sec / 3600, (sec % 3600) / 60, sec % 60,
)

fun fmtSpeed(mbps: Double): String =
    if (mbps >= 100) String.format(Locale.US, "%.0f", mbps)
    else String.format(Locale.US, "%.1f", mbps)

@Composable
fun HomeScreen(
    lang: Lang,
    state: String,                    // "off" | "connecting" | "on"
    onToggle: () -> Unit,
    seconds: Int,
    server: ConfigItem?,
    warn: String?,
    onPickServer: () -> Unit,
    onOpenSettings: () -> Unit,
    onSupport: () -> Unit,
    downMbps: Double,
    upMbps: Double,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val on = state == "on"
    val busy = state == "connecting"
    val label = when {
        on -> t.connected
        busy -> t.connecting
        else -> t.notConnected
    }

    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {

        // ── header ──
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(26.dp))
            Spacer(Modifier.width(10.dp))
            Brand(lang)
            Spacer(Modifier.weight(1f))
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
                on = on, busy = busy, onTap = onToggle,
                modifier = Modifier.size(176.dp),
            )
        }

        // ── status ──
        Column(Modifier.fillMaxWidth().padding(top = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                label,
                color = if (on) mb.glow else mb.ink,
                fontSize = 24.sp, fontWeight = FontWeight.Bold,
            )
            Text(
                if (on) fmtTimer(seconds) else t.tapProtect,
                color = mb.dim, fontSize = 15.sp,
                modifier = Modifier.padding(top = 4.dp),
            )
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

        // ── speed cards ──
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SpeedCard(t.download, R.drawable.ic_arrow_down, if (on) downMbps else 0.0, mb.glow, Modifier.weight(1f))
            SpeedCard(t.upload, R.drawable.ic_arrow_up, if (on) upMbps else 0.0, mb.up, Modifier.weight(1f))
        }
    }
}

@Composable
private fun SpeedCard(title: String, icon: Int, mbps: Double, tint: Color, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    PanelCard(modifier) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(icon), null, tint = tint, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(title, color = mb.dim, fontSize = 13.sp)
            }
            Row(
                Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Text(fmtSpeed(mbps), color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.width(6.dp))
                Text("Mbps", color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(bottom = 3.dp))
            }
        }
    }
}

/**
 * The demo power button: static panel-edge ring when off, glowing double ring
 * when on, spinning arc when connecting.
 */
@Composable
private fun PowerRing(on: Boolean, busy: Boolean, onTap: () -> Unit, modifier: Modifier = Modifier) {
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
                tint = if (on) mb.glow else mb.dim,
                modifier = Modifier.size(48.dp),
            )
        }
    }
}
