package com.mianboor.vpn.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.ConfigItem
import com.mianboor.vpn.PayInfo
import com.mianboor.vpn.R
import com.mianboor.vpn.RemoteDevice
import com.mianboor.vpn.RemoteOrder
import com.mianboor.vpn.XrayConfigBuilder

// ---------------------------------------------------------------------------
// Admin login
// ---------------------------------------------------------------------------

@Composable
fun AdminLogin(
    check: (String, String) -> Boolean,
    onSuccess: () -> Unit,
    onCancel: () -> Unit,
) {
    val mb = LocalMb.current
    var u by remember { mutableStateOf("") }
    var p by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    var left by remember { mutableIntStateOf(5) }
    var err by remember { mutableStateOf("") }
    var lockUntil by remember { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }

    androidx.compose.runtime.LaunchedEffect(lockUntil) {
        while (lockUntil > System.currentTimeMillis()) {
            now = System.currentTimeMillis()
            kotlinx.coroutines.delay(250)
        }
        now = System.currentTimeMillis()
    }

    val locked = lockUntil > now
    val wait = ((lockUntil - now) / 1000).toInt() + 1

    fun submit() {
        if (locked) return
        if (check(u.trim(), p)) {
            onSuccess()
            return
        }
        val n = left - 1
        if (n <= 0) {
            lockUntil = System.currentTimeMillis() + 30_000
            left = 5
            err = "Too many attempts. Locked."
        } else {
            left = n
            err = "Wrong username or password · $n tries left"
        }
        p = ""
    }

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
    ) {
        Icon(
            ic(R.drawable.ic_chevron_left), "close", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onCancel() },
        )
        Column(Modifier.fillMaxWidth().padding(top = 36.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(mb.gold.copy(alpha = 0.1f))
                    .border(1.dp, mb.gold.copy(alpha = 0.4f), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_lock), null, tint = mb.gold, modifier = Modifier.size(28.dp))
            }
            Text("Restricted", color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 20.dp))
            Text("Authorized personnel only", color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
        }

        Column(Modifier.fillMaxWidth().padding(top = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            BasicTextField(
                value = u, onValueChange = { u = it }, singleLine = true, enabled = !locked,
                textStyle = TextStyle(color = mb.ink, fontSize = 15.sp),
                cursorBrush = SolidColor(mb.gold),
                decorationBox = { inner ->
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.panel)
                            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                            .padding(horizontal = 16.dp, vertical = 13.dp),
                    ) {
                        if (u.isEmpty()) Text("Username", color = mb.dim, fontSize = 15.sp)
                        inner()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                BasicTextField(
                    value = p, onValueChange = { p = it }, singleLine = true, enabled = !locked,
                    textStyle = TextStyle(color = mb.ink, fontSize = 15.sp),
                    cursorBrush = SolidColor(mb.gold),
                    visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
                    decorationBox = { inner ->
                        Box(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp)) {
                            if (p.isEmpty()) Text("Password", color = mb.dim, fontSize = 15.sp)
                            inner()
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    ic(if (show) R.drawable.ic_eye_off else R.drawable.ic_eye),
                    "show", tint = mb.dim,
                    modifier = Modifier
                        .size(20.dp)
                        .clickable { show = !show }
                        .padding(end = 14.dp),
                )
            }
            Text(
                if (locked) "Locked · try again in ${wait}s" else err,
                color = mb.danger, fontSize = 13.sp,
                modifier = Modifier.height(18.dp),
            )
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.gold)
                    .clickable(enabled = !locked) { submit() }
                    .padding(vertical = 13.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("Unlock", color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Add config sheet
// ---------------------------------------------------------------------------

@Composable
private fun AddConfigSheet(
    onClose: () -> Unit,
    onAdd: (name: String, country: String, link: String, premium: Boolean) -> Unit,
) {
    val mb = LocalMb.current
    var link by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("de") }
    var premium by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf("") }

    val parsed = remember(link) { XrayConfigBuilder.parseLink(link.trim(), "", "") }

    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(mb.panel)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Box(
            Modifier
                .width(40.dp)
                .height(4.dp)
                .background(mb.ink.copy(alpha = 0.2f), RoundedCornerShape(50))
                .align(Alignment.CenterHorizontally),
        )
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Add config", color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Icon(ic(R.drawable.ic_x), "close", tint = mb.dim,
                modifier = Modifier.size(20.dp).clickable { onClose() })
        }

        BasicTextField(
            value = link,
            onValueChange = {
                link = it
                err = ""
                val pr = XrayConfigBuilder.parseLink(it.trim(), "", "")
                if (pr != null && name.isEmpty()) name = pr.name
            },
            textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
            cursorBrush = SolidColor(mb.gold),
            decorationBox = { inner ->
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                ) {
                    if (link.isEmpty()) Text("vless://… or vmess://…", color = mb.dim, fontSize = 13.sp)
                    inner()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(
                Modifier.clickable {
                    link = "vless://8f2e1c9a@fr1.mianboor.app:443?security=reality&sni=cdn.example.com#France-Paris"
                    name = "France - Paris"
                    country = "fr"
                    err = ""
                },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(ic(R.drawable.ic_copy), null, tint = mb.gold, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp))
                Text("Paste sample link", color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.weight(1f))
            if (parsed != null) {
                Text(
                    parsed.protocol.uppercase(),
                    color = mb.glow, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(mb.glow.copy(alpha = 0.15f), RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }

        BasicTextField(
            value = name,
            onValueChange = { name = it },
            singleLine = true,
            textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
            cursorBrush = SolidColor(mb.gold),
            decorationBox = { inner ->
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 13.dp),
                ) {
                    if (name.isEmpty()) Text("Display name (e.g. Germany - Berlin)", color = mb.dim, fontSize = 14.sp)
                    inner()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        // country chips
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            COUNTRIES.keys.forEach { c ->
                val selected = country == c
                Box(
                    Modifier
                        .then(
                            if (selected) Modifier.border(2.dp, mb.gold, CircleShape)
                            else Modifier,
                        )
                        .padding(2.dp),
                ) {
                    Flag(c, 30.dp, Modifier.clickable { country = c })
                }
            }
        }

        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.night)
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Premium only", color = mb.ink, fontSize = 14.sp, modifier = Modifier.weight(1f))
            MbSwitch(premium) { premium = it }
        }

        if (err.isNotEmpty()) {
            Text(err, color = mb.danger, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
        }
        if (parsed == null && link.isNotBlank()) {
            Text("Paste a valid link (vless://, vmess://, trojan://, ss://)", color = mb.danger, fontSize = 13.sp,
                modifier = Modifier.padding(top = 8.dp))
        }

        Box(
            Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.gold)
                .clickable {
                    if (parsed == null) {
                        err = "Paste a valid link (vless://, vmess://, trojan://, ss://)"
                    } else {
                        onAdd(
                            name.trim().ifEmpty { parsed.name.ifEmpty { COUNTRIES[country] ?: "New Server" } },
                            country,
                            link.trim(),
                            premium,
                        )
                    }
                }
                .padding(vertical = 13.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text("Save & publish", color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        }
    }
}

// ---------------------------------------------------------------------------
// Orders tab — server-wide orders (every device)
// ---------------------------------------------------------------------------

private fun planLabel(plan: String): String = when (plan) {
    "p1" -> "1 month"; "p3" -> "3 months"; else -> "6 months"
}

private fun planPrice(plan: String): Long = when (plan) {
    "p1" -> 200_000L; "p3" -> 400_000L; else -> 700_000L
}

private fun planDaysOf(plan: String): Int = when (plan) {
    "p1" -> 30; "p3" -> 90; else -> 180
}

private fun timeAgo(ts: Long): String {
    if (ts <= 0L) return "—"
    val s = (System.currentTimeMillis() - ts) / 1000L
    return when {
        s < 60 -> "just now"
        s < 3600 -> "${s / 60}m ago"
        s < 86400 -> "${s / 3600}h ago"
        else -> "${s / 86400}d ago"
    }
}

@Composable
private fun OrdersTab(
    orders: List<RemoteOrder>,
    busy: Boolean,
    onAction: (String, String) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val mb = LocalMb.current
    val list = orders.sortedWith(
        compareByDescending<RemoteOrder> { it.status == "pending" }.thenByDescending { it.createdAt },
    )
    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (busy) "Loading orders…" else "${list.count { it.status == "pending" }} pending · ${list.size} total",
                color = mb.dim, fontSize = 12.sp, modifier = Modifier.weight(1f),
            )
            Icon(
                ic(R.drawable.ic_rotate_ccw), "refresh", tint = mb.glow,
                modifier = Modifier.size(18.dp).clickable { onRefresh() },
            )
        }
        LazyColumn(
            Modifier.fillMaxWidth().weight(1f).padding(top = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (list.isEmpty() && !busy) {
                item {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.panel)
                            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(ic(R.drawable.ic_receipt_text), null, tint = mb.dim, modifier = Modifier.size(30.dp))
                        Text("No orders yet", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 8.dp))
                        Text(
                            "When a user buys a plan (card-to-card or Telegram), the order lands here — approve it and their device turns premium on the next sync.",
                            color = mb.dim, fontSize = 13.sp, lineHeight = 20.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
            items(list, key = { it.id }) { o ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (o.status == "pending") mb.panel else mb.panel.copy(alpha = 0.6f))
                        .border(
                            1.dp,
                            if (o.status == "pending") mb.gold.copy(alpha = 0.4f) else mb.panelEdge,
                            RoundedCornerShape(12.dp),
                        )
                        .padding(12.dp),
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(o.id, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        Text(timeAgo(o.createdAt), color = mb.dim, fontSize = 11.sp)
                        Spacer(Modifier.width(8.dp))
                        StatusChip(o.status)
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(planLabel(o.plan), color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text("%,d T".format(planPrice(o.plan)).replace(",", "٬"), color = mb.dim, fontSize = 13.sp)
                        Icon(ic(R.drawable.ic_fingerprint), null, tint = mb.dim, modifier = Modifier.size(13.dp))
                        Text(o.deviceId, color = mb.glow, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text("· ${o.via}", color = mb.dim, fontSize = 13.sp)
                    }
                    if (o.status == "pending") {
                        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(9.dp))
                                    .background(mb.gold)
                                    .clickable { onAction(o.id, "approve") }
                                    .padding(vertical = 9.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(ic(R.drawable.ic_crown), null, tint = mb.night, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Approve premium", color = mb.night, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                            Row(
                                Modifier
                                    .clip(RoundedCornerShape(9.dp))
                                    .border(1.dp, mb.danger.copy(alpha = 0.5f), RoundedCornerShape(9.dp))
                                    .clickable { onAction(o.id, "reject") }
                                    .padding(horizontal = 16.dp, vertical = 9.dp),
                            ) {
                                Text("Reject", color = mb.danger, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    if (o.status == "approved") {
                        Text(
                            "Premium +${planDaysOf(o.plan)} days for ${o.deviceId}",
                            color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Users tab — devices & premium management (Telegram purchases)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Users tab — devices & premium management (Telegram purchases)
// ---------------------------------------------------------------------------

@Composable
private fun UsersTab(
    devices: List<RemoteDevice>,
    ownDeviceId: String,
    busy: Boolean,
    onDevicePremium: (String, Int) -> Unit,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val mb = LocalMb.current
    var q by remember { mutableStateOf("") }
    val list = devices.filter { it.id.contains(q, ignoreCase = true) }
    val premiumCount = devices.count { it.premium }

    Column(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                if (busy) "Loading devices…" else "$premiumCount premium · ${devices.size} devices",
                color = mb.dim, fontSize = 12.sp, modifier = Modifier.weight(1f),
            )
            Icon(
                ic(R.drawable.ic_rotate_ccw), "refresh", tint = mb.glow,
                modifier = Modifier.size(18.dp).clickable { onRefresh() },
            )
        }
        Text(
            "Telegram purchase? Ask for their device code (Account → device ID), search it here and grant days.",
            color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
            modifier = Modifier.padding(top = 6.dp),
        )
        // search
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ic(R.drawable.ic_search), null, tint = mb.dim, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(8.dp))
            BasicTextField(
                value = q,
                onValueChange = { q = it },
                singleLine = true,
                textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                cursorBrush = SolidColor(mb.glow),
                decorationBox = { inner ->
                    Box {
                        if (q.isEmpty()) Text("MB-…", color = mb.dim, fontSize = 13.sp)
                        inner()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        LazyColumn(
            Modifier.fillMaxWidth().weight(1f).padding(top = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (list.isEmpty() && !busy) {
                item {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.panel)
                            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(ic(R.drawable.ic_users), null, tint = mb.dim, modifier = Modifier.size(30.dp))
                        Text("No devices yet", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 8.dp))
                        Text(
                            "Devices appear here automatically once they open the app and sync.",
                            color = mb.dim, fontSize = 13.sp, lineHeight = 20.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
            items(list, key = { it.id }) { d ->
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.panel)
                        .border(
                            1.dp,
                            if (d.premium) mb.gold.copy(alpha = 0.4f) else mb.panelEdge,
                            RoundedCornerShape(12.dp),
                        )
                        .padding(12.dp),
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_fingerprint), null, tint = if (d.premium) mb.gold else mb.dim, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            d.id,
                            color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis,
                        )
                        if (d.id == ownDeviceId) {
                            Text(
                                "THIS DEVICE",
                                color = mb.glow, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .background(mb.glow.copy(alpha = 0.15f), RoundedCornerShape(50))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                            Spacer(Modifier.width(6.dp))
                        }
                        Text(
                            if (d.premium) "PREMIUM" else "FREE",
                            color = if (d.premium) mb.gold else mb.dim,
                            fontSize = 10.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .background(
                                    (if (d.premium) mb.gold else mb.dim).copy(alpha = 0.15f),
                                    RoundedCornerShape(50),
                                )
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                    if (d.premium && d.premiumUntil > 0L) {
                        Text(
                            "until " + java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale.US).format(java.util.Date(d.premiumUntil)),
                            color = mb.dim, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    Text(
                        "last seen " + timeAgo(d.lastSeenAt),
                        color = mb.dim, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp),
                    )
                    Row(
                        Modifier.fillMaxWidth().padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        GrantBtn("+30d", mb) { onDevicePremium(d.id, 30) }
                        GrantBtn("+90d", mb) { onDevicePremium(d.id, 90) }
                        GrantBtn("+180d", mb) { onDevicePremium(d.id, 180) }
                        if (d.premium) {
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(1.dp, mb.danger.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                                    .clickable { onDevicePremium(d.id, 0) }
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                            ) {
                                Text("Revoke", color = mb.danger, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GrantBtn(label: String, mb: com.mianboor.vpn.ui.MbColors, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(mb.glow.copy(alpha = 0.15f))
            .border(1.dp, mb.glow.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Text(label, color = mb.glow, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

// ---------------------------------------------------------------------------
// Server tab — sync key, payment info, hardening
// ---------------------------------------------------------------------------

private val HARDENING = listOf(
    "R8 + ProGuard — code, strings & APIs obfuscated",
    "Client token sealed at build time (CI secrets)",
    "TLS-protected calls to mianboor APIs",
    "No config link is ever rendered in the UI",
    "Admin session dies with the app · no visible entry",
    "Config raw links kept only in private app storage",
)

@Composable
private fun ServerTab(
    blockRoot: Boolean,
    onBlockRoot: (Boolean) -> Unit,
    onChangePass: (String) -> Unit,
    serverKey: String,
    onServerKey: (String) -> Unit,
    onTestKey: (String, (Boolean) -> Unit) -> Unit,
    payInfo: PayInfo,
    onSavePayInfo: (PayInfo) -> Unit,
    toast: (String) -> Unit,
    modifier: Modifier = Modifier,
    serverOld: Boolean = false,
) {
    val mb = LocalMb.current
    val context = LocalContext.current
    val t = stringsOf(if (AppPrefs.lang(context) == "fa") Lang.FA else Lang.EN)
    var np by remember { mutableStateOf("") }
    var sk by remember(serverKey) { mutableStateOf(serverKey) }
    var testing by remember { mutableStateOf(false) }
    var card by remember(payInfo) { mutableStateOf(payInfo.card) }
    var holder by remember(payInfo) { mutableStateOf(payInfo.holder) }
    var note by remember(payInfo) { mutableStateOf(payInfo.note) }

    LazyColumn(
        modifier.fillMaxWidth().padding(top = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── هشدار نسخهٔ قدیمی سرور — انتشار کانفیگ/سفارش به سرور نمی‌رسد ──
        if (serverOld) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.danger.copy(alpha = 0.12f))
                        .border(1.dp, mb.danger.copy(alpha = 0.45f), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("⚠", color = mb.danger, fontSize = 20.sp)
                    Spacer(Modifier.width(10.dp))
                    Text(t.serverOldWarn, color = mb.danger, fontSize = 12.sp, lineHeight = 17.sp)
                }
            }
        }
        // ── server sync key ──
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_server), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Server sync key", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Text(
                    "Must match ADMIN_SYNC_KEY (or ADMIN_PASSWORD) on the server. With it, configs you add are published to every device and user management goes online. Shipped by default — change only if you rotated the server key.",
                    color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
                BasicTextField(
                    value = sk,
                    onValueChange = { sk = it },
                    singleLine = true,
                    textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
                    cursorBrush = SolidColor(mb.gold),
                    visualTransformation = PasswordVisualTransformation(),
                    decorationBox = { inner ->
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                                .clip(RoundedCornerShape(9.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(9.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                        ) {
                            if (sk.isEmpty()) Text("ADMIN_SYNC_KEY of the server", color = mb.dim, fontSize = 13.sp)
                            inner()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(9.dp))
                            .background(mb.gold)
                            .clickable {
                                onServerKey(sk)
                                toast(if (sk.isBlank()) "Server sync disabled" else "Server sync enabled")
                            }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("Save & sync", color = mb.night, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(9.dp))
                            .border(1.dp, mb.glow.copy(alpha = 0.5f), RoundedCornerShape(9.dp))
                            .clickable(enabled = !testing && sk.isNotBlank()) {
                                testing = true
                                onTestKey(sk) { ok ->
                                    testing = false
                                    toast(if (ok) "Connected — key is valid" else "Failed — wrong key or unreachable server")
                                }
                            }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (testing) "Testing…" else "Test",
                            color = mb.glow, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
        // ── payment info ──
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_credit_card), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Card-to-card payment info", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Text(
                    "Shown to every user in the purchase sheet. Copy-paste your card number exactly.",
                    color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
                AdminField(card, { card = it }, "Card number · 6037-…", mb, Modifier.padding(top = 12.dp))
                AdminField(holder, { holder = it }, "Card holder name", mb, Modifier.padding(top = 8.dp))
                AdminField(note, { note = it }, "Note for users (optional)", mb, Modifier.padding(top = 8.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(9.dp))
                        .background(mb.gold)
                        .clickable { onSavePayInfo(PayInfo(card.trim(), holder.trim(), note.trim())) }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Save payment info", color = mb.night, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        // ── app hardening ──
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("App hardening", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    HARDENING.forEach { h ->
                        Row {
                            Icon(ic(R.drawable.ic_check), null, tint = mb.glow, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(h, color = mb.dim, fontSize = 13.sp, lineHeight = 18.sp)
                        }
                    }
                }
            }
        }
        // ── block rooted devices ──
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Block rooted devices", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                MbSwitch(blockRoot, onChange = onBlockRoot)
            }
        }
        // ── change admin password ──
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(16.dp),
            ) {
                Text("Change admin password", color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                BasicTextField(
                    value = np,
                    onValueChange = { np = it },
                    singleLine = true,
                    textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
                    cursorBrush = SolidColor(mb.gold),
                    visualTransformation = PasswordVisualTransformation(),
                    decorationBox = { inner ->
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                                .clip(RoundedCornerShape(9.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(9.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                        ) {
                            if (np.isEmpty()) Text("New password (min 8)", color = mb.dim, fontSize = 13.sp)
                            inner()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(9.dp))
                        .background(if (np.length >= 8) mb.gold else mb.gold.copy(alpha = 0.4f))
                        .clickable(enabled = np.length >= 8) {
                            onChangePass(np)
                            np = ""
                            toast("Password updated")
                        }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Update", color = mb.night, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        item {
            Text(
                "Lock after 5 wrong tries · Session ends when app closes.",
                color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp,
            )
        }
    }
}

@Composable
private fun AdminField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    mb: com.mianboor.vpn.ui.MbColors,
    modifier: Modifier = Modifier,
) {
    BasicTextField(
        value = value,
        onValueChange = onChange,
        singleLine = true,
        textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
        cursorBrush = SolidColor(mb.glow),
        decorationBox = { inner ->
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(9.dp))
                    .background(mb.night)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(9.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                if (value.isEmpty()) Text(placeholder, color = mb.dim, fontSize = 13.sp)
                inner()
            }
        },
        modifier = modifier.fillMaxWidth(),
    )
}

// ---------------------------------------------------------------------------
// Panel shell
// ---------------------------------------------------------------------------

@Composable
fun AdminPanel(
    configs: List<ConfigItem>,
    orders: List<RemoteOrder>,
    devices: List<RemoteDevice>,
    ownDeviceId: String,
    blockRoot: Boolean,
    serverKey: String,
    payInfo: PayInfo,
    adminBusy: Boolean,
    onServerKey: (String) -> Unit,
    onTestKey: (String, (Boolean) -> Unit) -> Unit,
    onSavePayInfo: (PayInfo) -> Unit,
    onRefreshAdmin: () -> Unit,
    onDevicePremium: (String, Int) -> Unit,
    onToggleConfig: (String, Boolean) -> Unit,
    onDeleteConfig: (String) -> Unit,
    onTogglePremium: (String) -> Unit,
    onAddConfig: (name: String, country: String, link: String, premium: Boolean) -> Unit,
    onOrderAction: (String, String) -> Unit,
    onBlockRoot: (Boolean) -> Unit,
    onChangePass: (String) -> Unit,
    onExit: () -> Unit,
    toast: (String) -> Unit,
    serverOld: Boolean = false,
) {
    val mb = LocalMb.current
    var tab by remember { mutableStateOf("configs") }
    var adding by remember { mutableStateOf(false) }

    val active = configs.count { it.enabled }
    val pending = orders.count { it.status == "pending" }
    val premiumDevices = devices.count { it.premium }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_key_round), null, tint = mb.gold, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Admin mode", color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Text("Control Panel", color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                }
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(mb.panel)
                        .clickable { onExit() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(ic(R.drawable.ic_log_out), "exit", tint = mb.dim, modifier = Modifier.size(20.dp))
                }
            }

            // stats
            Row(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard(configs.size.toString(), "Configs", Modifier.weight(1f))
                StatCard(active.toString(), "Live", Modifier.weight(1f))
                StatCard(pending.toString(), "Pending", Modifier.weight(1f))
                StatCard(premiumDevices.toString(), "Premium", Modifier.weight(1f))
            }

            // tabs
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.panel)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                listOf(
                    "configs" to "Configs",
                    "orders" to "Orders",
                    "users" to "Users",
                    "server" to "Server",
                ).forEach { (tb, label) ->
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(9.dp))
                            .background(if (tab == tb) mb.night else androidx.compose.ui.graphics.Color.Transparent)
                            .clickable { tab = tb }
                            .padding(vertical = 9.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            label,
                            color = if (tab == tb) mb.ink else mb.dim,
                            fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        )
                        // نشان تعداد سفارش‌های در انتظار روی تب Orders
                        if (tb == "orders" && pending > 0) {
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 2.dp, end = 10.dp)
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(mb.gold),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("$pending", color = mb.night, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            if (tab == "configs") {
                Row(
                    Modifier.fillMaxWidth().padding(top = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Published on the server — users receive them on sync",
                        color = mb.dim, fontSize = 12.sp, modifier = Modifier.weight(1f),
                    )
                    Icon(
                        ic(R.drawable.ic_rotate_ccw), "refresh", tint = mb.glow,
                        modifier = Modifier.size(18.dp).clickable { onRefreshAdmin() },
                    )
                }
                LazyColumn(
                    Modifier.fillMaxWidth().weight(1f).padding(top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(configs, key = { it.key }) { c ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (c.enabled) mb.panel else mb.panel.copy(alpha = 0.5f))
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Flag(c.country, 30.dp)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        c.name, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f, fill = false),
                                    )
                                    if (c.premium) {
                                        Spacer(Modifier.width(4.dp))
                                        Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(13.dp))
                                    }
                                }
                                Text(
                                    "${c.protocol} · ${c.host}",
                                    color = mb.dim, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                )
                            }
                            // premium toggle
                            Icon(
                                ic(R.drawable.ic_crown), "premium", tint = if (c.premium) mb.gold else mb.dim.copy(alpha = 0.4f),
                                modifier = Modifier
                                    .size(18.dp)
                                    .clickable { onTogglePremium(c.key) },
                            )
                            Spacer(Modifier.width(10.dp))
                            MbSwitch(c.enabled) { v -> onToggleConfig(c.key, v) }
                            Spacer(Modifier.width(10.dp))
                            Icon(
                                ic(R.drawable.ic_trash_2), "delete", tint = mb.dim,
                                modifier = Modifier
                                    .size(17.dp)
                                    .clickable {
                                        onDeleteConfig(c.key)
                                        toast("Config removed")
                                    },
                            )
                        }
                    }
                    item { Spacer(Modifier.height(70.dp)) }
                }
            } else if (tab == "orders") {
                OrdersTab(
                    orders, adminBusy,
                    onAction = onOrderAction,
                    onRefresh = onRefreshAdmin,
                    Modifier.fillMaxWidth().weight(1f),
                )
            } else if (tab == "users") {
                UsersTab(
                    devices, ownDeviceId, adminBusy,
                    onDevicePremium = onDevicePremium,
                    onRefresh = onRefreshAdmin,
                    Modifier.fillMaxWidth().weight(1f),
                )
            } else {
                ServerTab(
                    blockRoot, onBlockRoot, onChangePass,
                    serverKey, onServerKey, onTestKey,
                    payInfo, onSavePayInfo, toast,
                    Modifier.fillMaxWidth().weight(1f),
                    serverOld = serverOld,
                )
            }
        }

        // add config FAB
        AnimatedVisibility(
            visible = tab == "configs" && !adding,
            enter = fadeIn() + slideInVertically { it },
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 18.dp),
        ) {
            Row(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(mb.gold)
                    .clickable { adding = true }
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(ic(R.drawable.ic_plus), null, tint = mb.night, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Add config", color = mb.night, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }

        // toast + sheet overlays
        if (adding) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(mb.night.copy(alpha = 0.7f))
                    .clickable { adding = false },
                contentAlignment = Alignment.BottomCenter,
            ) {
                Box(Modifier.consumeClicks()) {
                    AddConfigSheet(
                        onClose = { adding = false },
                        onAdd = { name, country, link, premium ->
                            onAddConfig(name, country, link, premium)
                            adding = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    Column(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(mb.panel)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(value, color = mb.ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = mb.dim, fontSize = 13.sp)
    }
}
