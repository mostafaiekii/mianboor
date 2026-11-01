package com.mianboor.vpn.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.MianboorApi
import com.mianboor.vpn.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * چت پشتیبانی آنلاین — پورت واقعی دمو:
 * پیام‌ها به `/api/support-chat` روی سرور میانیبر می‌روند و دستیار هوشمند
 * (با محدودیت‌های امنیتی) جواب می‌دهد؛ برای پاسخ انسانی دکمهٔ تلگرام هست.
 */
@Composable
fun SupportChatScreen(
    lang: Lang,
    serverUrl: String,
    onBack: () -> Unit,
    onHumanSupport: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA

    val msgs = remember {
        mutableStateListOf(MianboorApi.ChatMsg("assistant", t.chatWelcome))
    }
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    // هر پیام جدید → اسکرول به آخر
    LaunchedEffect(msgs.size, busy) {
        if (msgs.isNotEmpty()) listState.animateScrollToItem(msgs.size - 1)
    }

    fun send(raw: String) {
        val content = raw.trim()
        if (content.isEmpty() || busy) return
        msgs.add(MianboorApi.ChatMsg("user", content))
        input = ""
        busy = true
        val history = msgs.toList().takeLast(10)
        scope.launch(Dispatchers.IO) {
            val reply = MianboorApi.supportChat(
                serverUrl,
                if (lang == Lang.FA) "fa" else "en",
                history,
            )
            withContext(Dispatchers.Main) {
                msgs.add(MianboorApi.ChatMsg("assistant", reply ?: t.aiFailed))
                busy = false
            }
        }
    }

    Column(Modifier.fillMaxWidth()) {
        // ── هدر ──
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
                "back",
                tint = mb.dim,
                modifier = Modifier
                    .size(24.dp)
                    .clickable { onBack() },
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(t.chatWith, color = mb.ink, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // نقطهٔ سبز چشمک‌زن — پشتیبانی آنلاین
                    val pulse = rememberInfiniteTransition(label = "pulse")
                    val alpha by pulse.animateFloat(
                        initialValue = 1f,
                        targetValue = 0.25f,
                        animationSpec = infiniteRepeatable(tween(750), RepeatMode.Reverse),
                        label = "dot",
                    )
                    Box(
                        Modifier
                            .size(8.dp)
                            .alpha(alpha)
                            .clip(CircleShape)
                            .background(mb.glow),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(t.aiOnline, color = mb.dim, fontSize = 11.sp)
                }
            }
            Icon(
                ic(R.drawable.ic_send),
                "telegram",
                tint = mb.dim,
                modifier = Modifier
                    .size(21.dp)
                    .clickable { onHumanSupport() },
            )
        }

        // ── پیام‌ها ──
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(msgs) { m ->
                val isUser = m.role == "user"
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
                ) {
                    Text(
                        m.content,
                        color = if (isUser) mb.onGlow else mb.ink,
                        fontSize = 13.sp,
                        lineHeight = 20.sp,
                        modifier = Modifier
                            .widthIn(max = 300.dp)
                            .clip(
                                RoundedCornerShape(
                                    topStart = 16.dp, topEnd = 16.dp,
                                    bottomStart = if (isUser) 16.dp else 4.dp,
                                    bottomEnd = if (isUser) 4.dp else 16.dp,
                                ),
                            )
                            .background(if (isUser) mb.glow else mb.panel)
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                    )
                }
            }
            if (busy) {
                item {
                    Text(
                        "• • •",
                        color = mb.dim, fontSize = 13.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(mb.panel)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
            }
        }

        // ── پاسخ‌های سریع — قبل از اولین پیام ──
        if (msgs.size <= 1 && !busy) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(t.quick1, t.quick2).forEach { q ->
                    Text(
                        q,
                        color = mb.ink, fontSize = 11.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(mb.glow.copy(alpha = 0.1f))
                            .clickable { send(q) }
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                    )
                }
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(t.quick3, t.quick4).forEach { q ->
                    Text(
                        q,
                        color = mb.ink, fontSize = 11.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(mb.glow.copy(alpha = 0.1f))
                            .clickable { send(q) }
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                    )
                }
            }
        }

        // ── ورودی پیام ──
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(22.dp))
                    .background(mb.panel)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                BasicTextField(
                    value = input,
                    onValueChange = { input = it },
                    maxLines = 3,
                    textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                    modifier = Modifier.fillMaxWidth(),
                    decorationBox = { inner ->
                        if (input.isEmpty()) Text(t.chatPlaceholder, color = mb.dim, fontSize = 13.sp)
                        inner()
                    },
                )
            }
            Spacer(Modifier.width(8.dp))
            val canSend = input.isNotBlank() && !busy
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (canSend) mb.glow else mb.panel)
                    .clickable(enabled = canSend) { send(input) },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    ic(R.drawable.ic_send),
                    "send",
                    tint = if (canSend) mb.onGlow else mb.dim,
                    modifier = Modifier.size(17.dp),
                )
            }
        }
        Text(
            t.chatHuman,
            color = mb.dim, fontSize = 10.sp,
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}
