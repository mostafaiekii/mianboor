package com.mianboor.vpn.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.MianboorApi
import com.mianboor.vpn.R
import com.mianboor.vpn.TgProxy
import com.mianboor.vpn.TgProxyManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

/**
 * شیت پروکسی تلگرام (نسخهٔ ۲٫۳) — لیست پروکسی‌ها با پینگ رنگی، نشان «سریع‌ترین»
 * روی کم‌تأخیرترین و پرچم کشور (اگر سرور فرستاده باشد). لمس هر ردیف → onConnect
 * که هر دو نوع (mtproto و socks) را داخل اپ وصل می‌کند — هیچی به تلگرام کاربر
 * اضافه نمی‌شود. قالب عیناً SheetScaffold داخل اسکریم — همان الگوی UsageSheet.
 */
@Composable
fun TgProxySheet(
    lang: Lang,
    onClose: () -> Unit,
    onConnect: (TgProxy) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val context = LocalContext.current

    var busy by remember { mutableStateOf(true) }
    var proxies by remember { mutableStateOf<List<TgProxy>>(emptyList()) }

    // دریافت لیست از سرور (fallback داخلی دارد) + پینگ TCP همه، مرتب بر اساس تأخیر
    LaunchedEffect(Unit) {
        val fetched = withContext(Dispatchers.IO) {
            val raw = MianboorApi.getTgProxies(AppPrefs.serverUrl(context), AppPrefs.clientToken(context))
            TgProxyManager.measureAll(raw)
        }
        proxies = fetched
        busy = false
    }

    // scrim — کلیک بیرون شیت، بسته می‌کند
    Box(
        Modifier
            .fillMaxSize()
            .background(mb.night.copy(alpha = 0.7f))
            .clickable { onClose() },
        contentAlignment = Alignment.BottomCenter,
    ) {
        SheetScaffold(title = t.tgProxy, icon = R.drawable.ic_send, onClose = onClose) {
            if (busy) {
                Text(
                    t.tgLoading,
                    color = mb.dim, fontSize = 13.sp, textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 28.dp),
                )
            } else if (proxies.isEmpty()) {
                // v2.7: لیست خالی — نه لیست جعلی دمو؛ پیام صادقانه
                Column(
                    Modifier.fillMaxWidth().padding(vertical = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        ic(R.drawable.ic_send), null,
                        tint = mb.dim.copy(alpha = 0.5f), modifier = Modifier.size(34.dp),
                    )
                    Text(
                        t.tgEmpty, color = mb.dim, fontSize = 13.sp, textAlign = TextAlign.Center,
                        lineHeight = 19.sp,
                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp, start = 24.dp, end = 24.dp),
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    proxies.forEachIndexed { index, p ->
                        TgProxyRow(
                            proxy = p,
                            fastest = index == 0,
                            labelFastest = t.tgFastest,
                            onClick = { onConnect(p) },
                        )
                    }
                }
            }

            // یادداشت پایین شیت — برای هر دو نوع پروکسی
            Text(
                t.tgNote,
                color = mb.dim, fontSize = 11.sp, lineHeight = 15.sp,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

/** یک ردیف پروکسی: پرچم (پیش‌فرض: پرچم طلایی هدیه + 🎁) + عنوان + نوع/سرور + پینگ رنگی + نشان سریع‌ترین. */
@Composable
private fun TgProxyRow(
    proxy: TgProxy,
    fastest: Boolean,
    labelFastest: String,
    onClick: () -> Unit,
) {
    val mb = LocalMb.current
    // لوکیشن پروکسی تلگرام از لینک معلوم نیست — مثل کانفیگ‌ها پرچم طلایی هدیه می‌گیرد
    val gift = proxy.country.isBlank() || proxy.country == "gift"
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(mb.night)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box {
            Flag(if (gift) "gift" else proxy.country, 26.dp)
            if (gift) {
                Text(
                    "🎁",
                    fontSize = 10.sp,
                    modifier = Modifier.align(Alignment.BottomEnd).offset(x = 6.dp, y = 5.dp),
                )
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    proxy.title, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 1, modifier = Modifier.weight(1f, fill = false),
                )
                if (gift) {
                    Spacer(Modifier.width(6.dp))
                    Text("🎁", fontSize = 11.sp)
                }
                if (fastest) {
                    Spacer(Modifier.width(8.dp))
                    Text(
                        labelFastest,
                        color = mb.night, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .background(mb.gold, RoundedCornerShape(50))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
            }
            Text(
                "${proxy.kind.uppercase(Locale.US)} · ${proxy.server}",
                color = mb.dim, fontSize = 11.sp, maxLines = 1,
            )
        }
        Spacer(Modifier.width(8.dp))
        Text("${proxy.latency} ms", color = pingColor(proxy.latency, mb), fontSize = 13.sp)
    }
}
