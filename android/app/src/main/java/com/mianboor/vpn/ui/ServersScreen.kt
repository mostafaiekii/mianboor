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
import androidx.compose.animation.core.animateFloat
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
    onSelect: (String) -> Unit,
    onPremiumTap: () -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    var q by remember { mutableStateOf("") }

    val list = configs.filter {
        it.enabled && it.name.lowercase().contains(q.lowercase())
    }
    val enabled = configs.filter { it.enabled }
    val freeEnabled = enabled.filter { !it.premium }
    // Smart Connect really measures: lowest live ping among the servers this user can join.
    val pool = if (premiumUser || freeEnabled.isEmpty()) enabled else freeEnabled
    val best = pool.minByOrNull { it.ping }

    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Icon(
            ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            "back", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )
        Text(
            t.selectLocation, color = mb.ink, fontSize = 24.sp,
            fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp),
        )

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

        // meta row
        Row(
            Modifier.fillMaxWidth().padding(top = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("${t.locations} · ${list.size}", color = mb.dim, fontSize = 13.sp)
            Spacer(Modifier.width(14.dp))
            PingDot()
            Spacer(Modifier.width(6.dp))
            Text(t.livePing, color = mb.dim, fontSize = 13.sp)
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
