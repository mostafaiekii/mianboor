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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.BasicTextField
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.RefFriend
import com.mianboor.vpn.R

/**
 * صفحه دعوت دوستان (Referral) — پورت واقعی دمو:
 * کد معرف از سرور می‌آید، دوستان واقعی‌اند، روزهای هدیه واقعاً به پرمیوم اضافه می‌شود،
 * و کد دوست هم داخل همین صفحه ثبت می‌شود.
 */
@Composable
fun ReferralScreen(
    lang: Lang,
    code: String,
    giftDays: Int,
    friends: List<RefFriend>,
    busy: Boolean,
    onClaim: () -> Unit,
    onRegister: (String) -> Unit,
    onBack: () -> Unit,
    toast: (String) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val clipboard = LocalClipboardManager.current
    var codeInput by remember { mutableStateOf("") }

    val inviteLink = "https://mianboor.vercel.app/r/$code"
    fun agoLabel(atMs: Long): String {
        val min = ((System.currentTimeMillis() - atMs) / 60_000L).coerceAtLeast(0)
        return when {
            min < 60 -> if (rtl) "همین حالا" else "just now"
            min < 24 * 60 -> if (rtl) "${min / 60} ساعت پیش" else "${min / 60}h ago"
            else -> if (rtl) "${min / 1440} روز پیش" else "${min / 1440}d ago"
        }
    }

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(top = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BackChevron(rtl, onBack)
            Spacer(Modifier.width(10.dp))
            Column {
                Text(t.invite, color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(t.inviteSub, color = mb.dim, fontSize = 13.sp)
            }
        }

        // ── هدر هدیه ──
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 14.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(mb.gold.copy(alpha = 0.1f))
                .border(1.dp, mb.gold.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(44.dp).clip(CircleShape).background(mb.gold.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(14.dp))
            Text(t.giftNote, color = mb.ink, fontSize = 13.sp, lineHeight = 20.sp)
        }

        // ── کد معرف ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.yourCode, color = mb.dim, fontSize = 13.sp)
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        code.ifBlank { "…" },
                        color = mb.glow, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(mb.glow)
                            .clickable {
                                if (code.isNotBlank()) {
                                    clipboard.setText(AnnotatedString(code))
                                    toast(t.copied)
                                }
                            }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                    ) {
                        Text(t.copyBtn, color = mb.onGlow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .clickable {
                            if (code.isNotBlank()) {
                                clipboard.setText(AnnotatedString(inviteLink))
                                toast(t.copied)
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        inviteLink,
                        color = mb.dim, fontSize = 12.sp,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(ic(R.drawable.ic_copy), null, tint = mb.dim, modifier = Modifier.size(15.dp))
                }
                Spacer(Modifier.height(6.dp))
                Text(t.copyLink, color = mb.dim, fontSize = 11.sp)
            }
        }

        // ── آمار ──
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PanelCard(Modifier.weight(1f)) {
                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_users), null, tint = mb.glow, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(t.friendsJoined, color = mb.dim, fontSize = 12.sp)
                    }
                    Text(
                        "${friends.size}",
                        color = mb.ink, fontSize = 24.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
            PanelCard(Modifier.weight(1f)) {
                Column(Modifier.fillMaxWidth().padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(t.giftDaysLabel, color = mb.dim, fontSize = 12.sp)
                    }
                    Text(
                        "$giftDays",
                        color = mb.gold, fontSize = 24.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }

        // ── دریافت روزهای هدیه ──
        if (giftDays > 0) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(mb.gold)
                    .clickable(enabled = !busy) { onClaim() }
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(t.claimGift(giftDays), color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            PanelCard(Modifier.padding(top = 12.dp)) {
                Text(
                    t.noGiftYet,
                    color = mb.dim, fontSize = 13.sp,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }

        // ── ثبت کد دوست ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.enterCodeTitle, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(t.enterCodeSub, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 3.dp))
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        BasicTextField(
                            value = codeInput,
                            onValueChange = { v -> codeInput = v.uppercase().take(16) },
                            singleLine = true,
                            textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                            modifier = Modifier.fillMaxWidth(),
                            decorationBox = { inner ->
                                if (codeInput.isEmpty()) Text("MIAN-XXXXX", color = mb.dim, fontSize = 13.sp)
                                inner()
                            },
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (codeInput.isBlank()) mb.panel else mb.glow)
                            .clickable(enabled = codeInput.isNotBlank() && !busy) { onRegister(codeInput.trim()) }
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                    ) {
                        Text(
                            t.applyCode,
                            color = if (codeInput.isBlank()) mb.dim else mb.onGlow,
                            fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }

        // ── لیست دوستان ──
        if (friends.isNotEmpty()) {
            Text(
                "${t.friendsJoined} · ${friends.size}",
                color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 16.dp),
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .heightIn(max = 224.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                friends.forEach { f ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.panel)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(34.dp).clip(CircleShape).background(mb.ink.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                f.label.filter { it.isLetterOrDigit() }.take(1).ifBlank { "?" },
                                color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(f.label, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                            Text(
                                "${agoLabel(f.at)} · ${if (f.premium) t.friendBought else t.friendJoined}",
                                color = mb.dim, fontSize = 11.sp,
                            )
                        }
                        Text(
                            t.daysShort(GIFT_DAYS_PER_FRIEND),
                            color = mb.gold, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(mb.gold.copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
            }
        }

        // ── چطور کار می‌کند ──
        PanelCard(Modifier.padding(top = 14.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.inviteHow, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                listOf(t.invStep1, t.invStep2, t.invStep3).forEachIndexed { i, s ->
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.Top) {
                        Box(
                            Modifier.size(20.dp).clip(CircleShape).background(mb.glow.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("${i + 1}", color = mb.glow, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(s, color = mb.dim, fontSize = 13.sp, lineHeight = 19.sp)
                    }
                }
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

private val GIFT_DAYS_PER_FRIEND = 3

@Composable
private fun BackChevron(rtl: Boolean, onBack: () -> Unit) {
    val mb = LocalMb.current
    Icon(
        ic(if (rtl) R.drawable.ic_chevron_right else R.drawable.ic_chevron_left),
        "back",
        tint = mb.dim,
        modifier = Modifier
            .size(24.dp)
            .clickable { onBack() },
    )
}
