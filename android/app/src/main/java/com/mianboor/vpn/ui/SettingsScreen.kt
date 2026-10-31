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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.BuildConfig
import com.mianboor.vpn.R

/** Real settings: protection, stealth, DNS, language, themes, live ping, support, about. */
@Composable
fun SettingsScreen(
    lang: Lang,
    setLang: (Lang) -> Unit,
    theme: ThemeName,
    setTheme: (ThemeName) -> Unit,
    pingLive: Boolean,
    setPingLive: (Boolean) -> Unit,
    blockQuic: Boolean,
    setBlockQuic: (Boolean) -> Unit,
    killSwitch: Boolean,
    setKillSwitch: (Boolean) -> Unit,
    failover: Boolean,
    setFailover: (Boolean) -> Unit,
    autoReconn: Boolean,
    setAutoReconn: (Boolean) -> Unit,
    stealth: String,
    setStealth: (String) -> Unit,
    dnsMode: String,
    setDnsMode: (String) -> Unit,
    dnsCustom: String,
    setDnsCustom: (String) -> Unit,
    onOpenPrivacy: () -> Unit,
    onSupport: () -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Icon(
            ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            "back", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )
        Text(t.settings, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp))

        // ── v2: محافظت اتصال — Kill Switch / Failover / Auto-reconnect ──
        PanelCard(Modifier.padding(top = 16.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.connSection, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(12.dp))
                SettingSwitchRow(t.killSwitch, t.killSwitchSub, killSwitch) { setKillSwitch(it) }
                SettingSwitchRow(t.failover, t.failoverSub, failover) { setFailover(it) }
                SettingSwitchRow(t.autoReconn, t.autoReconnSub, autoReconn) { setAutoReconn(it) }
            }
        }

        // ── v2: حالت ضد-فیلترینگ ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.stealth, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(t.stealthSub, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(4.dp),
                ) {
                    LangButton(t.stealthNormal, stealth == "normal", Modifier.weight(1f)) { setStealth("normal") }
                    LangButton(t.stealthStrict, stealth == "strict", Modifier.weight(1f)) { setStealth("strict") }
                }
            }
        }

        // ── v2: DNS رمزنگاری‌شده ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.dns, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(t.dnsSub, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(4.dp),
                ) {
                    LangButton(t.dnsAuto, dnsMode == "auto", Modifier.weight(1f)) { setDnsMode("auto") }
                    LangButton(t.dnsCf, dnsMode == "cf", Modifier.weight(1f)) { setDnsMode("cf") }
                    LangButton(t.dnsGoogle, dnsMode == "google", Modifier.weight(1f)) { setDnsMode("google") }
                    LangButton(t.dnsCustom, dnsMode == "custom", Modifier.weight(1f)) { setDnsMode("custom") }
                }
                if (dnsMode == "custom") {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        BasicTextField(
                            value = dnsCustom,
                            onValueChange = { v -> setDnsCustom(v.filter { it.isLetterOrDigit() || it == '.' || it == ':' }) },
                            singleLine = true,
                            textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                            modifier = Modifier.fillMaxWidth(),
                            decorationBox = { inner ->
                                Box {
                                    if (dnsCustom.isEmpty()) Text(t.dnsCustomHint, color = mb.dim, fontSize = 13.sp)
                                    inner()
                                }
                            },
                        )
                    }
                }
            }
        }

        // ── language ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.language, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    LangButton("English", lang == Lang.EN, Modifier.weight(1f)) { setLang(Lang.EN) }
                    LangButton("فارسی", lang == Lang.FA, Modifier.weight(1f)) { setLang(Lang.FA) }
                }
            }
        }

        // ── themes ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_palette), null, tint = mb.dim, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.theme, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Text(t.themeSub, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                Row(
                    Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    MbThemes.ORDER.forEach { name ->
                        val th = MbThemes.of(name)
                        val active = theme == name
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(
                                    2.dp,
                                    if (active) mb.glow else androidx.compose.ui.graphics.Color.Transparent,
                                    RoundedCornerShape(12.dp),
                                )
                                .clickable { setTheme(name) }
                                .padding(vertical = 8.dp, horizontal = 2.dp),
                        ) {
                            Box(
                                Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(th.night)
                                    .border(1.dp, mb.ink.copy(alpha = 0.1f), CircleShape),
                            ) {
                                // swatch slices like the demo circles
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(11.dp)
                                        .background(th.glow)
                                        .align(Alignment.TopCenter),
                                )
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(10.dp)
                                        .background(th.panel)
                                        .align(Alignment.BottomCenter),
                                )
                            }
                            Text(
                                if (lang == Lang.FA) name.labelFa else name.labelEn,
                                color = if (active) mb.ink else mb.dim,
                                fontSize = 10.sp, lineHeight = 12.sp,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(top = 5.dp),
                            )
                        }
                    }
                }
            }
        }

        // ── live ping ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_activity), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.livePingSet, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(t.livePingSetDesc, color = mb.dim, fontSize = 13.sp)
                }
                MbSwitch(pingLive, onChange = setPingLive)
            }
        }

        // ── block QUIC (speed) ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_ban), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.blockQuic, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(t.blockQuicSub, color = mb.dim, fontSize = 13.sp)
                }
                MbSwitch(blockQuic, onChange = setBlockQuic)
            }
        }

        // ── v2: حریم خصوصی و بدون لاگ ──
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

        // ── about ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_info), null, tint = mb.dim, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.about, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Text(
                    t.aboutLine(BuildConfig.VERSION_NAME),
                    color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp),
                )
                Text(t.noKey, color = mb.dim, fontSize = 13.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }

        Spacer(Modifier.height(14.dp))
    }
}

@Composable
private fun LangButton(label: String, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val mb = LocalMb.current
    Box(
        modifier
            .clip(RoundedCornerShape(9.dp))
            .background(if (active) mb.panel else androidx.compose.ui.graphics.Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 9.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (active) mb.ink else mb.dim,
            fontSize = 14.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1,
        )
    }
}

/** ردیف کلید در کارت محافظت اتصال (نسخهٔ ۲). */
@Composable
private fun SettingSwitchRow(title: String, sub: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val mb = LocalMb.current
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Text(sub, color = mb.dim, fontSize = 12.sp, lineHeight = 16.sp)
        }
        MbSwitch(checked, onChange = onChange)
    }
}
