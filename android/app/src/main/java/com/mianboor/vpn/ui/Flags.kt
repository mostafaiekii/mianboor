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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.sin

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
private val GB_RED = Color(0xFFC8102E)

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
        fun line(x1: Float, y1: Float, x2: Float, y2: Float, c: Color, sw: Float, cap: StrokeCap = StrokeCap.Butt) =
            drawLine(
                c,
                Offset(x1 * w / 36f, y1 * h / 36f),
                Offset(x2 * w / 36f, y2 * h / 36f),
                strokeWidth = sw * w / 36f,
                cap = cap,
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
                // Germany — modern federal flag: black–red–gold
                rect(0f, 0f, 36f, 12f, Color(0xFF000000))
                rect(0f, 12f, 36f, 12f, Color(0xFFDD0000))
                rect(0f, 24f, 36f, 12f, Color(0xFFFFCC00))
            }
            "fi" -> {
                rect(0f, 0f, 36f, 36f, F_WHITE)
                rect(10f, 0f, 7f, 36f, F_BLUE)
                rect(0f, 14.5f, 36f, 7f, F_BLUE)
            }
            "gb" -> {
                // Union Jack — St Andrew white diagonals, counterchanged St Patrick
                // red diagonals, St George red cross with white fimbriation on top.
                rect(0f, 0f, 36f, 36f, Color(0xFF012169))
                line(0f, 0f, 36f, 36f, F_WHITE, 7f)
                line(36f, 0f, 0f, 36f, F_WHITE, 7f)
                line(-1.56f, 1.56f, 16.44f, 19.56f, GB_RED, 2.6f)
                line(19.56f, 16.44f, 37.56f, 34.44f, GB_RED, 2.6f)
                line(19.56f, 19.56f, 1.56f, 37.56f, GB_RED, 2.6f)
                line(16.44f, 16.44f, 34.44f, -1.56f, GB_RED, 2.6f)
                rect(12f, 0f, 12f, 36f, F_WHITE)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(14.4f, 0f, 7.2f, 36f, GB_RED)
                rect(0f, 14.4f, 36f, 7.2f, GB_RED)
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
                // Iran — Shiro-Khorshid (Lion & Sun): golden lion facing the hoist,
                // upright sword in the forepaw, radiant sun rising behind the back.
                rect(0f, 0f, 36f, 12f, F_GREEN)
                rect(0f, 12f, 36f, 12f, F_WHITE)
                rect(0f, 24f, 36f, 12f, F_RED2)
                // sun rising behind the lion's back
                val sx = 19.4f
                val sy = 14.9f
                val rs = 1.5f
                val rIn = rs + 0.45f
                val rOut = rs + 1.45f
                for (i in 0 until 12) {
                    val a = i * Math.PI / 6.0
                    line(
                        sx + (cos(a) * rIn).toFloat(), sy + (sin(a) * rIn).toFloat(),
                        sx + (cos(a) * rOut).toFloat(), sy + (sin(a) * rOut).toFloat(),
                        F_GOLD, 0.55f, StrokeCap.Round,
                    )
                }
                circle(sx, sy, rs, F_GOLD)
                // tail with tuft
                line(22.2f, 17.4f, 23.8f, 14.6f, F_GOLD, 0.9f, StrokeCap.Round)
                circle(24f, 14.3f, 0.6f, F_GOLD)
                // body + haunch + legs
                round(13f, 16.6f, 9f, 3.3f, F_GOLD, 1.5f)
                circle(20.3f, 17.4f, 1.8f, F_GOLD)
                rect(14f, 19.5f, 1.05f, 3.2f, F_GOLD)
                rect(15.9f, 19.5f, 1.05f, 3.2f, F_GOLD)
                rect(19.5f, 19.5f, 1.05f, 3.2f, F_GOLD)
                rect(21.3f, 19.5f, 1.05f, 3.2f, F_GOLD)
                // neck bridges head and body
                rect(13.2f, 15.4f, 2.6f, 2.4f, F_GOLD)
                // head with dark mane
                circle(13.5f, 15f, 2.15f, F_DARK_GOLD)
                circle(13.5f, 15f, 1.65f, F_GOLD)
                circle(14.7f, 13.2f, 0.5f, F_GOLD)
                circle(11.95f, 15.6f, 0.75f, F_GOLD)
                // raised foreleg gripping the upright sword
                line(14.6f, 17.6f, 12.5f, 16.95f, F_GOLD, 1f, StrokeCap.Round)
                rect(11.75f, 12.4f, 0.7f, 4f, F_GOLD)      // blade
                rect(10.9f, 16.1f, 2.4f, 0.55f, F_GOLD)    // guard
                rect(11.9f, 16.65f, 0.4f, 1f, F_GOLD)      // grip
                circle(12.1f, 17.75f, 0.42f, F_GOLD)       // pommel
                circle(12.1f, 16.85f, 0.62f, F_GOLD)       // paw
            }
            else -> {
                // Unknown country — dim circle with the code initial.
                rect(0f, 0f, 36f, 36f, Color(0xFF3A3F52))
            }
        }
    }
}
