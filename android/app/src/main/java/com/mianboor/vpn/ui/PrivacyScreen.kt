package com.mianboor.vpn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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

/** صفحهٔ حریم خصوصی و بدون لاگ — صادقانه و شفاف (نسخهٔ ۲). */
@Composable
fun PrivacyScreen(lang: Lang, onBack: () -> Unit) {
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
            modifier = Modifier
                .size(24.dp)
                .clickable { onBack() },
        )
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(ic(R.drawable.ic_shield_check), null, tint = mb.glow, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Text(t.privacyTitle, color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        listOf(
            R.drawable.ic_info to (t.p1t to t.p1b),
            R.drawable.ic_ban to (t.p2t to t.p2b),
            R.drawable.ic_lock to (t.p3t to t.p3b),
            R.drawable.ic_settings to (t.p4t to t.p4b),
        ).forEach { (icon, pair) ->
            val (title, body) = pair
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(mb.panel)
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(icon), null, tint = mb.glow, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(title, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
                Text(
                    body, color = mb.dim, fontSize = 13.sp, lineHeight = 21.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }

        Spacer(Modifier.padding(bottom = 16.dp))
    }
}
