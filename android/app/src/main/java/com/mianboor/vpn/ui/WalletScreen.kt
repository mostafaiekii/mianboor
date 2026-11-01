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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mianboor.vpn.R
import com.mianboor.vpn.WalletInfo
import com.mianboor.vpn.WalletTx
import java.util.Locale

/**
 * کیف پول دستگاه (نسخهٔ ۲) — موجودی واقعی از سرور، ردیم کد هدیه و تراکنش‌ها.
 * شارژ پول واقعی از مسیر مدیریت انجام می‌شود (کد هدیه یا تأیید دستی).
 */

fun fmtToman(v: Long): String = String.format(Locale.US, "%,d", v)

@Composable
fun WalletScreen(
    lang: Lang,
    wallet: WalletInfo?,
    busy: Boolean,
    onRedeem: (String) -> Unit,
    onBack: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    val rtl = lang == Lang.FA
    var code by remember { mutableStateOf("") }

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
            Icon(ic(R.drawable.ic_credit_card), null, tint = mb.glow, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Text(t.wallet, color = mb.ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        // ── موجودی ──
        Column(
            Modifier
                .fillMaxWidth()
                .padding(top = 14.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(mb.glow.copy(alpha = 0.1f))
                .border(1.dp, mb.glow.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(16.dp),
        ) {
            Text(t.walletBalance, color = mb.dim, fontSize = 13.sp)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    fmtToman(wallet?.balance ?: 0L),
                    color = mb.ink, fontSize = 30.sp, fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.width(6.dp))
                Text(t.toman, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(bottom = 5.dp))
            }
            Text(t.walletTopupNote, color = mb.dim, fontSize = 12.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
        }

        // ── ردیم کد هدیه ──
        PanelCard(Modifier.padding(top = 12.dp)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                Text(t.walletRedeem, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(mb.night)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.weight(1f)) {
                        V2TextField(code, { code = it.uppercase().take(20) }, t.walletRedeemPh, Modifier.fillMaxWidth())
                    }
                    Spacer(Modifier.width(8.dp))
                    Text(
                        t.walletRedeemBtn,
                        color = if (code.isBlank() || busy) mb.dim else mb.night,
                        fontSize = 12.sp, fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (code.isBlank() || busy) mb.panel else mb.gold)
                            .clickable(enabled = code.isNotBlank() && !busy) {
                                onRedeem(code.trim())
                                code = ""
                            }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
        }

        // ── تراکنش‌ها ──
        Text(
            t.walletTxs, color = mb.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 16.dp),
        )
        Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val txs = wallet?.txs.orEmpty()
            if (txs.isEmpty()) {
                PanelCard {
                    Text(
                        "—", color = mb.dim, fontSize = 13.sp,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        textAlign = TextAlign.Center,
                    )
                }
            }
            txs.forEach { tx -> TxRow(tx, lang) }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun TxRow(tx: WalletTx, lang: Lang) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(mb.panel)
            .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(if (tx.amount >= 0) mb.glow.copy(alpha = 0.15f) else mb.gold.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                ic(if (tx.amount >= 0) R.drawable.ic_plus else R.drawable.ic_credit_card),
                null,
                tint = if (tx.amount >= 0) mb.glow else mb.gold,
                modifier = Modifier.size(15.dp),
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                if (tx.kind == "pay") t.txPay else if (tx.kind == "redeem") tx.label else t.txTopup,
                color = mb.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(formatDate(tx.at, lang), color = mb.dim, fontSize = 11.sp)
        }
        Text(
            (if (tx.amount >= 0) "+" else "−") + fmtToman(if (tx.amount >= 0) tx.amount else -tx.amount),
            color = if (tx.amount >= 0) mb.glow else mb.gold,
            fontSize = 13.sp, fontWeight = FontWeight.Bold,
        )
    }
}
