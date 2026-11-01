package com.mianboor.vpn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.mianboor.vpn.Notice
import com.mianboor.vpn.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** صندوق اعلان‌ها — زنگ صفحهٔ خانه بازش می‌کند؛ اعلان خوانده‌نشده نقطهٔ طلایی دارد. */
@Composable
fun InboxScreen(
    lang: Lang,
    notices: List<Notice>,
    onOpenNotice: (String) -> Unit,
    onMarkAll: () -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val unread = notices.count { !it.read }
    val dateFmt = SimpleDateFormat("MMM d", Locale.US)

    Column(
        Modifier
            .fillMaxSize()
            .background(mb.night)
            .statusBarsPadding()
            .padding(horizontal = 20.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(top = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                ic(R.drawable.ic_chevron_left), "back",
                tint = mb.ink,
                modifier = Modifier
                    .size(24.dp)
                    .clickable { onBack() },
            )
            Spacer(Modifier.width(10.dp))
            Text(t.inbox, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            if (unread > 0) {
                Text(
                    t.markAllRead,
                    color = mb.gold,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onMarkAll() }
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                )
            }
        }

        if (notices.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(t.inboxEmpty, color = mb.dim, fontSize = 14.sp)
            }
        } else {
            LazyColumn(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(top = 14.dp),
            ) {
                items(notices, key = { it.id }) { n ->
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(mb.panel)
                            .clickable { onOpenNotice(n.id) }
                            .padding(14.dp),
                    ) {
                        Row {
                            Box(Modifier.width(14.dp)) {
                                if (!n.read) {
                                    Box(
                                        Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(mb.gold),
                                    )
                                }
                            }
                            Column(Modifier.weight(1f)) {
                                Text(
                                    n.title,
                                    color = if (n.read) mb.dim else mb.ink,
                                    fontSize = 14.sp,
                                    fontWeight = if (n.read) FontWeight.Normal else FontWeight.SemiBold,
                                )
                                Spacer(Modifier.size(3.dp))
                                Text(n.body, color = mb.dim, fontSize = 13.sp)
                                Spacer(Modifier.size(5.dp))
                                Text(
                                    dateFmt.format(Date(n.createdAt)),
                                    color = mb.dim.copy(alpha = 0.6f),
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
