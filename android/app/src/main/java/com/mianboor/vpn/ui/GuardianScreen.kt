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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R

/**
 * گاردین (نسخهٔ ۲٫۷) — مسدودسازی هوشمند محتوا در ۱۰ دسته، عین دمو.
 * هر دسته در XrayConfigBuilder به قانون block تبدیل می‌شود.
 */
private val GUARDIAN_IDS = listOf(
    "ads", "trackers", "adult", "yt", "gambling",
    "gov", "pay", "social", "crypto", "fake",
)

@Composable
fun GuardianScreen(
    lang: Lang,
    enabled: Set<String>,
    onToggle: (String) -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA

    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Icon(
            ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
            "back", tint = mb.dim,
            modifier = Modifier.size(24.dp).clickable { onBack() },
        )
        Text(t.guardian, color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 12.dp))

        // سرصفحهٔ معنایی — سپر + توضیح
        Column(
            Modifier.fillMaxWidth().padding(top = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(28.dp))
            }
            Text(
                t.guardianSub, color = mb.dim, fontSize = 13.sp, lineHeight = 19.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp, start = 24.dp, end = 24.dp),
            )
        }

        Row(
            Modifier.fillMaxWidth().padding(top = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(t.guardianCount(enabled.size), color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.width(10.dp))
            Text(
                t.guardianCta, color = mb.dim, fontSize = 12.sp,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.End,
                maxLines = 1,
            )
        }

        LazyColumn(
            Modifier.fillMaxWidth().weight(1f).padding(top = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(GUARDIAN_IDS) { id ->
                val on = id in enabled
                val label = when (id) {
                    "ads" -> t.gAds
                    "trackers" -> t.gTrackers
                    "adult" -> t.gAdult
                    "yt" -> t.gYt
                    "gambling" -> t.gGambling
                    "gov" -> t.gGov
                    "pay" -> t.gPay
                    "social" -> t.gSocial
                    "crypto" -> t.gCrypto
                    else -> t.gFake
                }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            if (on) mb.glow.copy(alpha = 0.10f) else mb.panel
                        )
                        .border(
                            1.dp,
                            if (on) mb.glow.copy(alpha = 0.4f) else mb.panelEdge,
                            RoundedCornerShape(12.dp),
                        )
                        .clickable { onToggle(id) }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        ic(if (on) R.drawable.ic_shield_check else R.drawable.ic_shield_alert),
                        null, tint = if (on) mb.glow else mb.dim, modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        label, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        if (on) t.gBlocked else t.gAllowed,
                        color = if (on) mb.glow else mb.dim,
                        fontSize = 12.sp, fontWeight = FontWeight.Medium,
                    )
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }
    }
}
