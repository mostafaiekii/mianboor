package com.mianboor.vpn.ui

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawable.BitmapDrawable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R

/** A real installed app on the phone (for genuine split tunneling). */
data class InstalledApp(
    val pkg: String,
    val label: String,
    val icon: ImageBitmap?,
)

/**
 * Working split tunneling backed by real installed apps.
 * Mode + selection are persisted and enforced by MianboorVpnService via
 * VpnService addAllowed/addDisallowedApplication.
 */
@Composable
fun SplitScreen(
    lang: Lang,
    mode: String,
    apps: List<String>,
    installed: List<InstalledApp>,
    onSetMode: (String) -> Unit,
    onToggleApp: (String) -> Unit,
    onClear: () -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    var q by remember { mutableStateOf("") }

    val list = installed.filter { it.label.lowercase().contains(q.lowercase()) }
    val n = apps.size
    val countLine = when {
        n == 0 && mode == "exclude" -> t.exclCount0
        n == 0 -> t.inclCount0
        mode == "exclude" -> t.exclCount(n)
        else -> t.inclCount(n)
    }

    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Icon(
            ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            "back", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )
        Text(t.splitTitle, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp))

        // mode segmented control
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            SegBtn(t.splitModeExcl, mode == "exclude", Modifier.weight(1f)) { onSetMode("exclude") }
            SegBtn(t.splitModeIncl, mode == "include", Modifier.weight(1f)) { onSetMode("include") }
        }
        Text(
            if (mode == "exclude") t.splitExclHint else t.splitInclHint,
            color = mb.dim, fontSize = 13.sp, lineHeight = 20.sp,
            modifier = Modifier.padding(top = 8.dp),
        )

        // search
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_search), null, tint = mb.dim, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(12.dp))
            BasicTextField(
                value = q,
                onValueChange = { q = it },
                singleLine = true,
                textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
                cursorBrush = SolidColor(mb.glow),
                decorationBox = { inner ->
                    Box {
                        if (q.isEmpty()) Text(t.splitSearch, color = mb.dim, fontSize = 14.sp)
                        inner()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // app list
        LazyColumn(
            Modifier.fillMaxWidth().weight(1f).padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(list, key = { it.pkg }) { a ->
                val on = apps.contains(a.pkg)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.panel)
                        .border(
                            1.dp,
                            if (on) mb.glow.copy(alpha = 0.3f) else mb.panelEdge,
                            RoundedCornerShape(12.dp),
                        )
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AppIcon(a)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        a.label,
                        color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    MbSwitch(on) { onToggleApp(a.pkg) }
                }
            }
            if (list.isEmpty()) {
                item { EmptyHint(t.noMatch) }
            }
            item { Spacer(Modifier.height(4.dp)) }
        }

        // bottom bar
        Text(
            t.splitApplyHint,
            color = mb.dim, fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(mb.night.copy(alpha = 0.9f))
                .border(1.dp, mb.panelEdge, RoundedCornerShape(14.dp))
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                countLine, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            if (n > 0) {
                Row(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .border(1.dp, mb.panelEdge, RoundedCornerShape(50))
                        .clickable { onClear() }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(ic(R.drawable.ic_rotate_ccw), null, tint = mb.dim, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(t.resetSplit, color = mb.dim, fontSize = 13.sp)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun AppIcon(a: InstalledApp) {
    val mb = LocalMb.current
    Box(
        Modifier
            .size(38.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(mb.night)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center,
    ) {
        val bmp = a.icon
        if (bmp != null) {
            androidx.compose.foundation.Image(
                bitmap = bmp,
                contentDescription = a.label,
                modifier = Modifier.size(24.dp),
            )
        } else {
            Text(
                a.label.take(1).uppercase(),
                color = mb.dim, fontSize = 14.sp, fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun SegBtn(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val mb = LocalMb.current
    Box(
        modifier
            .clip(RoundedCornerShape(9.dp))
            .background(if (active) mb.night else androidx.compose.ui.graphics.Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (active) mb.ink else mb.dim,
            fontSize = 13.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1,
        )
    }
}

/** Render any launcher Drawable (incl. adaptive icons) into an ImageBitmap. */
fun drawableToBitmap(d: android.graphics.Drawable?, size: Int = 96): ImageBitmap? {
    if (d == null) return null
    return runCatching {
        val bmp = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bmp)
        d.setBounds(0, 0, size, size)
        d.draw(canvas)
        bmp.asImageBitmap()
    }.getOrNull()
}
