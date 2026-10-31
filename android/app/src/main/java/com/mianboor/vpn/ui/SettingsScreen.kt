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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.BuildConfig
import com.mianboor.vpn.R

/** Real settings: language, soft themes, live ping engine, support, about. */
@Composable
fun SettingsScreen(
    lang: Lang,
    setLang: (Lang) -> Unit,
    theme: ThemeName,
    setTheme: (ThemeName) -> Unit,
    pingLive: Boolean,
    setPingLive: (Boolean) -> Unit,
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

        // ── language ──
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
        )
    }
}
