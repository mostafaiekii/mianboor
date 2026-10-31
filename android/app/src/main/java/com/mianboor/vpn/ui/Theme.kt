package com.mianboor.vpn.ui

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.mianboor.vpn.R

/** Full palette of one Mianboor theme — mirrors the web demo CSS variables. */
data class MbColors(
    val night: Color,
    val panel: Color,
    val panelEdge: Color,
    val ink: Color,
    val dim: Color,
    val glow: Color,
    val onGlow: Color,
    val gold: Color,
    val danger: Color,
    val up: Color,
    val light: Boolean = false,
)

enum class ThemeName(val labelEn: String, val labelFa: String) {
    MIDNIGHT("Midnight", "نیمه‌شب"),
    FOREST("Forest", "جنگل"),
    ROSE("Rose", "رز"),
    SLATE("Slate", "سنگ"),
    SAND("Sand", "ماسه"),
}

object MbThemes {

    private val GOLD = Color(0xFFF7C243)
    private val DANGER = Color(0xFFFF6367)
    private val UP = Color(0xFFB191EA)

    val MIDNIGHT = MbColors(
        night = Color(0xFF080E23), panel = Color(0xFF111932), panelEdge = Color(0xFF232D47),
        ink = Color(0xFFEEF2F9), dim = Color(0xFFB1BBCE), glow = Color(0xFF49E9B8),
        onGlow = Color(0xFF001C1F), gold = GOLD, danger = DANGER, up = UP,
    )
    val FOREST = MbColors(
        night = Color(0xFF001208), panel = Color(0xFF051E12), panelEdge = Color(0xFF183124),
        ink = Color(0xFFEDF4EE), dim = Color(0xFFADBCAF), glow = Color(0xFF81DD85),
        onGlow = Color(0xFF001504), gold = GOLD, danger = DANGER, up = UP,
    )
    val ROSE = MbColors(
        night = Color(0xFF1A0815), panel = Color(0xFF281221), panelEdge = Color(0xFF3D2535),
        ink = Color(0xFFF7EFF4), dim = Color(0xFFC5B0BD), glow = Color(0xFFFFA3AC),
        onGlow = Color(0xFF260617), gold = GOLD, danger = DANGER, up = UP,
    )
    val SLATE = MbColors(
        night = Color(0xFF0E1217), panel = Color(0xFF191D24), panelEdge = Color(0xFF2C3138),
        ink = Color(0xFFF0F2F5), dim = Color(0xFFB3B8BF), glow = Color(0xFFB1D092),
        onGlow = Color(0xFF0D1406), gold = GOLD, danger = DANGER, up = UP,
    )
    val SAND = MbColors(
        night = Color(0xFFF0EBE0), panel = Color(0xFFFAF6EF), panelEdge = Color(0xFFD4CDBF),
        ink = Color(0xFF2E2515), dim = Color(0xFF6B6253), glow = Color(0xFF04896A),
        onGlow = Color(0xFFFAF5EA), gold = Color(0xFF946D00), danger = Color(0xFFC92E3B),
        up = Color(0xFF6E519D), light = true,
    )

    val ORDER: List<ThemeName> = ThemeName.values().toList()

    fun of(name: ThemeName): MbColors = when (name) {
        ThemeName.MIDNIGHT -> MIDNIGHT
        ThemeName.FOREST -> FOREST
        ThemeName.ROSE -> ROSE
        ThemeName.SLATE -> SLATE
        ThemeName.SAND -> SAND
    }
}

/** Deep frame color behind cards (used for inset chips). */
val FrameColor = Color(0xFF04050D)

val LocalMb = staticCompositionLocalOf { MbThemes.MIDNIGHT }

val Vazir = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_bold, FontWeight.Bold),
)

/** Ping color tone — same thresholds as the web demo.
 *  سبز تا ۱۱۰ · نارنجی ۱۱۰ تا ۲۰۰ · قرمز بالای ۲۰۰ (999 = سرور مرده) */
fun pingColor(ping: Int, mb: MbColors): Color =
    if (ping <= 110) mb.glow else if (ping <= 200) mb.gold else mb.danger

/** Signal bar count for a ping value — boundaries aligned with the color zones. */
fun pingBars(ping: Int): Int =
    if (ping <= 70) 4 else if (ping <= 110) 3 else if (ping <= 200) 2 else 1
