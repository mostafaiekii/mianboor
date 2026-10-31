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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.R

@Composable
fun ServersScreen(
    lang: Lang,
    configs: List<ConfigItem>,
    selectedKey: String?,
    premiumUser: Boolean,
    syncing: Boolean,
    syncOk: Boolean?,
    lastSyncAt: Long,
    onRefresh: () -> Unit,
    onSelect: (String) -> Unit,
    onPremiumTap: () -> Unit,
    onBack: () -> Unit,
    serverHost: String = "",
    syncError: String = "",
    // ── v2 ──
    favorites: Set<String> = emptySet(),
    onToggleFav: (String) -> Unit = {},
    onSpeedTest: () -> Unit = {},
    onImport: () -> Unit = {},
    onStatus: () -> Unit = {},
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    var q by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf("free") }   // "free" | "premium"

    val enabled = configs.filter { it.enabled }
    val freeEnabled = enabled.filter { !it.premium }
    val premEnabled = enabled.filter { it.premium }
    // سنجاق‌شده‌ها اول، بعد بقیه — هر دو با کم‌ترین پینگ بالا
    val base = (if (tab == "free") freeEnabled else premEnabled)
        .filter { it.name.lowercase().contains(q.lowercase()) }
    val list = base.filter { it.key in favorites }.sortedBy { it.ping } +
        base.filter { it.key !in favorites }.sortedBy { it.ping }
    // Smart Connect really measures: lowest live ping among the servers this user can join.
    val pool = if (premiumUser || freeEnabled.isEmpty()) enabled else freeEnabled
    val best = pool.minByOrNull { it.ping }

    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
                "back", tint = mb.dim,
                modifier = Modifier.size(24.dp).clickable { onBack() },
            )
            Text(
                t.selectLocation, color = mb.ink, fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 12.dp).weight(1f),
            )
            // ── دکمه‌های v2: اسپیدتست / ورود کانفیگ / وضعیت سرورها ──
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .clickable { onSpeedTest() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_activity), t.speedTest, tint = mb.glow, modifier = Modifier.size(17.dp))
            }
            Spacer(Modifier.width(6.dp))
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .clickable { onImport() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_plus), t.importTitle, tint = mb.glow, modifier = Modifier.size(17.dp))
            }
            Spacer(Modifier.width(6.dp))
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .clickable { onStatus() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_shield_check), t.statusTitle, tint = mb.glow, modifier = Modifier.size(17.dp))
            }
            Spacer(Modifier.width(6.dp))
            Box(
                Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .clickable(enabled = !syncing) { onRefresh() },
                contentAlignment = Alignment.Center,
            ) {
                if (syncing) {
                    SyncSpinner(Modifier.size(18.dp))
                } else {
                    Icon(
                        ic(R.drawable.ic_rotate_ccw), "refresh",
                        tint = if (syncOk == false) mb.danger else mb.glow,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        // search
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
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
                cursorBrush = androidx.compose.ui.graphics.SolidColor(mb.glow),
                decorationBox = { inner ->
                    Box {
                        if (q.isEmpty()) Text(t.search, color = mb.dim, fontSize = 14.sp)
                        inner()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // ── تب رایگان / پرمیوم — دو تب کنار هم ──
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp)),
        ) {
            ServerTabBtn(t.tabFree, freeEnabled.size, tab == "free", Modifier.weight(1f)) { tab = "free" }
            ServerTabBtn(t.tabPremium, premEnabled.size, tab == "premium", Modifier.weight(1f)) { tab = "premium" }
        }

        // smart connect
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.glow.copy(alpha = 0.1f))
                .border(1.dp, mb.glow.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                .clickable { best?.let { onSelect(it.key) } }
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_zap), null, tint = mb.glow, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(t.smart, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    if (best != null) {
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "→ ${best.name} · ${best.ping} ms",
                            color = mb.dim, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                Text(t.smartSub, color = mb.dim, fontSize = 13.sp)
            }
            FwdChevron(rtl, Modifier.size(16.dp))
        }

        // meta row + sync status
        Row(
            Modifier.fillMaxWidth().padding(top = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("${t.locations} · ${list.size}", color = mb.dim, fontSize = 13.sp)
            Spacer(Modifier.width(14.dp))
            PingDot()
            Spacer(Modifier.width(6.dp))
            Text(t.livePing, color = mb.dim, fontSize = 13.sp)
            Spacer(Modifier.width(10.dp))
            SyncStatusText(lang, syncing, syncOk, lastSyncAt, Modifier.weight(1f))
        }

        // دیاگ نوز سنک — آدرس سرور و خطای آخرین تلاش (برای شفافیت کامل)
        if (syncError.isNotBlank()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(mb.danger.copy(alpha = 0.1f))
                    .border(1.dp, mb.danger.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(ic(R.drawable.ic_shield_alert), null, tint = mb.danger, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(t.syncErrorTitle, color = mb.danger, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        syncError, color = mb.dim, fontSize = 10.sp,
                        maxLines = 2, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        } else if (serverHost.isNotBlank()) {
            Text(
                serverHost, color = mb.ink.copy(alpha = 0.35f), fontSize = 10.sp,
                modifier = Modifier.padding(top = 8.dp), maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }

        // list
        LazyColumn(
            Modifier.fillMaxWidth().weight(1f).padding(top = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(list, key = { it.key }) { c ->
                ServerRow(
                    c = c, lang = lang, selected = c.key == selectedKey,
                    locked = c.premium && !premiumUser, isBest = best?.key == c.key,
                    fav = c.key in favorites,
                    onToggleFav = onToggleFav,
                    onClick = { if (c.premium && !premiumUser) onPremiumTap() else onSelect(c.key) },
                )
            }
            if (list.isEmpty()) {
                item { EmptyHint(if (enabled.isEmpty()) t.noServers else t.noMatch) }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }
}

@Composable
private fun ServerRow(
    c: ConfigItem,
    lang: Lang,
    selected: Boolean,
    locked: Boolean,
    isBest: Boolean,
    fav: Boolean = false,
    onToggleFav: (String) -> Unit = {},
    onClick: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (locked) mb.panel.copy(alpha = 0.6f) else mb.panel)
            .border(
                1.dp,
                when {
                    selected -> mb.glow.copy(alpha = 0.4f)
                    locked -> mb.panelEdge
                    else -> mb.panelEdge
                },
                RoundedCornerShape(12.dp),
            )
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Flag(c.country, 32.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(c.name, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                if (locked) t.premiumLockSub else c.protocol,
                color = mb.dim, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Spacer(Modifier.width(8.dp))
        Text(
            "${c.ping} ms",
            color = pingColor(c.ping, mb),
            fontSize = 13.sp,
            modifier = Modifier.width(56.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
        )
        if (!locked) {
            Spacer(Modifier.width(4.dp))
            // ── ستارهٔ منتخب‌ها (نسخهٔ ۲) ──
            Icon(
                ic(R.drawable.ic_star),
                null,
                tint = if (fav) mb.gold else mb.ink.copy(alpha = 0.25f),
                modifier = Modifier
                    .size(18.dp)
                    .clickable { onToggleFav(c.key) },
            )
        }
        if (isBest && !locked) {
            Spacer(Modifier.width(6.dp))
            Text(
                t.best,
                color = mb.glow, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .background(mb.glow.copy(alpha = 0.15f), RoundedCornerShape(50))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
        if (locked) {
            Spacer(Modifier.width(6.dp))
            Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(16.dp))
            Icon(ic(R.drawable.ic_lock), null, tint = mb.gold, modifier = Modifier.size(16.dp))
        } else {
            Spacer(Modifier.width(8.dp))
            if (selected) {
                Box(
                    Modifier.size(20.dp).clip(CircleShape).background(mb.glow),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(ic(R.drawable.ic_check), null, tint = mb.onGlow, modifier = Modifier.size(13.dp))
                }
            } else {
                Box(
                    Modifier.size(20.dp).clip(CircleShape)
                        .border(2.dp, mb.ink.copy(alpha = 0.25f), CircleShape),
                )
            }
        }
    }
}

/** Pulsing live-ping dot. */
@Composable
fun PingDot() {
    val mb = LocalMb.current
    val trans = androidx.compose.animation.core.rememberInfiniteTransition(label = "pingdot")
    val alpha by trans.animateFloat(
        0.25f, 1f,
        androidx.compose.animation.core.infiniteRepeatable(
            androidx.compose.animation.core.tween(900), androidx.compose.animation.core.RepeatMode.Reverse,
        ), label = "pa",
    )
    Box(
        Modifier.size(8.dp).clip(CircleShape).background(mb.glow.copy(alpha = alpha)),
    )
}

/** دکمهٔ تب رایگان/پرمیوم — نیمهٔ سگمنت کنار هم. */
@Composable
private fun ServerTabBtn(
    title: String,
    count: Int,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val mb = LocalMb.current
    Box(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) mb.glow.copy(alpha = 0.14f) else Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                title,
                color = if (active) mb.glow else mb.dim,
                fontSize = 14.sp,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
            )
            Spacer(Modifier.width(6.dp))
            Text(
                "$count",
                color = if (active) mb.glow.copy(alpha = 0.7f) else mb.dim.copy(alpha = 0.6f),
                fontSize = 12.sp,
            )
        }
    }
}

/** چرخنده‌ی همگام‌سازی. */
@Composable
private fun SyncSpinner(modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    val trans = rememberInfiniteTransition(label = "syncspin")
    val angle by trans.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(900, easing = LinearEasing)),
        label = "sa",
    )
    androidx.compose.foundation.Canvas(modifier) {
        rotate(angle) {
            drawArc(
                mb.glow, startAngle = 0f, sweepAngle = 270f, useCenter = false,
                style = Stroke(
                    2.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round,
                ),
                topLeft = Offset.Zero,
            )
        }
    }
}

/** خط وضعیت همگام‌سازی — موفق/ناموفق/هرگز. */
@Composable
private fun SyncStatusText(
    lang: Lang,
    syncing: Boolean,
    syncOk: Boolean?,
    lastSyncAt: Long,
    modifier: Modifier = Modifier,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val (text, color) = when {
        syncing -> t.syncing to mb.glow
        syncOk == null -> t.syncNever to mb.dim
        syncOk == true -> {
            val mins = ((System.currentTimeMillis() - lastSyncAt) / 60_000L).coerceAtLeast(0L)
            val minsStr = if (mins < 1) (if (lang == Lang.FA) "<۱" else "<1") else mins.toString()
            t.syncOkAgo(minsStr) to mb.dim
        }
        else -> t.syncFail to mb.danger
    }
    Text(
        text, color = color, fontSize = 12.sp,
        modifier = modifier,
        textAlign = androidx.compose.ui.text.style.TextAlign.End,
        maxLines = 1, overflow = TextOverflow.Ellipsis,
    )
}
