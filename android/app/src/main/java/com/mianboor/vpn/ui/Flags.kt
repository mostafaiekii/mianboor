package com.mianboor.vpn.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
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
)

private val F_RED = Color(0xFFBB061E)
private val F_WHITE = Color(0xFFF8F8F8)
private val F_BLUE = Color(0xFF1545A2)
private val F_BLACK = Color(0xFF121212)
private val F_ORANGE = Color(0xFFD40C1A)
private val F_YELLOW = Color(0xFFFDC010)
private val F_GREEN = Color(0xFF05893E)
private val F_NAVY = Color(0xFF18337D)

/**
 * Circular country flag drawn on a Canvas — the Android port of the demo's
 * inline SVG flags (viewBox 36×36, clipped to a circle).
 */
@Composable
fun Flag(code: String, size: Dp, modifier: Modifier = Modifier) {
    Canvas(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(Color(0xFF3A3F52))
            .border(1.dp, Color.White.copy(alpha = 0.15f), CircleShape),
    ) {
        val w = size.width
        val h = size.height
        fun rect(x: Float, y: Float, rw: Float, rh: Float, c: Color) =
            drawRect(c, topLeft = Offset(x * w / 36f, y * h / 36f), size = Size(rw * w / 36f, rh * h / 36f))
        fun line(x1: Float, y1: Float, x2: Float, y2: Float, c: Color, sw: Float) =
            drawLine(
                c,
                Offset(x1 * w / 36f, y1 * h / 36f),
                Offset(x2 * w / 36f, y2 * h / 36f),
                strokeWidth = sw * w / 36f,
            )
        fun circle(cx: Float, cy: Float, r: Float, c: Color) =
            drawCircle(c, radius = r * w / 36f, center = Offset(cx * w / 36f, cy * h / 36f))

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
                rect(0f, 0f, 36f, 36f, F_ORANGE)
                circle(15f, 18f, 8f, F_WHITE)
                circle(17f, 18f, 6.4f, F_ORANGE)
                circle(24.5f, 18f, 2.6f, F_WHITE)
            }
            "us" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                for (i in 0..6) rect(0f, i * 5.14f, 36f, 2.57f, F_ORANGE)
                rect(0f, 0f, 17f, 18f, F_NAVY)
            }
            "fr" -> {
                rect(0f, 0f, 12f, 36f, F_BLUE)
                rect(12f, 0f, 12f, 36f, F_WHITE)
                rect(24f, 0f, 12f, 36f, F_ORANGE)
            }
            "ae" -> {
                rect(0f, 0f, 36f, 12f, F_GREEN)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, F_BLACK)
                rect(0f, 0f, 10f, 36f, F_ORANGE)
            }
            else -> {
                // Unknown country — dim circle with the code initial.
                rect(0f, 0f, 36f, 36f, Color(0xFF3A3F52))
            }
        }
    }
}
