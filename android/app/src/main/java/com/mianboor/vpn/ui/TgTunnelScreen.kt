package com.mianboor.vpn.ui

import android.media.MediaPlayer
import android.net.Uri
import android.view.View
import android.webkit.WebView
import android.widget.MediaController
import android.widget.VideoView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.R
import com.mianboor.vpn.TgTunnelClient
import com.mianboor.vpn.TgTunnelPage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * شیت «وبگردی کامل» (نسخهٔ ۲٫۲ — TgTunnel) — دکمهٔ کنار «پروکسی تلگرام».
 *
 * صفحهٔ مقصد با فریم‌های رمز ۱۶KB از پُل خود میانبر می‌آید (بدون نیاز به VPS):
 * هندشیک → رمز درخواست → واکشی توسط پُل → برگشت رمزی → نمایش.
 * نمایش HTML با WebView (بدون جاوااسکریپت) و آدرس پایهٔ مقصد؛ متن خالی → نمایش متنی.
 * مسیر کامل پروکسی تلگرام بعد از استقرار پُل روی VPS فعال می‌شود — موتور همین است.
 */
@Composable
fun TgTunnelScreen(
    lang: Lang,
    onClose: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var step by remember { mutableStateOf(0) }          // 0..4 در حال اجرا، ۵ = تمام
    var page by remember { mutableStateOf<TgTunnelPage?>(null) }
    var detail by remember { mutableStateOf<String?>(null) }
    var videoUrl by remember { mutableStateOf<String?>(null) }
    var videoBuffering by remember { mutableStateOf(false) }
    var videoError by remember { mutableStateOf(false) }

    /** پخش ویدیو از تونل — پخش‌کننده مستقیم به نقطهٔ پایانی استریم رمزی وصل می‌شود (سک = Range واقعی) */
    fun playVideo(name: String) {
        if (busy) return
        videoError = false
        videoBuffering = true
        videoUrl =
            AppPrefs.serverUrl(context).trim().trimEnd('/') +
                "/api/tgtunnel/media?name=" + name +
                "&token=" + java.net.URLEncoder.encode(AppPrefs.clientToken(context), "UTF-8")
    }

    fun go(raw: String) {
        if (busy || raw.isBlank()) return
        busy = true
        page = null
        detail = null
        step = 0
        scope.launch {
            val anim = launch {
                while (step < 4) {
                    delay(650)
                    if (step < 4) step++
                }
            }
            val p = withContext(Dispatchers.IO) {
                TgTunnelClient.browse(AppPrefs.serverUrl(context), AppPrefs.clientToken(context), raw)
            }
            anim.cancel()
            step = 5
            page = p
            if (!p.ok) detail = p.error
            busy = false
        }
    }

    // scrim — کلیک بیرون شیت، بسته می‌کند (همان الگوی TgProxySheet)
    Box(
        Modifier
            .fillMaxSize()
            .background(mb.night.copy(alpha = 0.7f))
            .clickable { if (!busy) onClose() },
        contentAlignment = Alignment.BottomCenter,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.94f)
                .clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                .background(mb.panel)
                .border(1.dp, mb.glow.copy(alpha = 0.3f), RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp))
                .padding(horizontal = 16.dp, vertical = 14.dp),
        ) {
            // ── هدر ──
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(ic(R.drawable.ic_globe), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Text(t.ttTitle, color = mb.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Icon(
                    ic(R.drawable.ic_x), "close", tint = mb.dim,
                    modifier = Modifier
                        .size(20.dp)
                        .clickable { if (!busy) onClose() },
                )
            }

            Column(
                Modifier
                    .fillMaxSize()
                    .padding(top = 10.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(t.ttSub, color = mb.dim, fontSize = 12.sp, lineHeight = 17.sp)

                // ── ورودی آدرس/جستجو ──
                V2TextField(input, { input = it }, t.ttHint, Modifier.padding(top = 10.dp))

                // ── میان‌بُرها ──
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TtChip(t.ttChipExample) { go("https://example.com") }
                    TtChip(t.ttChipWiki) { go("https://fa.wikipedia.org/wiki/ویکی‌پدیا") }
                }

                // ── ویدیو از داخل تونل ──
                Text(
                    t.ttVideoTitle,
                    color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Text(t.ttVideoSub, color = mb.dim, fontSize = 11.sp, lineHeight = 15.sp, modifier = Modifier.padding(top = 2.dp))
                Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TtChip(t.ttVideo360) { playVideo("clip-360.mp4") }
                    TtChip(t.ttVideo480) { playVideo("clip-480.mp4") }
                }
                if (videoError) {
                    Text(t.ttVideoFail, color = mb.danger, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
                }
                val vu = videoUrl
                if (vu != null) {
                    key(vu) {
                        AndroidView(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                                .height(210.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp)),
                            factory = { ctx ->
                                VideoView(ctx).apply {
                                    val mc = MediaController(ctx)
                                    mc.setAnchorView(this)
                                    setMediaController(mc)
                                    setVideoURI(Uri.parse(vu))
                                    setOnPreparedListener { mp ->
                                        videoBuffering = false
                                        mp.isLooping = false
                                        start()
                                    }
                                    setOnInfoListener { _, what, _ ->
                                        videoBuffering = what == MediaPlayer.MEDIA_INFO_BUFFERING_START
                                        true
                                    }
                                    setOnErrorListener { _, _, _ ->
                                        videoBuffering = false
                                        videoError = true
                                        true
                                    }
                                    addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
                                        override fun onViewAttachedToWindow(v: View) {}
                                        override fun onViewDetachedFromWindow(v: View) {
                                            stopPlayback()
                                        }
                                    })
                                }
                            },
                            update = { it.visibility = android.view.View.VISIBLE },
                        )
                    }
                    if (videoBuffering) {
                        Text(
                            t.ttVideoLoading,
                            color = mb.dim, fontSize = 11.sp,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }
                Text(
                    t.ttVideoNote,
                    color = mb.dim, fontSize = 10.sp, lineHeight = 14.sp,
                    modifier = Modifier.padding(top = 10.dp),
                )

                // ── دکمهٔ برو ──
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (input.isBlank() || busy) mb.glow.copy(alpha = 0.25f) else mb.glow)
                        .clickable(enabled = input.isNotBlank() && !busy) { go(input) }
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(ic(R.drawable.ic_globe), null, tint = mb.night, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.ttGo, color = mb.night, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                // ── مسیر پنج‌مرحله‌ای ──
                Row(
                    Modifier.fillMaxWidth().padding(top = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    repeat(5) { i ->
                        TtSegment(lit = i < step, active = i == step && busy, isLast = i == 4)
                    }
                }
                Text(
                    when {
                        busy -> listOf(t.ttPhaseHs, t.ttPhaseUp, t.ttPhaseEgress, t.ttPhaseDown, t.ttPhaseRender)
                            .getOrElse(step) { t.ttPhaseRender }
                        page?.ok == true -> t.ttSecured
                        page != null -> t.ttFailed
                        else -> t.ttSub
                    },
                    color = mb.dim, fontSize = 11.sp,
                    modifier = Modifier.padding(top = 8.dp),
                )

                // ── خطا ──
                if (page != null && page?.ok == false) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.danger.copy(alpha = 0.1f))
                            .border(1.dp, mb.danger.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(ic(R.drawable.ic_shield_alert), null, tint = mb.danger, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(t.ttFailed, color = mb.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                detail ?: t.ttOffline,
                                color = mb.dim, fontSize = 11.sp, lineHeight = 15.sp,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }

                // ── آمار ──
                val p = page
                if (p != null && p.ok) {
                    Row(
                        Modifier.fillMaxWidth().padding(top = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        TtStat(t.ttStatTime, "${p.msTotal} ms", Modifier.weight(1f))
                        TtStat(t.ttStatSize, fmtBytes(p.bytes.toLong()), Modifier.weight(1f))
                        TtStat(t.ttStatFrames, "${p.framesUp}↑ / ${p.framesDown}↓", Modifier.weight(1f))
                    }
                }

                // ── خروجی: WebView برای HTML، متن برای بقیه ──
                if (p != null && p.ok && p.body.isNotBlank()) {
                    if (p.contentType.contains("html", ignoreCase = true)) {
                        key(p.finalUrl to p.body.length) {
                            AndroidView(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp)
                                    .height(340.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp)),
                                factory = { ctx ->
                                    WebView(ctx).apply {
                                        settings.javaScriptEnabled = false
                                        setBackgroundColor(android.graphics.Color.WHITE)
                                        loadDataWithBaseURL(p.finalUrl, p.body, "text/html", "utf-8", null)
                                    }
                                },
                                update = { it.visibility = android.view.View.VISIBLE },
                            )
                        }
                    } else {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp)
                                .height(220.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .padding(12.dp),
                        ) {
                            Text(
                                p.body.take(4000),
                                color = mb.ink, fontSize = 10.sp, lineHeight = 14.sp,
                            )
                        }
                    }
                }

                Text(
                    t.ttNote,
                    color = mb.dim, fontSize = 10.sp, lineHeight = 14.sp,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
        }
    }
}

/** چیپ میان‌بُر — پیش‌فرض‌های آمادهٔ وبگردی */
@Composable
private fun TtChip(label: String, onClick: () -> Unit) {
    val mb = LocalMb.current
    Text(
        label,
        color = mb.dim, fontSize = 11.sp, fontWeight = FontWeight.Medium,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(mb.night)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(50))
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

/** نقطهٔ مسیر + خط اتصال — داخل Row (نیازمند RowScope برای weight) */
@Composable
private fun RowScope.TtSegment(lit: Boolean, active: Boolean, isLast: Boolean) {
    val mb = LocalMb.current
    Box(
        Modifier
            .size(12.dp)
            .clip(CircleShape)
            .background(
                when {
                    lit -> mb.glow
                    active -> mb.gold
                    else -> mb.panelEdge
                },
            ),
    )
    if (!isLast) {
        Box(
            Modifier
                .weight(1f)
                .height(2.dp)
                .clip(CircleShape)
                .background(if (lit) mb.glow.copy(alpha = 0.6f) else mb.panelEdge),
        )
    }
}

/** خانهٔ آمار کوچک */
@Composable
private fun TtStat(label: String, value: String, modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    PanelCard(modifier) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(label, color = mb.dim, fontSize = 10.sp)
            Text(value, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        }
    }
}
