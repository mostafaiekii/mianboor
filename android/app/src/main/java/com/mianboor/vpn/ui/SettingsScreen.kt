package com.mianboor.vpn.ui

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
import androidx.compose.foundation.text.BasicTextField
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
    // ── v2.7 ──
    guardianOn: Boolean = false,
    onOpenGuardian: () -> Unit = {},
    proxyMode: Boolean = false,
    setProxyMode: (Boolean) -> Unit = {},
    mux: Boolean = false,
    setMux: (Boolean) -> Unit = {},
    tetherOn: Boolean = false,
    socksPort: Int = 10809,
    setSocksPort: (Int) -> Unit = {},
    batteryOff: Boolean = false,
    onToggleBattery: () -> Unit = {},
    groupCountry: Boolean = false,
    setGroupCountry: (Boolean) -> Unit = {},
    onOpenVersion: () -> Unit = {},
    tetherApplyNote: String = "",
    onToggleTether: (Boolean) -> Unit = {},
    blockIr: Boolean = false,
    setBlockIr: (Boolean) -> Unit = {},
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    var tetherOpen by remember { mutableStateOf(false) }

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

        // ── ۱) زبان ── (v2.1: تنظیمات بازچینی شد — زبان و تم اول)
        PanelCard(Modifier.padding(top = 16.dp)) {
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

        // ── ۲) تم‌ها ──
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

        // ── ۳) محافظت اتصال — Kill Switch / Failover / Auto-reconnect ──
        PanelCard(Modifier.padding(top = 12.dp)) {
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
                // v2.7: مسدودسازی دامنه‌های .ir — از تونل خارج می‌مانند
                SettingSwitchRow(t.blockIr, t.blockIrSub, blockIr) { setBlockIr(it) }
            }
        }

        // ── ۴) حالت ضد-فیلترینگ ──
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
                // v2.1: یک خط توضیح کوتاه زیر سگمنت — دقیقاً چیزی که حالت سخت‌گیر انجام می‌دهد
                Text(
                    t.stealthNote, color = mb.dim, fontSize = 12.sp, lineHeight = 16.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }

        // ── ۵) DNS رمزنگاری‌شده ──
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

        // ── ۶) پینگ زنده ──
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

        // ── ۷) بستن QUIC (سرعت) ──
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

        // ── ۵½. گاردین — مسدودسازی هوشمند محتوا (v2.7) ──
        PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenGuardian) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.guardian, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(t.guardianSub, color = mb.dim, fontSize = 12.sp, lineHeight = 16.sp, maxLines = 2)
                }
                Text(
                    if (guardianOn) t.gBlocked else t.gAllowed,
                    color = if (guardianOn) mb.glow else mb.dim,
                    fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.width(6.dp))
                FwdChevron(rtl)
            }
        }

        // ── ۵¾. موتور پیشرفته — حالت پروکسی، Mux، تترینگ، پورت، باتری (v2.7) ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_git_branch), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.advEngine, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(12.dp))
                SettingSwitchRow(t.proxyMode, t.proxyModeSub, proxyMode) { setProxyMode(it) }
                SettingSwitchRow(t.mux, t.muxSub, mux) { setMux(it) }
                // تترینگ — ردیف ورود به شیت
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { tetherOpen = true }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(t.tether, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(
                            if (tetherOn) t.tetherOnToast else t.tetherSub,
                            color = mb.dim, fontSize = 12.sp, lineHeight = 16.sp,
                            maxLines = 2,
                        )
                    }
                    FwdChevron(rtl, Modifier.size(15.dp))
                }
                // پورت سوکس/HTTP
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(t.socksPortRow, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(
                            if (lang == Lang.FA) "HTTP روی پورت +۱ هم باز می‌شود" else "HTTP opens on port +1",
                            color = mb.dim, fontSize = 12.sp,
                        )
                    }
                    BasicTextField(
                        value = socksPort.toString(),
                        onValueChange = { v -> v.filter { it.isDigit() }.take(5).toIntOrNull()?.let { setSocksPort(it) } },
                        singleLine = true,
                        textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                        modifier = Modifier
                            .width(86.dp)
                            .clip(RoundedCornerShape(50))
                            .background(mb.night)
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        decorationBox = { inner -> Box(contentAlignment = Alignment.Center) { inner() } },
                    )
                }
                // باتری
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(t.batteryOff, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        Text(t.batteryOffSub, color = mb.dim, fontSize = 12.sp, lineHeight = 16.sp)
                    }
                    Text(
                        if (batteryOff) t.batteryOffDone else t.batteryOffIdle,
                        color = if (batteryOff) mb.glow else mb.dim, fontSize = 12.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .clickable { onToggleBattery() }
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                    )
                }
            }
        }

        // ── ۶½. لیست سرورها — پینگ زنده + دسته‌بندی کشور (v2.7) ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_globe), null, tint = mb.dim, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.serverListSec, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(12.dp))
                SettingSwitchRow(t.livePingSet, t.livePingSetDesc, pingLive) { setPingLive(it) }
                SettingSwitchRow(t.groupCountry, t.groupCountrySub, groupCountry) { setGroupCountry(it) }
            }
        }

        // ── ۸) حریم خصوصی ──
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

        // ── ۹) پشتیبانی ──
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

        // ── ۱۰) نسخه — حلقه‌های به‌روزرسانی داخل اپ (v2.7) ──
        PanelCard(Modifier.padding(top = 12.dp), onClick = onOpenVersion) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_info), null, tint = mb.dim, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(t.versionRow, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        t.aboutLine(BuildConfig.VERSION_NAME),
                        color = mb.dim, fontSize = 13.sp,
                    )
                }
                Text(
                    BuildConfig.VERSION_NAME,
                    color = mb.dim, fontSize = 12.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(mb.night)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
                Spacer(Modifier.width(6.dp))
                FwdChevron(rtl)
            }
        }

        // ── ۱۰½) درباره اپ ──
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

    // ── شیت اشتراک‌گذاری نقطه اتصال (v2.7) ──
    if (tetherOpen) {
        val host = remember { wlanIpv4() ?: "192.168.43.1" }
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { tetherOpen = false },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(mb.night.copy(alpha = 0.75f))
                    .clickable(indication = null, interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }) { tetherOpen = false },
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
                        Icon(ic(R.drawable.ic_wifi), null, tint = mb.glow, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(t.tetherTitle, color = mb.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.weight(1f))
                        Text(
                            "✕", color = mb.dim, fontSize = 15.sp,
                            modifier = Modifier
                                .clip(CircleShape)
                                .clickable { tetherOpen = false }
                                .padding(6.dp),
                        )
                    }
                    Text(
                        t.tetherDesc, color = mb.dim, fontSize = 13.sp, lineHeight = 19.sp,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                    // host / port
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 14.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(t.tetherHost, color = mb.dim, fontSize = 11.sp)
                            Text(host, color = mb.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.tetherPort, color = mb.dim, fontSize = 11.sp)
                            Text(
                                "$socksPort (SOCKS) · ${socksPort + 1} (HTTP)",
                                color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Text(
                        t.applyNextConn, color = mb.gold, fontSize = 12.sp,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 14.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (tetherOn) mb.panelEdge else mb.glow)
                            .clickable { if (tetherOn) onToggleTether(false) else onToggleTether(true) }
                            .padding(vertical = 13.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (tetherOn) {
                                if (lang == Lang.FA) "غیرفعال‌کردن اشتراک‌گذاری" else "Disable sharing"
                            } else t.tetherOn,
                            color = if (tetherOn) mb.dim else mb.night,
                            fontSize = 14.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

/** اولین IPv4 غیر-لوکال (معمولاً آی‌پی هات‌اسپوت/وای‌فای گوشی). */
internal fun wlanIpv4(): String? = runCatching {
    val nis = java.net.NetworkInterface.getNetworkInterfaces().toList()
    nis.asSequence()
        .filter { it.isUp && !it.isLoopback }
        .flatMap { it.inetAddresses.toList().asSequence() }
        .filterIsInstance<java.net.Inet4Address>()
        .filter { !it.isLoopbackAddress }
        .map { it.hostAddress }
        .firstOrNull()
}.getOrNull()

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
