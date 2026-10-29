package com.mianboor.vpn.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R

/** Load one of the bundled lucide-style vector drawables. */
@Composable
fun ic(res: Int): ImageVector = ImageVector.vectorResource(res)

/** Bilingual brand: big word in the active language + the other one underneath. */
@Composable
fun Brand(lang: Lang) {
    val mb = LocalMb.current
    Column {
        if (lang == Lang.EN) {
            Text("MIANBOOR", color = mb.ink, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.2.sp)
            Spacer(Modifier.height(3.dp))
            Text("میانبر", color = mb.dim, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        } else {
            Text("میانبر", color = mb.ink, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(3.dp))
            Text("Mianboor", color = mb.dim, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }
    }
}

/** 4-bar live signal indicator, colored by the ping tone. */
@Composable
fun Bars(ping: Int, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    val n = pingBars(ping)
    Row(
        modifier = modifier.height(12.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        for (i in 1..4) {
            Box(
                Modifier
                    .width(4.dp)
                    .height((i * 3).dp)
                    .background(
                        if (i <= n) mb.glow else mb.ink.copy(alpha = 0.2f),
                        RoundedCornerShape(2.dp),
                    ),
            )
        }
    }
}

/** Demo-style switch (glow track / outlined track). */
@Composable
fun MbSwitch(checked: Boolean, onChange: (Boolean) -> Unit, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    val x by animateDpAsState(if (checked) 22.dp else 3.dp, tween(180), label = "mbSwitch")
    val trackColor by androidx.compose.animation.core.animateColorAsState(
        if (checked) mb.glow else Color.Transparent, tween(180), label = "mbTrack",
    )
    Box(
        modifier
            .width(50.dp)
            .height(29.dp)
            .clip(RoundedCornerShape(50))
            .background(trackColor)
            .border(
                1.dp,
                if (checked) Color.Transparent else mb.ink.copy(alpha = 0.25f),
                RoundedCornerShape(50),
            )
            .clickable { onChange(!checked) },
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            Modifier
                .offset(x = x)
                .size(23.dp)
                .clip(CircleShape)
                .background(if (checked) mb.onGlow else mb.ink.copy(alpha = 0.55f)),
        )
    }
}

/** Rounded panel card — the demo's `border-panel-edge bg-panel rounded-2xl`. */
@Composable
fun PanelCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val mb = LocalMb.current
    val shape = RoundedCornerShape(16.dp)
    Box(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(mb.panel)
            .border(1.dp, mb.panelEdge, shape)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
    ) {
        content()
    }
}

/** Forward chevron that respects the layout direction. */
@Composable
fun FwdChevron(rtl: Boolean, modifier: Modifier = Modifier) {
    Icon(
        ic(if (rtl) R.drawable.ic_chevron_left else R.drawable.ic_chevron_right),
        contentDescription = null,
        tint = LocalMb.current.dim,
        modifier = modifier.size(20.dp),
    )
}

/** Compact circular usage ring with centered texts (port of the demo SVG). */
@Composable
fun UsageRing(
    pct: Float,
    stroke: Color,
    big: String,
    small: String,
    modifier: Modifier = Modifier,
) {
    val mb = LocalMb.current
    val p = pct.coerceIn(0f, 1f)
    Box(modifier.size(112.dp), contentAlignment = Alignment.Center) {
        androidx.compose.foundation.Canvas(Modifier.size(112.dp)) {
            val strokeW = 9.dp.toPx()
            val r = (size.minDimension - strokeW) / 2f
            drawCircle(
                color = Color.White.copy(alpha = 0.08f),
                radius = r,
                style = androidx.compose.ui.graphics.drawscope.Stroke(strokeW),
            )
            drawArc(
                color = stroke,
                startAngle = -90f,
                sweepAngle = 360f * p,
                useCenter = false,
                style = androidx.compose.ui.graphics.drawscope.Stroke(strokeW, cap = androidx.compose.ui.graphics.StrokeCap.Round),
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(big, color = mb.ink, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
            Text(small, color = mb.dim, fontSize = 10.sp)
        }
    }
}

/** Order status chip (PENDING / APPROVED / REJECTED). */
@Composable
fun StatusChip(status: String) {
    val mb = LocalMb.current
    val (label, color, bg) = when (status) {
        "approved" -> Triple("APPROVED", mb.glow, mb.glow.copy(alpha = 0.15f))
        "rejected" -> Triple("REJECTED", mb.danger, mb.danger.copy(alpha = 0.15f))
        else -> Triple("PENDING", mb.gold, mb.gold.copy(alpha = 0.15f))
    }
    Text(
        label,
        color = color,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(bg, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
    )
}

/** Top toast pill — demo style (ink background, night text). */
@Composable
fun ToastHost(message: String?, visible: Boolean, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    AnimatedVisibility(
        visible = visible && message != null,
        enter = fadeIn(tween(160)) + slideInVertically(tween(220)) { -it / 2 },
        exit = fadeOut(tween(200)) + slideOutVertically(tween(200)) { -it / 2 },
        modifier = modifier,
    ) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Text(
                message ?: "",
                color = mb.night,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .background(mb.ink, RoundedCornerShape(50))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }
    }
}

/** Centered empty-state text. */
@Composable
fun EmptyHint(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        color = LocalMb.current.dim,
        fontSize = 14.sp,
        textAlign = TextAlign.Center,
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 28.dp),
    )
}

/** Swallow clicks so taps on a sheet's body don't fall through to the scrim. */
fun Modifier.consumeClicks(): Modifier = androidx.compose.ui.composed {
    clickable(
        interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
        indication = null,
    ) {}
}
