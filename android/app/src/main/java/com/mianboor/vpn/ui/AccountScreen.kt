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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.R
import kotlin.math.roundToInt

const val FREE_QUOTA_GB = 5

/**
 * پنل حساب — عین دمو: کارت هویت دستگاه + کارت پلن + مصرف + کارت «سرور فعلی»
 * با نوار سگمنتی و آمار ۲×۲ + گزینه‌های بیشتر (سوییچ‌های محافظت، صندوق پیام،
 * دعوت دوستان، پشتیبانی، شناسهٔ دستگاه، حریم خصوصی) + کیف پول + دکمهٔ ارتقا.
 */
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
    onKillSwitch: (Boolean) -> Unit,
    failover: Boolean,
    onFailover: (Boolean) -> Unit,
    autoReconnect: Boolean,
    onAutoReconnect: (Boolean) -> Unit,
    onOpenSplit: () -> Unit,
    onUpgrade: () -> Unit,
    onSupport: () -> Unit,
    onOpenReferral: () -> Unit,
    onOpenSupportChat: () -> Unit,
    onOpenWallet: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
    onOpenInbox: () -> Unit = {},
    unreadCount: Int = 0,
    serverName: String = "",
    serverHost: String = "",
    vpnOn: Boolean = false,
    onOpenServers: () -> Unit = {},
    onDeleteAcc: () -> Unit = {},
    giftDays: Int,
    toast: (String) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    var renewOpen by remember { mutableStateOf(false) }
    var showUsage by remember { mutableStateOf(false) }
    var moreOpen by remember { mutableStateOf(false) }
    var showPass by remember { mutableStateOf(false) }
    var showDelete by remember { mutableStateOf(false) }

    val pct = if (premium) 1f else (usedGb / FREE_QUOTA_GB).toFloat()
    val usedStr = if (premium) "∞" else String.format(java.util.Locale.US, "%.1f", usedGb)
    val totalStr = if (premium) t.unlimited else "$FREE_QUOTA_GB GB"
    val until = if (expiresAt > 0) formatDate(expiresAt, lang) else ""
    val splitSub = if (splitCount == 0) t.splitSubOff
    else t.splitSubOn(splitCount, if (splitMode == "exclude") t.modeExcl else t.modeIncl)

    // ── کارت «سرور فعلی» — مثل دمو ──
    val remainPct = when {
        premium -> 1f
        trialLocked -> 0f
        else -> (1f - usedGb / FREE_QUOTA_GB).coerceIn(0f, 1f)
    }
    val vipDataGb = String.format(java.util.Locale.US, "%.1f", giftDays * 0.25)
    val creditDays = if (expiresAt > 0)
        (((expiresAt - System.currentTimeMillis()) / 86_400_000L).toInt()).coerceAtLeast(0)
    else giftDays
    val ofTxt = if (lang == Lang.FA) "از" else "of"

    Box(Modifier.fillMaxWidth()) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp),
        ) {
            Text(t.account, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold)

            // ── کارت هویت دستگاه — تایید + تعیین گذرواژه / حذف حساب (مثل دمو) ──
            PanelCard(Modifier.padding(top = 12.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(44.dp).clip(CircleShape).background(mb.ink.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(ic(R.drawable.ic_fingerprint), null, tint = mb.ink, modifier = Modifier.size(22.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                deviceId,
                                color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 3.dp)) {
                                Icon(ic(R.drawable.ic_badge_check), null, tint = mb.glow, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(t.verified, color = mb.glow, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(top = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .clickable { showPass = true }
                                .padding(vertical = 11.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(ic(R.drawable.ic_key_round), null, tint = mb.dim, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(t.setPass, color = mb.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.danger.copy(alpha = 0.1f))
                                .border(1.dp, mb.danger.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                .clickable { showDelete = true }
                                .padding(vertical = 11.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(ic(R.drawable.ic_trash_2), null, tint = mb.danger, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(t.deleteAcc, color = mb.danger, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }

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
                PanelCard(Modifier.padding(top = 12.dp), onClick = onUpgrade) {
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

            // ── usage ── (لمس → شیت جزئیات مصرف)
            PanelCard(Modifier.padding(top = 12.dp), onClick = { showUsage = true }) {
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

            // ── کارت «سرور فعلی» — درصد باقی‌مانده + نوار سگمنتی + آمار ۲×۲ ──
            PanelCard(Modifier.padding(top = 12.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f)) {
                            Text(t.svCurrent, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text(
                                serverHost.ifBlank { serverName.ifBlank { "—" } },
                                color = mb.dim, fontSize = 12.sp,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                        Text(
                            if (vpnOn) "● ${t.connected}" else t.svCurrent,
                            color = mb.glow, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(mb.glow.copy(alpha = 0.15f))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                    Text(
                        "${(remainPct * 100).roundToInt()}%",
                        color = mb.ink, fontSize = 30.sp, fontWeight = FontWeight.Black,
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    )
                    SegmentedBar(remainPct, Modifier.padding(top = 8.dp))
                    Spacer(Modifier.height(14.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatCell(
                                Modifier.weight(1f),
                                if (premium) "∞" else "$usedStr GB $ofTxt $totalStr",
                                t.dataUsage,
                            )
                            StatCell(Modifier.weight(1f), "$vipDataGb GB", t.vipData)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            StatCell(Modifier.weight(1f), "1", t.usersOnline)
                            StatCell(Modifier.weight(1f), "$creditDays ${t.days}", t.credit)
                        }
                    }
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 14.dp)
                            .height(1.dp)
                            .background(mb.panelEdge),
                    )
                    InnerRow(R.drawable.ic_server, t.allServices, rtl, onClick = onOpenServers)
                    Spacer(Modifier.height(8.dp))
                    InnerRow(
                        R.drawable.ic_settings,
                        if (moreOpen) t.lessOptions else t.moreOptions,
                        rtl,
                        onClick = { moreOpen = !moreOpen },
                        expanded = moreOpen,
                    )
                }
            }

            // ── تقسیم تونل — همیشه قابل‌مشاهده ──
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

            // ── گزینه‌های بیشتر — با باز شدن نشان داده می‌شوند (مثل دمو) ──
            AnimatedVisibility(
                visible = moreOpen,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                Column {
                    SwitchRow(R.drawable.ic_shield_check, t.killSwitch, t.killSwitchSub, killSwitch, onKillSwitch,
                        Modifier.padding(top = 12.dp))
                    SwitchRow(R.drawable.ic_shield_alert, t.failover, t.failoverSub, failover, onFailover,
                        Modifier.padding(top = 12.dp))
                    SwitchRow(R.drawable.ic_wifi, t.autoReconnect, t.autoReconnectSub, autoReconnect, onAutoReconnect,
                        Modifier.padding(top = 12.dp))

                    // ── صندوق پیام‌ها ──
                    PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenInbox) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_bell), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(t.inbox, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                    if (unreadCount > 0) {
                                        Spacer(Modifier.width(8.dp))
                                        Text(
                                            "$unreadCount",
                                            color = mb.night, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(mb.gold)
                                                .padding(horizontal = 6.dp, vertical = 1.dp),
                                        )
                                    }
                                }
                                Text(t.inboxRowSub, color = mb.dim, fontSize = 13.sp)
                            }
                            FwdChevron(rtl)
                        }
                    }

                    // ── تمدید اشتراک — توضیح‌دهنده ──
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

                    // ── دعوت دوستان (رفرال) ──
                    PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenReferral) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_users), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(t.invite, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                Text(t.inviteSub, color = mb.dim, fontSize = 13.sp)
                            }
                            if (giftDays > 0) {
                                Text(
                                    "+$giftDays",
                                    color = mb.gold, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .background(mb.gold.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp),
                                )
                                Spacer(Modifier.width(8.dp))
                            }
                            FwdChevron(rtl)
                        }
                    }

                    // ── پشتیبانی آنلاین — چت هوشمند داخل اپ + نقطهٔ سبز چشمک‌زن ──
                    PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenSupportChat) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_sparkles), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    val pulse = rememberInfiniteTransition(label = "supp")
                                    val alpha by pulse.animateFloat(
                                        initialValue = 1f,
                                        targetValue = 0.25f,
                                        animationSpec = infiniteRepeatable(tween(750), RepeatMode.Reverse),
                                        label = "dot",
                                    )
                                    Box(
                                        Modifier
                                            .size(7.dp)
                                            .alpha(alpha)
                                            .clip(CircleShape)
                                            .background(mb.glow),
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(t.supportOnline, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                }
                                Text(t.supportSubChat, color = mb.dim, fontSize = 13.sp)
                            }
                            FwdChevron(rtl)
                        }
                    }

                    // ── support (telegram) ──
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
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(mb.night)
                                    .padding(horizontal = 10.dp, vertical = 4.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Icon(ic(R.drawable.ic_copy), null, tint = mb.dim, modifier = Modifier.size(16.dp))
                        }
                    }

                    // ── حریم خصوصی و بدون لاگ ──
                    PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenPrivacy) {
                        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(t.privacyRow, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                Text(t.privacyRowSub, color = mb.dim, fontSize = 13.sp)
                            }
                            FwdChevron(rtl)
                        }
                    }
                }
            }

            // ── کیف پول — همیشه قابل‌مشاهده ──
            PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenWallet) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_credit_card), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(t.wallet, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(t.walletSub, color = mb.dim, fontSize = 13.sp)
                    }
                    FwdChevron(rtl)
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

        // ── شیت جزئیات مصرف (اپ‌ها و سرورها) ──
        if (showUsage) {
            UsageSheet(
                lang = lang,
                usedGb = usedGb,
                totalText = totalStr,
                onDismiss = { showUsage = false },
            )
        }

        // ── شیت تعیین گذرواژه ──
        if (showPass) {
            var pass by remember { mutableStateOf("") }
            val hasPass = remember { AppPrefs.appPass(context).isNotEmpty() }
            androidx.compose.ui.window.Dialog(
                onDismissRequest = { showPass = false },
                properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
            ) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(mb.night.copy(alpha = 0.75f))
                        .clickable(
                            indication = null,
                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                        ) { showPass = false },
                    contentAlignment = Alignment.BottomCenter,
                ) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                            .background(mb.panel)
                            .padding(horizontal = 20.dp, vertical = 18.dp),
                    ) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Icon(ic(R.drawable.ic_key_round), null, tint = mb.glow, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(t.setPass, color = mb.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.weight(1f))
                            Text(
                                "✕", color = mb.dim, fontSize = 15.sp,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { showPass = false }
                                    .padding(6.dp),
                            )
                        }
                        Text(
                            t.passPlaceholder, color = mb.dim, fontSize = 13.sp,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                        BasicTextField(
                            value = pass,
                            onValueChange = { pass = it },
                            singleLine = true,
                            textStyle = TextStyle(color = mb.ink, fontSize = 15.sp),
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                            cursorBrush = androidx.compose.ui.graphics.SolidColor(mb.glow),
                            decorationBox = { inner ->
                                Box {
                                    if (pass.isEmpty()) Text("••••", color = mb.dim, fontSize = 15.sp)
                                    inner()
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .padding(horizontal = 16.dp, vertical = 13.dp),
                        )
                        Row(
                            Modifier.fillMaxWidth().padding(top = 14.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            if (hasPass) {
                                Box(
                                    Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(mb.danger.copy(alpha = 0.12f))
                                        .clickable {
                                            AppPrefs.setAppPass(context, "")
                                            toast(t.passSaved)
                                            showPass = false
                                        }
                                        .padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(t.deleteAcc, color = mb.danger, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(mb.glow)
                                    .clickable {
                                        val p = pass.trim()
                                        if (p.length >= 4) {
                                            AppPrefs.setAppPass(context, p)
                                            toast(t.passSaved)
                                            showPass = false
                                        } else {
                                            toast(t.passPlaceholder)
                                        }
                                    }
                                    .padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(t.saveBtn, color = mb.onGlow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // ── تأیید حذف حساب ──
        if (showDelete) {
            androidx.compose.ui.window.Dialog(onDismissRequest = { showDelete = false }) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(mb.panel)
                        .border(1.dp, mb.panelEdge, RoundedCornerShape(20.dp))
                        .padding(20.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_trash_2), null, tint = mb.danger, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(t.deleteAccAsk, color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(
                        t.deleteAccWarn, color = mb.dim, fontSize = 13.sp, lineHeight = 19.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                    Row(
                        Modifier.fillMaxWidth().padding(top = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .clickable { showDelete = false }
                                .padding(vertical = 11.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(t.cancel, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.danger)
                                .clickable {
                                    showDelete = false
                                    onDeleteAcc()
                                }
                                .padding(vertical = 11.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(t.deleteAccYes, color = mb.night, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

/** نوار سگمنتی — ۲۲ سگمنت مثل دمو؛ سگمنت‌های روشن = درصد باقی‌مانده. */
@Composable
private fun SegmentedBar(pct: Float, modifier: Modifier = Modifier, bars: Int = 22) {
    val mb = LocalMb.current
    val active = (pct.coerceIn(0f, 1f) * bars).roundToInt()
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        repeat(bars) { i ->
            Box(
                Modifier
                    .weight(1f)
                    .height(10.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (i < active) mb.glow else mb.ink.copy(alpha = 0.12f)),
            )
        }
    }
}

/** خانهٔ آمار ۲×۲ کارت «سرور فعلی». */
@Composable
private fun StatCell(modifier: Modifier = Modifier, big: String, small: String) {
    val mb = LocalMb.current
    Box(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(mb.night)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(14.dp))
            .padding(horizontal = 10.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                big, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                small, color = mb.dim, fontSize = 10.sp,
                modifier = Modifier.padding(top = 2.dp),
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** ردیف درون کارت سرور — «همهٔ سرویس‌ها» / «گزینه‌های بیشتر». */
@Composable
private fun InnerRow(
    iconRes: Int,
    title: String,
    rtl: Boolean,
    expanded: Boolean = false,
    onClick: () -> Unit,
) {
    val mb = LocalMb.current
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(mb.night)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(ic(iconRes), null, tint = mb.dim, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Text(title, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            if (expanded) {
                Icon(ic(R.drawable.ic_x), null, tint = mb.dim, modifier = Modifier.size(16.dp))
            } else {
                FwdChevron(rtl)
            }
        }
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
