package com.mianboor.vpn.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Country display names (same catalogue as the web demo). */
val COUNTRIES: Map<String, String> = mapOf(
    "nl" to "Netherlands",
    "de" to "Germany",
    "fi" to "Finland",
    "gb" to "United Kingdom",
    "tr" to "Turkey",
    "us" to "USA",
    "fr" to "France",
    "ae" to "UAE",
    "se" to "Sweden",
    "ch" to "Switzerland",
    "ca" to "Canada",
    "sg" to "Singapore",
    "jp" to "Japan",
    "it" to "Italy",
    "es" to "Spain",
    "ru" to "Russia",
    "in" to "India",
    "au" to "Australia",
    "ir" to "Iran",
)

private val F_RED = Color(0xFFBB061E)
private val F_WHITE = Color(0xFFF8F8F8)
private val F_BLUE = Color(0xFF1545A2)
private val F_BLACK = Color(0xFF121212)
private val F_RED2 = Color(0xFFD40C1A)
private val F_YELLOW = Color(0xFFFDC010)
private val F_GREEN = Color(0xFF05893E)
private val F_NAVY = Color(0xFF18337D)
private val F_GOLD = Color(0xFFE3A008)
private val F_DARK_GOLD = Color(0xFFB07C08)
private val F_ORANGE = Color(0xFFDD7C08)

/**
 * Circular country flag drawn on a Canvas — the Android port of the demo's
 * inline SVG flags (viewBox 36×36, clipped to a circle).
 */
@Composable
fun Flag(code: String, side: Dp, modifier: Modifier = Modifier) {
    Canvas(
        modifier = modifier
            .size(side)
            .clip(CircleShape)
            .background(Color(0xFF3A3F52))
            .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape),
    ) {
        val w = size.width
        val h = size.height
        fun rect(x: Float, y: Float, rw: Float, rh: Float, c: Color) =
            drawRect(c, topLeft = Offset(x * w / 36f, y * h / 36f), size = Size(rw * w / 36f, rh * h / 36f))
        fun round(x: Float, y: Float, rw: Float, rh: Float, c: Color, r: Float) =
            drawRoundRect(
                c,
                topLeft = Offset(x * w / 36f, y * h / 36f),
                size = Size(rw * w / 36f, rh * h / 36f),
                cornerRadius = CornerRadius(r * w / 36f),
            )
        fun line(x1: Float, y1: Float, x2: Float, y2: Float, c: Color, sw: Float) =
            drawLine(
                c,
                Offset(x1 * w / 36f, y1 * h / 36f),
                Offset(x2 * w / 36f, y2 * h / 36f),
                strokeWidth = sw * w / 36f,
            )
        fun circle(cx: Float, cy: Float, r: Float, c: Color) =
            drawCircle(c, radius = r * w / 36f, center = Offset(cx * w / 36f, cy * h / 36f))
        fun path(pts: List<Pair<Float, Float>>, c: Color) {
            val p = Path()
            pts.forEachIndexed { i, (x, y) ->
                val o = Offset(x * w / 36f, y * h / 36f)
                if (i == 0) p.moveTo(o.x, o.y) else p.lineTo(o.x, o.y)
            }
            p.close()
            drawPath(p, c)
        }

        when (code) {
            "nl" -> {
                rect(0f, 0f, 36f, 12f, F_RED)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, F_BLUE)
            }
            "de" -> {
                rect(0f, 0f, 36f, 12f, F_BLACK)
                rect(0f, 12f, 36f, 12f, F_ORANGE)
                rect(0f, 24f, 36f, 12f, F_YELLOW)
            }
            "fi" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                rect(10f, 0f, 7f, 36f, F_BLUE)
                rect(0f, 14.5f, 36f, 7f, F_BLUE)
            }
            "gb" -> {
                rect(0f, 0f, 36f, 36f, F_NAVY)
                line(0f, 0f, 36f, 36f, F_WHITE, 7f)
                line(36f, 0f, 0f, 36f, F_WHITE, 7f)
                line(0f, 0f, 36f, 36f, F_ORANGE, 2.5f)
                line(36f, 0f, 0f, 36f, F_ORANGE, 2.5f)
                rect(13f, 0f, 10f, 36f, F_WHITE)
                rect(0f, 13f, 36f, 10f, F_WHITE)
                rect(15f, 0f, 6f, 36f, F_ORANGE)
                rect(0f, 15f, 36f, 6f, F_ORANGE)
            }
            "tr" -> {
                rect(0f, 0f, 36f, 36f, F_RED2)
                circle(15f, 18f, 8f, F_WHITE)
                circle(17f, 18f, 6.4f, F_RED2)
                circle(24.5f, 18f, 2.6f, F_WHITE)
            }
            "us" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                for (i in 0..6) rect(0f, i * 5.14f, 36f, 2.57f, Color(0xFFC8102E))
                rect(0f, 0f, 17f, 18f, F_NAVY)
            }
            "fr" -> {
                rect(0f, 0f, 12f, 36f, F_BLUE)
                rect(12f, 0f, 12f, 36f, F_WHITE)
                rect(24f, 0f, 12f, 36f, F_RED2)
            }
            "ae" -> {
                rect(0f, 0f, 36f, 12f, F_GREEN)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, F_BLACK)
                rect(0f, 0f, 10f, 36f, F_RED2)
            }
            "se" -> {
                rect(0f, 0f, 36f, 36f, Color(0xFF0B5C9E))
                rect(12f, 0f, 5f, 36f, F_YELLOW)
                rect(0f, 15.5f, 36f, 5f, F_YELLOW)
            }
            "ch" -> {
                rect(0f, 0f, 36f, 36f, Color(0xFFD52B1E))
                rect(15.5f, 8f, 5f, 20f, F_WHITE)
                rect(8f, 15.5f, 20f, 5f, F_WHITE)
            }
            "ca" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                rect(0f, 0f, 9f, 36f, Color(0xFFD80621))
                rect(27f, 0f, 9f, 36f, Color(0xFFD80621))
                path(
                    listOf(
                        18f to 12.5f, 19.6f to 15.4f, 22.4f to 14.2f, 21.4f to 17.2f,
                        24.2f to 18.6f, 21.4f to 20.2f, 22.2f to 23f, 18f to 21.6f,
                        13.8f to 23f, 14.6f to 20.2f, 11.8f to 18.6f, 14.6f to 17.2f,
                        13.6f to 14.2f, 16.4f to 15.4f,
                    ),
                    Color(0xFFD80621),
                )
                rect(17.6f, 21.6f, 0.8f, 2f, Color(0xFFD80621))
            }
            "sg" -> {
                rect(0f, 0f, 36f, 18f, Color(0xFFED2939))
                rect(0f, 18f, 36f, 18f, F_WHITE)
                circle(8.5f, 9f, 4.2f, F_WHITE)
                circle(10.3f, 9f, 3.5f, Color(0xFFED2939))
                for ((x, y) in listOf(
                    14.5f to 6.6f, 16.6f to 8.2f, 15.8f to 10.6f, 13.2f to 10.6f, 12.4f to 8.2f,
                )) circle(x, y, 0.7f, F_WHITE)
            }
            "jp" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                circle(18f, 18f, 7.2f, Color(0xFFD30000))
            }
            "it" -> {
                rect(0f, 0f, 12f, 36f, F_GREEN)
                rect(12f, 0f, 12f, 36f, F_WHITE)
                rect(24f, 0f, 12f, 36f, F_RED2)
            }
            "es" -> {
                rect(0f, 0f, 36f, 9f, Color(0xFFC60B1E))
                rect(0f, 9f, 36f, 18f, Color(0xFFFFC400))
                rect(0f, 27f, 36f, 9f, Color(0xFFC60B1E))
            }
            "ru" -> {
                rect(0f, 0f, 36f, 12f, F_WHITE)
                rect(0f, 12f, 36f, 12f, F_BLUE)
                rect(0f, 24f, 36f, 12f, F_RED2)
            }
            "in" -> {
                rect(0f, 0f, 36f, 12f, Color(0xFFFF9933))
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, Color(0xFF138808))
                circle(18f, 18f, 4.2f, F_NAVY)
                circle(18f, 18f, 3f, F_WHITE)
                circle(18f, 18f, 1f, F_NAVY)
            }
            "au" -> {
                rect(0f, 0f, 36f, 36f, F_NAVY)
                line(0f, 0f, 18f, 18f, F_WHITE, 3f)
                line(18f, 0f, 0f, 18f, F_WHITE, 3f)
                rect(7.5f, 0f, 3f, 18f, F_WHITE)
                rect(0f, 7.5f, 18f, 3f, F_WHITE)
                rect(8.4f, 0f, 1.2f, 18f, F_RED2)
                rect(0f, 8.4f, 18f, 1.2f, F_RED2)
                circle(9f, 27f, 1.4f, F_WHITE)
                circle(27f, 9f, 0.9f, F_WHITE)
                circle(24.5f, 24f, 0.9f, F_WHITE)
                circle(30.5f, 26.5f, 0.9f, F_WHITE)
                circle(27f, 31f, 0.9f, F_WHITE)
            }
            "ir" -> {
                // Iran — Shiro-Khorshid (Lion & Sun) tricolor
                rect(0f, 0f, 36f, 12f, F_GREEN)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, F_RED2)
                // sun with rays
                circle(18f, 13.5f, 2.6f, F_GOLD)
                val rays = floatArrayOf(
                    21.4f, 13.5f, 23.1f, 13.5f, 20.4f, 15.9f, 21.61f, 17.11f,
                    18f, 16.9f, 18f, 18.6f, 15.6f, 15.9f, 14.39f, 17.11f,
                    14.6f, 13.5f, 12.9f, 13.5f, 15.6f, 11.1f, 14.39f, 9.89f,
                    18f, 10.1f, 18f, 8.4f, 20.4f, 11.1f, 21.61f, 9.89f,
                )
                for (i in rays.indices step 4) line(rays[i], rays[i + 1], rays[i + 2], rays[i + 3], F_GOLD, 0.9f)
                // lion silhouette
                circle(21.2f, 17.3f, 2f, F_DARK_GOLD)
                circle(21.4f, 17.2f, 1.4f, F_GOLD)
                round(14.6f, 18.2f, 6.6f, 2.9f, F_GOLD, 1.4f)
                rect(19.6f, 21f, 1f, 3.1f, F_GOLD)
                rect(21.2f, 21f, 1f, 3.1f, F_GOLD)
                rect(14.8f, 21f, 1f, 3.1f, F_GOLD)
                rect(16.4f, 21f, 1f, 3.1f, F_GOLD)
                line(14.7f, 19.2f, 12.9f, 16.9f, F_GOLD, 0.8f)
                circle(12.9f, 16.9f, 0.55f, F_GOLD)
                // sword
                rect(23f, 14.6f, 0.8f, 9.5f, F_GOLD)
                circle(23.4f, 14.2f, 0.7f, F_GOLD)
            }
            else -> {
                // Unknown country — dim circle with the code initial.
                rect(0f, 0f, 36f, 36f, Color(0xFF3A3F52))
            }
        }
    }
}
