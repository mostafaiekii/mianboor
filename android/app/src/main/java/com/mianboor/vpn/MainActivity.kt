package com.mianboor.vpn

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch
import java.util.Locale

// ---------------------------------------------------------------------------
// Palette & type
// ---------------------------------------------------------------------------

private val Neon = Color(0xFF33F0B7)
private val NeonSoft = Color(0xFF6EF9D9)
private val BgColor = Color(0xFF04090B)
private val PanelColor = Color(0xFF0B161A)
private val PanelStroke = Color(0x2433F0B7)
private val TextMain = Color(0xFFE9FFF7)
private val TextDim = Color(0xFF87AFA4)
private val ErrorRed = Color(0xFFFF6B8B)

private val Vazir = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_bold, FontWeight.Bold)
)

private val FA_DIGITS = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')

private fun faDigits(s: String): String = buildString {
    for (c in s) append(if (c.isDigit()) FA_DIGITS[c - '0'] else c)
}

private fun faNum(n: Long): String = faDigits(n.toString())
private fun faNum(n: Int): String = faDigits(n.toString())

private fun fmtSpeed(mbps: Double): String {
    val s = if (mbps >= 100) String.format(Locale.US, "%.0f", mbps)
    else String.format(Locale.US, "%.1f", mbps)
    return faDigits(s)
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = MaterialTheme.colorScheme.copy(
                    background = BgColor,
                    surface = PanelColor,
                    primary = Neon,
                    onPrimary = BgColor,
                    onBackground = TextMain,
                    onSurface = TextMain
                ),
                typography = MaterialTheme.typography.copy(
                    displayLarge = TextStyle(fontFamily = Vazir),
                    displayMedium = TextStyle(fontFamily = Vazir),
                    displaySmall = TextStyle(fontFamily = Vazir),
                    headlineLarge = TextStyle(fontFamily = Vazir),
                    headlineMedium = TextStyle(fontFamily = Vazir),
                    headlineSmall = TextStyle(fontFamily = Vazir),
                    titleLarge = TextStyle(fontFamily = Vazir),
                    titleMedium = TextStyle(fontFamily = Vazir),
                    titleSmall = TextStyle(fontFamily = Vazir),
                    bodyLarge = TextStyle(fontFamily = Vazir),
                    bodyMedium = TextStyle(fontFamily = Vazir),
                    bodySmall = TextStyle(fontFamily = Vazir),
                    labelLarge = TextStyle(fontFamily = Vazir),
                    labelMedium = TextStyle(fontFamily = Vazir),
                    labelSmall = TextStyle(fontFamily = Vazir)
                )
            ) {
                androidx.compose.runtime.CompositionLocalProvider(
                    LocalLayoutDirection provides LayoutDirection.Rtl
                ) {
                    Surface(modifier = Modifier.fillMaxSize(), color = BgColor) {
                        MainScreen()
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

private class SetupRequired : Exception()

@Composable
fun MainScreen() {
    val context = LocalContext.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    val phase by VpnState.phase.collectAsState()
    val coverMsg by VpnState.coverMsg.collectAsState()
    val serverName by VpnState.serverName.collectAsState()
    val serverCountry by VpnState.serverCountry.collectAsState()
    val errorMessage by VpnState.errorMessage.collectAsState()
    val rxBytes by VpnState.rxBytes.collectAsState()
    val txBytes by VpnState.txBytes.collectAsState()

    var showAdmin by remember { mutableStateOf(false) }
    var configured by remember { mutableStateOf(AppPrefs.isConfigured(context)) }
    var pendingServer by remember { mutableStateOf<ParsedServer?>(null) }

    // connection timer
    var seconds by remember { mutableIntStateOf(0) }
    LaunchedEffect(phase) {
        if (phase == Phase.CONNECTED) {
            seconds = 0
            while (true) {
                kotlinx.coroutines.delay(1000)
                seconds++
            }
        }
    }

    // live speeds from cumulative tunnel counters
    var lastRx by remember { mutableLongStateOf(0L) }
    var lastTx by remember { mutableLongStateOf(0L) }
    var downMbps by remember { mutableStateOf(0.0) }
    var upMbps by remember { mutableStateOf(0.0) }
    LaunchedEffect(phase) {
        if (phase == Phase.CONNECTED) {
            lastRx = 0L; lastTx = 0L
            while (true) {
                kotlinx.coroutines.delay(1000)
                val drx = rxBytes - lastRx
                val dtx = txBytes - lastTx
                if (lastRx > 0L || lastTx > 0L) {
                    downMbps = drx.coerceAtLeast(0L) * 8.0 / 1_000_000.0
                    upMbps = dtx.coerceAtLeast(0L) * 8.0 / 1_000_000.0
                }
                lastRx = rxBytes; lastTx = txBytes
            }
        }
    }

    // cover messages while busy
    LaunchedEffect(phase) {
        while (phase == Phase.SCANNING || phase == Phase.CONNECTING) {
            VpnState.coverMsg.value =
                (if (phase == Phase.SCANNING) SCAN_MSGS else CONNECT_MSGS).random()
            kotlinx.coroutines.delay(1400)
        }
    }

    fun launchVpn(server: ParsedServer) {
        val intent = Intent(context, MianboorVpnService::class.java)
            .setAction(MianboorVpnService.ACTION_CONNECT)
            .putExtra(MianboorVpnService.EXTRA_LINK, server.rawLink)
            .putExtra(MianboorVpnService.EXTRA_NAME, server.name)
            .putExtra(MianboorVpnService.EXTRA_COUNTRY, server.country)
        VpnState.phase.value = Phase.CONNECTING
        ContextCompat.startForegroundService(context, intent)
    }

    val vpnPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val server = pendingServer
        pendingServer = null
        if (result.resultCode == Activity.RESULT_OK && server != null) {
            launchVpn(server)
        } else {
            VpnState.phase.value = Phase.IDLE
            VpnState.errorMessage.value = "اجازه اتصال VPN داده نشد"
        }
    }

    val notifPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    fun requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun startConnect() {
        requestNotificationsIfNeeded()
        scope.launch(kotlinx.coroutines.Dispatchers.Main) {
            VpnState.reset()
            VpnState.phase.value = Phase.SCANNING
            try {
                if (!AppPrefs.isConfigured(context)) throw SetupRequired()
                val cfgs = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    MianboorApi.fetchConfigs(
                        AppPrefs.serverUrl(context),
                        AppPrefs.clientToken(context)
                    )
                }
                val parsed = cfgs.mapNotNull {
                    XrayConfigBuilder.parseLink(it.link, it.name, it.country)
                }
                if (parsed.isEmpty()) throw IllegalStateException("هیچ کانفیگ فعالی موجود نیست")

                val best = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    ServerTester.testAll(parsed)
                } ?: throw IllegalStateException("هیچ سروری در دسترس نیست؛ اینترنتت رو بررسی کن")

                VpnState.serverName.value = best.name
                VpnState.serverCountry.value = best.country

                val prepare = VpnService.prepare(context)
                if (prepare != null) {
                    pendingServer = best
                    vpnPermission.launch(prepare)
                } else {
                    launchVpn(best)
                }
            } catch (e: SetupRequired) {
                VpnState.phase.value = Phase.IDLE
                VpnState.errorMessage.value = "اول تنظیمات سرور میانبر رو وارد کن"
                showAdmin = true
            } catch (e: Exception) {
                VpnState.phase.value = Phase.IDLE
                VpnState.errorMessage.value = when (e) {
                    is IllegalStateException -> e.message ?: "اتصال برقرار نشد"
                    is java.net.UnknownHostException -> "سرور میانبر پیدا نشد؛ آدرس رو بررسی کن"
                    is java.io.IOException -> "ارتباط با سرور ممکن نشد؛ اینترنتت رو بررسی کن"
                    else -> "اتصال برقرار نشد؛ یک بار دیگه امتحان کن"
                }
            }
        }
    }

    fun stopConnect() {
        VpnState.phase.value = Phase.DISCONNECTING
        context.startService(
            Intent(context, MianboorVpnService::class.java)
                .setAction(MianboorVpnService.ACTION_DISCONNECT)
        )
    }

    // --- admin trigger (5 taps in 4s or 1.2s long-press on the version) ---
    var tapCount by remember { mutableIntStateOf(0) }
    var windowStart by remember { mutableLongStateOf(0L) }
    fun onTapVersion() {
        val now = System.currentTimeMillis()
        if (now - windowStart > 4000) {
            windowStart = now
            tapCount = 0
        }
        tapCount++
        if (tapCount >= 5) {
            tapCount = 0
            showAdmin = true
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ---------------- header ----------------
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_power),
                contentDescription = null,
                tint = Neon,
                modifier = Modifier.size(26.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text("میانبر", color = TextMain, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = {
                runCatching {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/member9"))
                    )
                }
            }) {
                Text("پشتیبانی", color = TextDim, fontSize = 13.sp)
            }
        }

        Spacer(Modifier.height(6.dp))

        // ---------------- power button ----------------
        PowerButton(
            phase = phase,
            onTap = {
                when (phase) {
                    Phase.IDLE -> startConnect()
                    Phase.CONNECTED -> stopConnect()
                    else -> Unit
                }
            }
        )

        Spacer(Modifier.height(18.dp))

        // ---------------- status ----------------
        val (title, subtitle) = when (phase) {
            Phase.IDLE -> "متصل نیستی" to "برای شروع، دکمه رو بزن"
            Phase.SCANNING -> "در حال آماده‌سازی…" to "چند لحظه صبر کن"
            Phase.CONNECTING -> "در حال اتصال…" to ""
            Phase.CONNECTED -> "متصل شدی!" to ""
            Phase.DISCONNECTING -> "در حال قطع اتصال…" to ""
        }
        Text(
            title,
            color = if (phase == Phase.CONNECTED) Neon else TextMain,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        if (subtitle.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            Text(subtitle, color = TextDim, fontSize = 14.sp, textAlign = TextAlign.Center)
        }

        AnimatedVisibility(
            visible = phase == Phase.CONNECTED,
            enter = fadeIn() + slideInVertically { it / 2 },
            exit = fadeOut() + slideOutVertically { it / 2 }
        ) {
            Row(
                modifier = Modifier
                    .padding(top = 10.dp)
                    .background(PanelColor, RoundedCornerShape(50))
                    .border(1.dp, PanelStroke, RoundedCornerShape(50))
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    Modifier
                        .size(8.dp)
                        .background(Neon, CircleShape)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "سریع‌ترین مسیر: $serverName ($serverCountry)",
                    color = TextMain,
                    fontSize = 13.sp
                )
            }
        }

        // ---------------- cover message / error ----------------
        Spacer(Modifier.height(14.dp))
        AnimatedVisibility(
            visible = (phase == Phase.SCANNING || phase == Phase.CONNECTING) && coverMsg.isNotBlank(),
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Text(
                coverMsg,
                color = TextDim,
                fontSize = 14.sp,
                textAlign = TextAlign.Center
            )
        }
        AnimatedVisibility(visible = errorMessage != null, enter = fadeIn(), exit = fadeOut()) {
            Text(
                errorMessage ?: "",
                color = ErrorRed,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
        }

        // ---------------- setup hint ----------------
        if (!configured) {
            Spacer(Modifier.height(16.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = PanelColor,
                border = androidx.compose.foundation.BorderStroke(1.dp, PanelStroke)
            ) {
                Column(
                    Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("راه‌اندازی اولیه", color = TextMain, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "برای اتصال به سرور میانبر، آدرس سرور و توکن رو یک بار وارد کن.",
                        color = TextDim,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                    TextButton(onClick = { showAdmin = true }) {
                        Text("ورود تنظیمات", color = Neon)
                    }
                }
            }
        }

        // ---------------- stats ----------------
        Spacer(Modifier.height(18.dp))
        AnimatedVisibility(
            visible = phase == Phase.CONNECTED,
            enter = fadeIn() + slideInVertically { it },
            exit = fadeOut() + slideOutVertically { it }
        ) {
            StatsPanel(seconds, downMbps, upMbps)
        }

        Spacer(Modifier.weight(1f))

        // ---------------- footer (admin trigger) ----------------
        Text(
            "Mianboor v1.0.0",
            color = TextDim.copy(alpha = 0.7f),
            fontSize = 12.sp,
            modifier = Modifier
                .padding(vertical = 14.dp)
                .pointerInput(Unit) {
                    detectTapGestures(
                        onTap = { onTapVersion() },
                        onLongPress = { showAdmin = true }
                    )
                }
        )
    }

    if (showAdmin) {
        AdminDialog(
            initialUrl = AppPrefs.serverUrl(context),
            initialToken = AppPrefs.clientToken(context),
            onDismiss = { showAdmin = false },
            onSave = { url, token ->
                AppPrefs.save(context, url, token)
                configured = AppPrefs.isConfigured(context)
                showAdmin = false
            }
        )
    }
}

// ---------------------------------------------------------------------------
// Power button
// ---------------------------------------------------------------------------

@Composable
private fun PowerButton(phase: Phase, onTap: () -> Unit) {
    val busy = phase == Phase.SCANNING || phase == Phase.CONNECTING || phase == Phase.DISCONNECTING
    val connected = phase == Phase.CONNECTED
    val glowColor = if (connected || busy) Neon else TextDim.copy(alpha = 0.35f)

    val pulse = rememberInfiniteTransition(label = "pulse")
    val ringScale by pulse.animateFloat(
        0.94f, 1.10f,
        infiniteRepeatable(tween(1700, easing = FastOutSlowInEasing), RepeatMode.Restart),
        label = "ringScale"
    )
    val ringAlpha by pulse.animateFloat(
        0.5f, 0.0f,
        infiniteRepeatable(tween(1700, easing = FastOutSlowInEasing), RepeatMode.Restart),
        label = "ringAlpha"
    )
    val spin = rememberInfiniteTransition(label = "spin")
    val angle by spin.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart),
        label = "angle"
    )

    Box(
        modifier = Modifier
            .padding(top = 10.dp)
            .size(240.dp)
            .pointerInput(Unit) { detectTapGestures(onTap = { onTap() }) },
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val r = size.minDimension * 0.30f

            // soft outer halos
            if (connected || busy) {
                for (i in 0..2) {
                    val scale = ringScale + i * 0.09f
                    val alpha = (ringAlpha - i * 0.13f).coerceIn(0f, 1f)
                    if (alpha > 0.01f) {
                        drawCircle(
                            color = Neon.copy(alpha = alpha),
                            radius = r * scale,
                            center = Offset(cx, cy),
                            style = Stroke(width = 3.dp.toPx())
                        )
                    }
                }
            } else {
                drawCircle(
                    color = glowColor.copy(alpha = 0.15f),
                    radius = r * 1.28f,
                    center = Offset(cx, cy),
                    style = Stroke(width = 2.dp.toPx())
                )
            }

            // rotating dashes while busy
            if (busy) {
                rotate(angle, Offset(cx, cy)) {
                    val dash = 14f
                    val gap = 12f
                    var a = 0f
                    while (a < 360f) {
                        drawArc(
                            color = Neon.copy(alpha = 0.65f),
                            startAngle = a,
                            sweepAngle = dash,
                            useCenter = false,
                            topLeft = Offset(cx - r * 1.42f, cy - r * 1.42f),
                            size = androidx.compose.ui.geometry.Size(r * 2.84f, r * 2.84f),
                            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
                        )
                        a += dash + gap
                    }
                }
            }

            // main disc
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        if (connected) Color(0xFF17A87A) else Color(0xFF123229),
                        Color(0xFF071310)
                    ),
                    center = Offset(cx, cy),
                    radius = r
                ),
                radius = r,
                center = Offset(cx, cy)
            )
            drawCircle(
                color = if (connected) Neon else Neon.copy(alpha = 0.55f),
                radius = r,
                center = Offset(cx, cy),
                style = Stroke(width = 4.dp.toPx())
            )

            // power glyph: circle arc with gap on top + vertical line
            val gr = r * 0.52f
            val sw = 5.dp.toPx()
            drawArc(
                color = TextMain,
                startAngle = -55f,
                sweepAngle = 290f,
                useCenter = false,
                topLeft = Offset(cx - gr, cy - gr),
                size = androidx.compose.ui.geometry.Size(gr * 2f, gr * 2f),
                style = Stroke(width = sw, cap = StrokeCap.Round)
            )
            drawLine(
                color = TextMain,
                start = Offset(cx, cy - gr - sw * 1.1f),
                end = Offset(cx, cy - gr * 0.42f),
                strokeWidth = sw,
                cap = StrokeCap.Round
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Stats panel
// ---------------------------------------------------------------------------

@Composable
private fun StatsPanel(seconds: Int, down: Double, up: Double) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = PanelColor,
        border = androidx.compose.foundation.BorderStroke(1.dp, PanelStroke)
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val mm = seconds / 60
            val ss = seconds % 60
            Text(
                faDigits(String.format(Locale.US, "%02d:%02d", mm, ss)),
                color = TextMain,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                SpeedCell("↓", down, TextMain)
                SpeedCell("↑", up, NeonSoft)
            }
            Spacer(Modifier.height(14.dp))
            QualityBars(if (down >= 8) 5 else if (down >= 4) 4 else if (down >= 2) 3 else if (down >= 0.5) 2 else if (down > 0.0) 1 else 0)
            Spacer(Modifier.height(4.dp))
            Text("کیفیت اتصال", color = TextDim, fontSize = 12.sp)
        }
    }
}

@Composable
private fun SpeedCell(arrow: String, mbps: Double, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(arrow, color = color, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.width(6.dp))
        Text(
            "${fmtSpeed(mbps)} مگابیت",
            color = TextMain,
            fontSize = 15.sp
        )
    }
}

@Composable
private fun QualityBars(active: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(5) { i ->
            Box(
                Modifier
                    .size(width = 22.dp, height = 8.dp)
                    .background(
                        if (i < active) Neon else Neon.copy(alpha = 0.12f),
                        RoundedCornerShape(4.dp)
                    )
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Admin dialog (hidden — 5 taps or long-press on the version)
// ---------------------------------------------------------------------------

@Composable
private fun AdminDialog(
    initialUrl: String,
    initialToken: String,
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit
) {
    var url by remember { mutableStateOf(initialUrl) }
    var token by remember { mutableStateOf(initialToken) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تنظیمات مدیر", color = TextMain, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(
                    "این تنظیمات فقط برای مدیر میانبر است.",
                    color = TextDim,
                    fontSize = 12.sp
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("آدرس سرور") },
                    placeholder = { Text("https://example.com") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = token,
                    onValueChange = { token = it },
                    label = { Text("توکن کلاینت") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(url, token) }) { Text("ذخیره", color = Neon) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("انصراف", color = TextDim) }
        },
        containerColor = PanelColor
    )
}
