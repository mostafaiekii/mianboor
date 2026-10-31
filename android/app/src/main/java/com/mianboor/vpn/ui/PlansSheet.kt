package com.mianboor.vpn.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.Stroke
import com.mianboor.vpn.AppPrefs
import com.mianboor.vpn.PayInfo
import com.mianboor.vpn.R

data class PlanDef(
    val id: String,          // p1 | p3 | p6
    val key: Int,            // 0=m1 1=m3 2=m6
    val priceKey: Int,       // 0..2
    val tag: String?,        // "popular" | "bestValue"
)

val PLANS = listOf(
    PlanDef("p1", 0, 0, null),
    PlanDef("p3", 1, 1, "popular"),
    PlanDef("p6", 2, 2, "bestValue"),
)

/**
 * Full purchase flow — pick a tariff → choose payment method (card-to-card or
 * Telegram) → the order is registered on the server and lands in the
 * management queue; after confirmation the device becomes premium on its
 * next sync.
 */
@Composable
fun PlansSheet(
    visible: Boolean,
    lang: Lang,
    reason: String,           // "renew" | "premium-lock" | "trial-over"
    payInfo: PayInfo,
    walletBalance: Long = 0L,
    onOpenWallet: () -> Unit = {},
    onWalletPay: (planId: String, promo: String?) -> Unit = { _, _ -> },
    onCheckPromo: (code: String, cb: (Int?) -> Unit) -> Unit = { _, cb -> cb(null) },
    onClose: () -> Unit,
    onCreateOrder: (planId: String, via: String, onResult: (String) -> Unit) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    val context = LocalContext.current
    var step by remember { mutableStateOf("pick") }
    var plan by remember { mutableStateOf("p3") }
    var busy by remember { mutableStateOf(false) }
    var orderId by remember { mutableStateOf("") }
    var resetKey by remember { mutableStateOf(0) }
    var promo by remember { mutableStateOf("") }
    var promoPct by remember { mutableStateOf(0) }
    var promoBad by remember { mutableStateOf(false) }

    /** قیمت نهایی پس از تخفیف — در پرداخت کیف پول و سفارش اعمال می‌شود. */
    fun discountedPrice(planId: String): Long {
        val base = when (planId) { "p1" -> 200_000L; "p3" -> 400_000L; else -> 700_000L }
        return if (promoPct > 0) Math.round(base * (100 - promoPct) / 100.0) else base
    }

    // reset flow when re-opened
    androidx.compose.runtime.LaunchedEffect(visible, resetKey) {
        if (visible) {
            step = "pick"; plan = "p3"; busy = false; orderId = ""
        }
    }

    fun planStr(key: Int) = when (key) {
        0 -> t.m1; 1 -> t.m3; else -> t.m6
    }

    fun priceStr(key: Int) = when (key) {
        0 -> t.price1; 1 -> t.price3; else -> t.price6
    }

    fun subStr(key: Int) = when (key) {
        0 -> t.sub1; 1 -> t.sub3; else -> t.sub6
    }

    fun tagStr(tag: String) = if (tag == "popular") t.popular else t.bestValue

    fun submit(via: String) {
        if (busy) return
        busy = true
        onCreateOrder(plan, via) { id ->
            orderId = id
            busy = false
            step = "sent"
            if (via == "telegram") {
                // خلاصه سفارش برای چسباندن در چت تلگرام ادمین
                val summary = "Mianboor Order $orderId · ${planStr(PLANS.first { it.id == plan }.key)} · " +
                    when (plan) { "p1" -> "200,000"; "p3" -> "400,000"; else -> "700,000" } +
                    " Toman · device ${AppPrefs.deviceId(context)}"
                val clip = context.getSystemService(android.content.ClipboardManager::class.java)
                clip.setPrimaryClip(android.content.ClipData.newPlainText("mianboor-order", summary))
            }
        }
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(mb.night.copy(alpha = 0.7f))
                .clickable { onClose() },
        )
    }
    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically { it } + fadeIn(),
        exit = slideOutVertically { it } + fadeOut(),
        modifier = Modifier.fillMaxSize(),
    ) {
        // actual sheet
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(mb.panel)
                    .border(1.dp, mb.gold.copy(alpha = 0.3f), RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 16.dp)
                    .consumeClicks(),
            ) {
                Box(
                    Modifier
                        .width(40.dp)
                        .height(4.dp)
                        .background(mb.ink.copy(alpha = 0.2f), RoundedCornerShape(50))
                        .align(Alignment.CenterHorizontally),
                )
                Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(t.plansTitle, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Icon(
                        ic(R.drawable.ic_x), null, tint = mb.dim,
                        modifier = Modifier.size(20.dp).clickable { onClose() },
                    )
                }
                when (reason) {
                    "premium-lock" -> Text(
                        t.premiumLockSub, color = mb.gold, fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    "trial-over" -> Text(
                        t.trialOverUpsell, color = mb.danger, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }

                if (step == "pick") {
                    Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Column(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .padding(12.dp),
                        ) {
                            Text(t.currentPlan, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(ic(R.drawable.ic_check), null, tint = mb.dim, modifier = Modifier.size(13.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(t.planFree, color = mb.dim, fontSize = 13.sp)
                            }
                            Text(t.freeFeat, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                        Column(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.gold.copy(alpha = 0.1f))
                                .border(1.dp, mb.gold.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(ic(R.drawable.ic_crown), null, tint = mb.gold, modifier = Modifier.size(13.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(t.planPremium, color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            }
                            Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(ic(R.drawable.ic_check), null, tint = mb.glow, modifier = Modifier.size(13.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(t.plansTitle, color = mb.ink, fontSize = 13.sp)
                            }
                            Text(t.premFeat, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                    }

                    Text(
                        t.pickPlan, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 14.dp),
                    )
                    PLANS.forEach { p ->
                        val active = plan == p.id
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(
                                    2.dp,
                                    if (active) mb.gold else androidx.compose.ui.graphics.Color.Transparent,
                                    RoundedCornerShape(12.dp),
                                )
                                .clickable { plan = p.id }
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(planStr(p.key), color = mb.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                                    if (p.tag != null) {
                                        Spacer(Modifier.width(8.dp))
                                        Text(
                                            tagStr(p.tag),
                                            color = mb.gold, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                            modifier = Modifier
                                                .background(mb.gold.copy(alpha = 0.2f), RoundedCornerShape(50))
                                                .padding(horizontal = 8.dp, vertical = 2.dp),
                                        )
                                    }
                                }
                                Text(subStr(p.key), color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
                            }
                            Text(
                                priceStr(p.key), color = mb.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.End,
                            )
                            Spacer(Modifier.width(12.dp))
                            if (active) {
                                Box(
                                    Modifier.size(24.dp).clip(CircleShape).background(mb.gold),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(ic(R.drawable.ic_check), null, tint = mb.night, modifier = Modifier.size(15.dp))
                                }
                            } else {
                                Box(
                                    Modifier.size(24.dp).clip(CircleShape)
                                        .border(2.dp, mb.ink.copy(alpha = 0.25f), CircleShape),
                                )
                            }
                        }
                    }

                    // continue button
                    val sel = PLANS.first { it.id == plan }
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 14.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.gold)
                            .clickable { step = "pay" }
                            .padding(vertical = 13.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${t.continuePay} — " + (if (promoPct > 0) fmtToman(discountedPrice(plan)) + " " + t.toman else priceStr(sel.key)),
                            color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                        )
                    }

                    // ── v2: کد تخفیف ──
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .padding(horizontal = 12.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(ic(R.drawable.ic_key_round), null, tint = mb.gold, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(8.dp))
                        BasicTextField(
                            value = promo,
                            onValueChange = { v -> promo = v.uppercase().take(24); promoBad = false },
                            singleLine = true,
                            textStyle = TextStyle(color = mb.ink, fontSize = 13.sp),
                            modifier = Modifier.weight(1f),
                            decorationBox = { inner ->
                                Box {
                                    if (promo.isEmpty()) Text(t.promoPh, color = mb.dim, fontSize = 13.sp)
                                    inner()
                                }
                            },
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            t.promoApply,
                            color = if (promo.isBlank()) mb.dim else mb.glow,
                            fontSize = 13.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable(enabled = promo.isNotBlank()) {
                                    onCheckPromo(promo.trim().uppercase()) { pct ->
                                        if (pct != null && pct > 0) {
                                            promoPct = pct
                                            promoBad = false
                                        } else {
                                            promoPct = 0
                                            promoBad = true
                                        }
                                    }
                                }
                                .padding(horizontal = 6.dp, vertical = 4.dp),
                        )
                    }
                    if (promoBad && promoPct == 0) {
                        Text(t.promoBad, color = mb.danger, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }

                if (step == "pay") {
                    Text(
                        t.payTitle, color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                    // ── v2: پرداخت با کیف پول — فعال‌سازی آنی ──
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .border(
                                1.dp,
                                if (walletBalance >= discountedPrice(plan)) mb.glow.copy(alpha = 0.5f) else mb.panelEdge,
                                RoundedCornerShape(12.dp),
                            )
                            .clickable(enabled = !busy) {
                                onWalletPay(plan, if (promoPct > 0) promo.trim().uppercase() else null)
                            }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(ic(R.drawable.ic_credit_card), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.payWallet + fmtToman(walletBalance) + " " + t.toman, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text(t.walletPayNote, color = mb.dim, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
                        }
                        Text(
                            fmtToman(discountedPrice(plan)),
                            color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        )
                    }
                    Text(
                        t.walletOpenRow,
                        color = mb.glow, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .padding(top = 6.dp)
                            .clickable { onOpenWallet() }
                            .padding(vertical = 2.dp),
                    )
                    // card to card
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                            .clickable(enabled = !busy) { submit("gateway") }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (busy) {
                            SpinningLoader()
                        } else {
                            Icon(ic(R.drawable.ic_credit_card), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                t.payGateway, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                            )
                            Text(t.payGatewaySub, color = mb.dim, fontSize = 13.sp)
                        }
                    }
                    // telegram
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(mb.night)
                            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                            .clickable(enabled = !busy) { submit("telegram") }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (busy) {
                            SpinningLoader()
                        } else {
                            Icon(ic(R.drawable.ic_send), null, tint = mb.glow, modifier = Modifier.size(20.dp))
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.viaTelegram, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text(t.viaTelegramSub, color = mb.dim, fontSize = 13.sp)
                        }
                    }
                    Text(
                        "← ${t.pickPlan}",
                        color = mb.dim, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .padding(top = 12.dp)
                            .clickable { step = "pick" },
                    )
                }

                if (step == "sent") {
                    Column(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            Modifier.size(56.dp).clip(CircleShape).background(mb.glow.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(ic(R.drawable.ic_sparkles), null, tint = mb.glow, modifier = Modifier.size(26.dp))
                        }
                        Text(
                            t.orderPlaced, color = mb.ink, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 10.dp),
                            textAlign = TextAlign.Center,
                        )
                        Text(
                            "${t.payOrderId}: $orderId",
                            color = mb.dim, fontSize = 13.sp,
                            modifier = Modifier
                                .padding(top = 6.dp)
                                .background(mb.night, RoundedCornerShape(50))
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                        )

                        // ── اطلاعات کارت‌به‌کارت (از سرور) ──
                        if (payInfo.card.isNotBlank()) {
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(top = 12.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(mb.night)
                                    .border(1.dp, mb.glow.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                    .clickable {
                                        val clip = context.getSystemService(android.content.ClipboardManager::class.java)
                                        clip.setPrimaryClip(
                                            android.content.ClipData.newPlainText("mianboor-card", payInfo.card),
                                        )
                                        android.widget.Toast.makeText(context, t.payCopiedCard, android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                    .padding(14.dp),
                            ) {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(ic(R.drawable.ic_credit_card), null, tint = mb.glow, modifier = Modifier.size(15.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(t.payCardLabel, color = mb.dim, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                    Spacer(Modifier.weight(1f))
                                    Icon(ic(R.drawable.ic_copy), null, tint = mb.dim, modifier = Modifier.size(14.dp))
                                }
                                Text(
                                    payInfo.card, color = mb.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 6.dp),
                                    textAlign = TextAlign.Center,
                                    letterSpacing = 1.sp,
                                    style = androidx.compose.ui.text.TextStyle(
                                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                    ),
                                )
                                if (payInfo.holder.isNotBlank()) {
                                    Text(
                                        "${t.payHolderLabel}: ${payInfo.holder}",
                                        color = mb.dim, fontSize = 12.sp,
                                        modifier = Modifier.padding(top = 4.dp).align(Alignment.CenterHorizontally),
                                    )
                                }
                                Text(
                                    "${t.payAmountLabel}: ${priceStr(PLANS.first { it.id == plan }.key)}",
                                    color = mb.gold, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(top = 4.dp).align(Alignment.CenterHorizontally),
                                )
                                if (payInfo.note.isNotBlank()) {
                                    Text(
                                        payInfo.note, color = mb.dim, fontSize = 11.sp, lineHeight = 16.sp,
                                        modifier = Modifier.padding(top = 6.dp),
                                        textAlign = TextAlign.Center,
                                    )
                                }
                            }
                            Text(
                                t.payCardHint, color = mb.dim, fontSize = 12.sp, lineHeight = 18.sp,
                                modifier = Modifier.padding(top = 8.dp),
                                textAlign = TextAlign.Center,
                            )
                        }

                        Text(
                            t.orderPlacedSub, color = mb.dim, fontSize = 13.sp,
                            lineHeight = 20.sp, textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.gold)
                                .clickable {
                                    runCatching {
                                        context.startActivity(
                                            android.content.Intent(
                                                android.content.Intent.ACTION_VIEW,
                                                android.net.Uri.parse(TG_SUPPORT),
                                            ),
                                        )
                                    }
                                }
                                .padding(vertical = 13.dp),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Icon(ic(R.drawable.ic_send), null, tint = mb.night, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(t.openTelegram, color = mb.night, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(mb.night)
                                .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                                .clickable { onClose() }
                                .padding(vertical = 13.dp),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Text(t.done, color = mb.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
fun SpinningLoader(modifier: Modifier = Modifier) {
    val mb = LocalMb.current
    val trans = androidx.compose.animation.core.rememberInfiniteTransition(label = "load")
    val angle by trans.animateFloat(
        0f, 360f,
        androidx.compose.animation.core.infiniteRepeatable(
            androidx.compose.animation.core.tween(800, easing = androidx.compose.animation.core.LinearEasing),
        ), label = "la",
    )
    androidx.compose.foundation.Canvas(modifier.size(20.dp)) {
        rotate(angle) {
            drawArc(
                mb.glow, startAngle = 0f, sweepAngle = 270f, useCenter = false,
                style = Stroke(2.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round),
                topLeft = Offset.Zero,
            )
        }
    }
}
