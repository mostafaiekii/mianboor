package com.mianboor.vpn.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R

const val FREE_QUOTA_GB = 5

@Composable
fun AccountScreen(
    lang: Lang,
    premium: Boolean,
    planId: String?,
    expiresAt: Long,
    trialLocked: Boolean,
    usedGb: Double,
    splitCount: Int,
    splitMode: String,
    deviceId: String,
    killSwitch: Boolean,
    autoConnect: Boolean,
    onKillSwitch: (Boolean) -> Unit,
    onAutoConnect: (Boolean) -> Unit,
    onOpenSplit: () -> Unit,
    onUpgrade: () -> Unit,
    onSupport: () -> Unit,
    toast: (String) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val clipboard = LocalClipboardManager.current
    var renewOpen by remember { mutableStateOf(false) }

    val pct = if (premium) 1f else (usedGb / FREE_QUOTA_GB).toFloat()
    val usedStr = if (premium) "∞" else String.format(java.util.Locale.US, "%.1f", usedGb)
    val totalStr = if (premium) t.unlimited else "$FREE_QUOTA_GB GB"
    val until = if (expiresAt > 0) formatDate(expiresAt, lang) else ""
    val splitSub = if (splitCount == 0) t.splitSubOff
    else t.splitSubOn(splitCount, if (splitMode == "exclude") t.modeExcl else t.modeIncl)

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Text(t.account, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold)

        // ── plan card ──
        if (premium) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(mb.gold.copy(alpha = 0.1f))
                    .border(1.dp, mb.gold.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(48.dp).clip(CircleShape).background(mb.gold.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(t.planPremium, color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(6.dp))
                        Icon(ic(R.drawable.ic_badge_check), null, tint = mb.gold, modifier = Modifier.size(16.dp))
                    }
                    Text(t.planPremiumSub, color = mb.dim, fontSize = 13.sp)
                    if (until.isNotEmpty()) {
                        Text(
                            "${t.validUntil} $until",
                            color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
            }
        } else {
            PanelCard(Modifier.padding(top = 12.dp)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(48.dp).clip(CircleShape).background(mb.ink.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(ic(R.drawable.ic_user), null, tint = mb.ink, modifier = Modifier.size(24.dp))
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.planFree, color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Text(t.planFreeSub, color = mb.dim, fontSize = 13.sp)
                    }
                    FwdChevron(rtl)
                }
            }
        }

        // ── usage ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(t.dataUsage, color = mb.dim, fontSize = 13.sp)
                    when {
                        premium -> Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(t.unlimited, color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        }
                        trialLocked -> Text(
                            t.trialUsedTitle, color = mb.danger,
                            fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 8.dp),
                        )
                        else -> Text(t.resetsOn, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
                    }
                }
                UsageRing(
                    pct = pct,
                    stroke = if (premium) mb.gold else if (trialLocked) mb.danger else mb.glow,
                    big = if (premium) "∞" else "$usedStr GB",
                    small = if (premium) t.unlimited else totalStr,
                )
            }
        }
        if (trialLocked && !premium) {
            Text(
                t.trialUsedSub,
                color = mb.danger, fontSize = 12.sp, lineHeight = 18.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.danger.copy(alpha = 0.1f))
                    .border(1.dp, mb.danger.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            )
        }

        // ── switches ──
        SwitchRow(R.drawable.ic_shield_check, t.killSwitch, t.killSwitchSub, killSwitch, onKillSwitch,
            Modifier.padding(top = 12.dp))
        SwitchRow(R.drawable.ic_wifi, t.autoConnect, t.autoConnectSub, autoConnect, onAutoConnect,
            Modifier.padding(top = 12.dp))

        // ── split tunneling ──
        PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenSplit) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_git_branch), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.split, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(splitSub, color = mb.dim, fontSize = 13.sp)
                }
                FwdChevron(rtl)
            }
        }

        // ── renew subscription explainer ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column {
                Row(
                    Modifier.fillMaxWidth().clickable { renewOpen = !renewOpen }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(ic(R.drawable.ic_info), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.renewRow, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(t.renewWhat, color = mb.dim, fontSize = 13.sp)
                    }
                    Icon(
                        ic(R.drawable.ic_chevron_down), null, tint = mb.dim,
                        modifier = Modifier.size(20.dp),
                    )
                }
                AnimatedVisibility(
                    visible = renewOpen,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically(),
                ) {
                    Text(
                        t.renewExplain,
                        color = mb.dim, fontSize = 13.sp, lineHeight = 20.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp, bottom = 16.dp),
                    )
                }
            }
        }

        // ── support ──
        PanelCard(Modifier.padding(top = 12.dp), onClick = onSupport) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_send), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.support, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(t.supportSub, color = mb.dim, fontSize = 13.sp)
                }
                FwdChevron(rtl)
            }
        }

        // ── device id ──
        PanelCard(Modifier.padding(top = 12.dp), onClick = {
            clipboard.setText(AnnotatedString(deviceId))
            toast(t.copied)
        }) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_fingerprint), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.deviceId, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(t.deviceIdSub, color = mb.dim, fontSize = 13.sp)
                }
                Text(
                    deviceId,
                    color = mb.dim, fontSize = 12.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(mb.night)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
                Spacer(Modifier.width(8.dp))
                Icon(ic(R.drawable.ic_copy), null, tint = mb.dim, modifier = Modifier.size(16.dp))
            }
        }

        // ── upgrade CTA ──
        Box(
            Modifier
                .fillMaxWidth()
                .padding(top = 14.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(mb.glow)
                .clickable { onUpgrade() }
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (premium) t.renewBtn else t.upgrade,
                color = mb.onGlow, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
        }
        Spacer(Modifier.height(14.dp))
    }
}

@Composable
private fun SwitchRow(
    iconRes: Int,
    title: String,
    sub: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val mb = LocalMb.current
    PanelCard(modifier) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(ic(iconRes), null, tint = mb.dim, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(sub, color = mb.dim, fontSize = 13.sp)
            }
            MbSwitch(checked, onChange = onChange)
        }
    }
}

fun formatDate(millis: Long, lang: Lang): String {
    val fmt = java.text.SimpleDateFormat("d MMM yyyy", if (lang == Lang.FA) java.util.Locale("fa") else java.util.Locale.US)
    return fmt.format(java.util.Date(millis))
}
