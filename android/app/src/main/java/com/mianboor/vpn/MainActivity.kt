package com.mianboor.vpn

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.mianboor.vpn.ui.AccountScreen
import com.mianboor.vpn.ui.AdminLogin
import com.mianboor.vpn.ui.AdminPanel
import com.mianboor.vpn.ui.FREE_QUOTA_GB
import com.mianboor.vpn.ui.HomeScreen
import com.mianboor.vpn.ui.InboxScreen
import com.mianboor.vpn.ui.InstalledApp
import com.mianboor.vpn.ui.Lang
import com.mianboor.vpn.ui.LocalMb
import com.mianboor.vpn.ui.MbThemes
import com.mianboor.vpn.ui.PlansSheet
import com.mianboor.vpn.ui.ServersScreen
import com.mianboor.vpn.ui.SettingsScreen
import com.mianboor.vpn.ui.SplitScreen
import com.mianboor.vpn.ui.TG_SUPPORT
import com.mianboor.vpn.ui.ThemeName
import com.mianboor.vpn.ui.Vazir
import com.mianboor.vpn.ui.consumeClicks
import com.mianboor.vpn.ui.drawableToBitmap
import com.mianboor.vpn.ui.stringsOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.security.MessageDigest

enum class Screen { HOME, SERVERS, ACCOUNT, SETTINGS, SPLIT, INBOX, LOGIN, ADMIN }

data class Entitlement(val plan: String, val expiresAt: Long)

private const val HOLD_MS = 5000L
private const val PING_INTERVAL_MS = 3000L

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MbApp() }
    }
}

fun vibrateTick(context: Context) {
    runCatching {
        val v: Vibrator = if (Build.VERSION.SDK_INT >= 31) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        v.vibrate(VibrationEffect.createOneShot(60, VibrationEffect.DEFAULT_AMPLITUDE))
    }
}

private fun computeDeviceId(context: Context): String {
    val raw = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "mianboor"
    val digest = runCatching {
        MessageDigest.getInstance("MD5").digest(raw.toByteArray())
            .joinToString("") { String.format("%02X", it) }
    }.getOrDefault(raw.uppercase().padEnd(8, '0').take(8))
    return "MB-${digest.take(4)}-${digest.substring(4, 8)}"
}

@Composable
fun MbApp() {
    val context = LocalContext.current

    var lang by remember { mutableStateOf(if (AppPrefs.lang(context) == "fa") Lang.FA else Lang.EN) }
    var themeName by remember {
        mutableStateOf(runCatching { ThemeName.valueOf(AppPrefs.theme(context)) }.getOrDefault(ThemeName.MIDNIGHT))
    }
    val mb = MbThemes.of(themeName)

    CompositionLocalProvider(
        LocalMb provides mb,
        LocalTextStyle provides LocalTextStyle.current.copy(fontFamily = Vazir),
    ) {
        CompositionLocalProvider(
            LocalLayoutDirection provides if (lang == Lang.FA) LayoutDirection.Rtl else LayoutDirection.Ltr,
        ) {
            MbAppInner(lang, themeName, onLang = { l ->
                lang = l
                AppPrefs.setLang(context, if (l == Lang.FA) "fa" else "en")
            }, onTheme = { th ->
                themeName = th
                AppPrefs.setTheme(context, th.name)
            })
        }
    }
}

@Composable
private fun MbAppInner(
    lang: Lang,
    themeName: ThemeName,
    onLang: (Lang) -> Unit,
    onTheme: (ThemeName) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val mb = LocalMb.current
    val t = stringsOf(lang)
    val rtl = lang == Lang.FA
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current

    // ── vpn engine state ──
    val phase by VpnState.phase.collectAsState()
    val coverMsg by VpnState.coverMsg.collectAsState()
    val errorMessage by VpnState.errorMessage.collectAsState()
    val rxBytes by VpnState.rxBytes.collectAsState()
    val txBytes by VpnState.txBytes.collectAsState()

    // ── ui state ──
    var screen by remember { mutableStateOf(Screen.HOME) }
    var configs by remember { mutableStateOf<List<ConfigItem>>(emptyList()) }
    val pings = remember { mutableStateMapOf<String, Int>() }
    var selectedKey by remember { mutableStateOf(AppPrefs.selectedKey(context)) }
    var seconds by remember { mutableIntStateOf(0) }
    var downMbps by remember { mutableDoubleStateOf(0.0) }
    var upMbps by remember { mutableDoubleStateOf(0.0) }

    var entitlement by remember {
        mutableStateOf(Entitlement(AppPrefs.plan(context), AppPrefs.planExpiresAt(context)))
    }
    var orders by remember { mutableStateOf(AppPrefs.orders(context)) }
    var usedGb by remember { mutableDoubleStateOf(AppPrefs.usageBytes(context) / 1e9) }
    var trialUsed by remember { mutableStateOf(AppPrefs.trialUsed(context)) }
    var reinstalls by remember { mutableIntStateOf(AppPrefs.reinstalls(context)) }
    var deviceId by remember { mutableStateOf(AppPrefs.deviceId(context)) }

    // ── آی‌پی مبدا / فلش اتصال / بنر آپدیت / وضعیت نسخهٔ سرور ──
    var originIp by remember { mutableStateOf(AppPrefs.ipInfo(context)?.first) }
    var originCc by remember { mutableStateOf(AppPrefs.ipInfo(context)?.second ?: "ir") }
    var showFlash by remember { mutableStateOf(false) }
    var updateTag by remember { mutableStateOf<String?>(null) }
    var serverOld by remember { mutableStateOf(false) }

    // ── اعلان‌ها: صندوق + پاپ‌آپ ──
    var notices by remember { mutableStateOf(AppPrefs.noticesCache(context)) }
    var popupNotice by remember { mutableStateOf<Notice?>(null) }
    var otaDownloadId by remember { mutableLongStateOf(-1L) }

    var splitMode by remember { mutableStateOf(AppPrefs.splitMode(context)) }
    var splitApps by remember { mutableStateOf(AppPrefs.splitApps(context)) }
    var killSwitch by remember { mutableStateOf(AppPrefs.killSwitch(context)) }
    var autoConnect by remember { mutableStateOf(AppPrefs.autoConnect(context)) }
    var pingLive by remember { mutableStateOf(AppPrefs.pingLive(context)) }

    var installedApps by remember { mutableStateOf<List<InstalledApp>>(emptyList()) }

    var adminUnlocked by remember { mutableStateOf(false) }
    var adminNotices by remember { mutableStateOf<List<Notice>>(emptyList()) }
    var adminPass by remember { mutableStateOf(AppPrefs.adminPass(context)) }
    var premiumOv by remember { mutableStateOf(AppPrefs.premiumOv(context)) }
    var disabledOv by remember { mutableStateOf(AppPrefs.stringSet(context, "disabled_ov")) }
    var hiddenOv by remember { mutableStateOf(AppPrefs.stringSet(context, "hidden_ov")) }
    var blockRoot by remember { mutableStateOf(true) }

    // ── sync state (سرور مرجع نهایی است) ──
    var syncing by remember { mutableStateOf(false) }
    var syncOk by remember {
        mutableStateOf(if (AppPrefs.lastSyncAt(context) == 0L) null else AppPrefs.lastSyncOk(context))
    }
    var lastSyncAt by remember { mutableStateOf(AppPrefs.lastSyncAt(context)) }
    var payInfo by remember { mutableStateOf(PayInfo()) }
    var serverOrders by remember { mutableStateOf<List<RemoteOrder>>(emptyList()) }
    var serverDevices by remember { mutableStateOf<List<RemoteDevice>>(emptyList()) }
    var adminBusy by remember { mutableStateOf(false) }

    var plansReason by remember { mutableStateOf<String?>(null) }
    var showSetup by remember { mutableStateOf(false) }
    var toastMsg by remember { mutableStateOf<String?>(null) }
    var toastKey by remember { mutableLongStateOf(0L) }

    val premium = entitlement.plan != "free" && entitlement.expiresAt > System.currentTimeMillis()
    val trialLocked = trialUsed || (!premium && usedGb >= FREE_QUOTA_GB)

    /** نوتیف سیستم — اعلان جدید در نوار وضعیت گوشی. */
    fun postNoticeNotification(unread: Int) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            nm.createNotificationChannel(
                android.app.NotificationChannel("notices", "Mianboor", android.app.NotificationManager.IMPORTANCE_DEFAULT),
            )
            val fa = AppPrefs.lang(context) == "fa"
            val pi = android.app.PendingIntent.getActivity(
                context, 41, Intent(context, MainActivity::class.java),
                android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
            )
            val notif = android.app.Notification.Builder(context, "notices")
                .setSmallIcon(R.drawable.ic_bell)
                .setContentTitle("Mianboor")
                .setContentText(if (fa) "$unread اعلان جدید داری" else "You have $unread new notice(s)")
                .setContentIntent(pi)
                .setAutoCancel(true)
            nm.notify(4101, notif.build())
        } catch (t: Throwable) {
        }
    }

    /** گرفتن اعلان‌ها از سرور: کش محلی + پاپ‌آپ جدید + نوتیف سیستم. */
    fun refreshNotices() {
        val url = AppPrefs.serverUrl(context)
        val token = AppPrefs.clientToken(context)
        val dev = deviceId
        if (!url.startsWith("http") || token.isBlank() || dev.isBlank()) return
        scope.launch(Dispatchers.IO) {
            val fresh = MianboorApi.notices(url, token, dev)
            if (fresh.isEmpty()) return@launch
            val beforeUnread = AppPrefs.noticesCache(context).count { !it.read }
            val unread = fresh.count { !it.read }
            AppPrefs.setNoticesCache(context, fresh)
            withContext(Dispatchers.Main) {
                notices = fresh
                val seen = AppPrefs.popupSeen(context)
                if (popupNotice == null) {
                    fresh.firstOrNull { it.kind == "popup" && !it.read && it.id !in seen }?.let { pn ->
                        popupNotice = pn
                        AppPrefs.addPopupSeen(context, pn.id)
                    }
                }
                if (unread > beforeUnread) postNoticeNotification(unread)
            }
        }
    }

    /** OTA: دانلود مستقیم APK نسخهٔ جدید و باز کردن خودکار نصب‌کننده. */
    fun downloadAndInstallUpdate() {
        val url = AppPrefs.latestUpdateUrl(context).ifBlank { "https://github.com/mostafaiekii/mianboor/releases/latest" }
        if (!url.endsWith(".apk")) {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
            return
        }
        try {
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
            if (otaDownloadId != -1L) dm.remove(otaDownloadId)
            val req = android.app.DownloadManager.Request(Uri.parse(url))
                .setTitle("Mianboor update")
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(context, null, "ota/update.apk")
            otaDownloadId = dm.enqueue(req)
            Toast.makeText(context, if (AppPrefs.lang(context) == "fa") "دانلود شروع شد…" else "Download started…", Toast.LENGTH_SHORT).show()
        } catch (t: Throwable) {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        }
    }

    fun toast(msg: String) {
        toastMsg = msg
        toastKey = System.currentTimeMillis()
    }

    LaunchedEffect(toastKey) {
        if (toastKey > 0) {
            delay(2800)
            toastMsg = null
        }
    }

    // ── config merging ──
    fun rebuildConfigs() {
        val cached = AppPrefs.serverCache(context)
        val locals = AppPrefs.localConfigs(context)
        val list = buildList {
            cached.forEach { cc ->
                val parsed = XrayConfigBuilder.parseLink(cc.link, cc.name, cc.country) ?: return@forEach
                val key = "srv:${cc.id}"
                if (key in hiddenOv) return@forEach
                add(
                    ConfigItem(
                        key = key, name = cc.name, country = cc.country,
                        protocol = parsed.protocol, host = parsed.host, port = parsed.port,
                        ping = 90, premium = premiumOv[key] ?: cc.premium,
                        enabled = cc.active && key !in disabledOv, link = cc.link, local = false,
                    ),
                )
            }
            locals.forEach { lc ->
                val parsed = XrayConfigBuilder.parseLink(lc.link, lc.name, lc.country) ?: return@forEach
                val key = "loc:${lc.id}"
                add(
                    ConfigItem(
                        key = key, name = lc.name, country = lc.country,
                        protocol = parsed.protocol, host = parsed.host, port = parsed.port,
                        ping = 90, premium = premiumOv[key] ?: lc.premium,
                        enabled = lc.enabled, link = lc.link, local = true,
                    ),
                )
            }
        }
        configs = list
    }

    /**
     * Sync از سرور — مرجع نهایی:
     *  - کانفیگ‌های مجاز این دستگاه (بر اساس پرمیوم بودنش روی سرور) کش می‌شود
     *  - وضعیت پرمیوم دستگاه از سرور خوانده و اعمال می‌شود (مدیر از پنل، دستگاه را پرمیوم کرده)
     *  - اطلاعات کارت‌به‌کارت برای صفحه خرید می‌آید
     *  - دستگاه روی سرور ثبت/به‌روز می‌شود (برای تب Users پنل مدیر)
     *  - دستگاه مدیر (با کلید سرور): علاوه بر این، لیست کامل مدیریتی را می‌گیرد
     */
    fun refreshRemote(onDone: (Boolean) -> Unit = {}) {
        if (!AppPrefs.isConfigured(context)) {
            onDone(false)
            return
        }
        if (syncing) {
            onDone(false)
            return
        }
        syncing = true
        scope.launch(Dispatchers.IO) {
            runCatching {
                val url = AppPrefs.serverUrl(context)
                val key = AppPrefs.adminServerKey(context)
                val hint = if (premium) "premium" else "free"
                var result = MianboorApi.sync(url, AppPrefs.clientToken(context), deviceId, hint)
                if (key.isNotBlank()) {
                    // دستگاه مدیر: لیست کامل (شامل غیرفعال‌ها) برای مدیریت —
                    // اگر سرور قدیمی است و کلید را نمی‌شناسد، sync عادی ادامه می‌یابد
                    val managed = runCatching {
                        MianboorApi.adminListConfigsAny(url, key, AppPrefs.adminServerPass(context))
                    }.getOrDefault(emptyList())
                    if (managed.isNotEmpty()) result = result.copy(configs = managed)
                }
                val newPremium = result.plan != null &&
                    result.plan == "premium" &&
                    result.premiumUntil > System.currentTimeMillis()
                withContext(Dispatchers.Main) {
                    // سرور مرجع است — فقط وقتی سرور جدید (plan != null) جواب داده
                    if (result.plan != null) {
                        if (entitlement.plan == "free" && newPremium) {
                            toast(t.orderApprovedToast)
                        }
                        entitlement =
                            if (newPremium) Entitlement("premium", result.premiumUntil)
                            else Entitlement("free", 0L)
                        AppPrefs.setPlan(context, entitlement.plan, entitlement.expiresAt)
                    }
                    payInfo = result.pay
                    AppPrefs.setServerCache(
                        context,
                        result.configs.map {
                            AppPrefs.CachedConfig(it.id, it.name, it.country, it.link, it.premium, it.active)
                        },
                    )
                    AppPrefs.setSyncStatus(context, true)
                    AppPrefs.setSyncError(context, "")
                    AppPrefs.setServerBuild(context, result.serverBuild ?: "")
                    // نسخهٔ جدید اعلام‌شده از سرور — اولویت با سرور، گیت‌هاب فقط fallback
                    if (result.latestCode > BuildConfig.VERSION_CODE) {
                        AppPrefs.setLatestUpdateUrl(context, result.latestUrl ?: "")
                        updateTag = result.latestName ?: "v${result.latestCode}"
                    }
                    syncOk = true
                    lastSyncAt = System.currentTimeMillis()
                    // plan == null یعنی سرور قدیمی — بنر هشدار در پنل مدیر نشان داده می‌شود
                    serverOld = result.plan == null
                    rebuildConfigs()
                    refreshNotices()
                    onDone(true)
                    // سفارش‌های ارسال‌نشدهٔ قبلی را دوباره بفرست
                    val unsent = AppPrefs.unsentOrders(context)
                    if (unsent.length() > 0) {
                        scope.launch(Dispatchers.IO) {
                            val keep = org.json.JSONArray()
                            for (i in 0 until unsent.length()) {
                                val o = unsent.optJSONObject(i) ?: continue
                                val okId = runCatching {
                                    MianboorApi.submitOrder(
                                        AppPrefs.serverUrl(context), AppPrefs.clientToken(context), deviceId,
                                        o.optString("plan"), o.optString("via"),
                                    )
                                }.getOrNull()
                                if (okId == null) keep.put(o)
                            }
                            AppPrefs.setUnsentOrders(context, keep)
                        }
                    }
                }
            }.onFailure {
                withContext(Dispatchers.Main) {
                    AppPrefs.setSyncStatus(context, false)
                    AppPrefs.setSyncError(context, it.message ?: it.javaClass.simpleName)
                    syncOk = false
                    lastSyncAt = System.currentTimeMillis()
                    onDone(false)
                }
            }
            withContext(Dispatchers.Main) { syncing = false }
        }
    }

    /** بارگذاری داده‌های پنل مدیر از سرور (سفارش‌ها + دستگاه‌ها). */
    fun loadAdminData() {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (!url.startsWith("http") || key.isBlank()) return
        adminBusy = true
        scope.launch(Dispatchers.IO) {
            val orders = runCatching { MianboorApi.adminListOrders(url, key) }.getOrDefault(emptyList())
            val devices = runCatching { MianboorApi.adminListDevices(url, key) }.getOrDefault(emptyList())
            val noticesList = runCatching { MianboorApi.adminNotices(url, key) }.getOrDefault(emptyList())
            withContext(Dispatchers.Main) {
                serverOrders = orders
                serverDevices = devices
                adminNotices = noticesList
                adminBusy = false
                val pending = orders.count { it.status == "pending" }
                if (pending > 0) toast(t.pendingOrders(pending))
            }
        }
    }

    /** Best-effort server-side admin change (toggle/delete/premium). */
    fun serverAdminSync(id: String, body: JSONObject? = null, delete: Boolean = false) {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (!url.startsWith("http") || key.isBlank()) return
        scope.launch(Dispatchers.IO) {
            runCatching {
                if (delete) MianboorApi.adminDeleteConfig(url, key, id)
                else MianboorApi.adminPatchConfig(url, key, id, body ?: JSONObject())
            }
        }
    }

    val liveConfigs = configs.map { it.copy(ping = pings[it.key] ?: it.ping) }
    val enabledConfigs = liveConfigs.filter { it.enabled }
    val freeEnabled = enabledConfigs.filter { !it.premium }
    val smartPool = if (premium || freeEnabled.isEmpty()) enabledConfigs else freeEnabled
    val bestConfig = smartPool.minByOrNull { it.ping }
    val selectedConfig = enabledConfigs.find { it.key == selectedKey } ?: bestConfig

    // fallback when the selection disappears
    LaunchedEffect(enabledConfigs) {
        if (enabledConfigs.isNotEmpty() && enabledConfigs.none { it.key == selectedKey }) {
            selectedKey = bestConfig?.key
            AppPrefs.setSelectedKey(context, bestConfig?.key)
        }
    }

    // ── init: device id, cached configs, fresh fetch, installed apps ──
    LaunchedEffect(Unit) {
        if (deviceId.isBlank()) {
            deviceId = computeDeviceId(context)
            AppPrefs.setDeviceId(context, deviceId)
        }
        rebuildConfigs()
        launch(Dispatchers.IO) {
            // refresh installed apps for split tunneling
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val apps = runCatching {
                pm.queryIntentActivities(intent, 0)
                    .mapNotNull { ri ->
                        val pkg = ri.activityInfo.packageName
                        if (pkg == context.packageName) return@mapNotNull null
                        InstalledApp(
                            pkg = pkg,
                            label = ri.loadLabel(pm).toString(),
                            icon = drawableToBitmap(runCatching { ri.loadIcon(pm) }.getOrNull()),
                        )
                    }
                    .sortedBy { it.label.lowercase() }
            }.getOrDefault(emptyList())
            installedApps = apps
        }
        launch(Dispatchers.IO) { refreshRemote() }
    }

    // ── live ping engine: re-measure every 3s, one socket pool, no interference ──
    val configsForPing by rememberUpdatedState(configs)
    LaunchedEffect(pingLive) {
        if (!pingLive) return@LaunchedEffect
        while (true) {
            val targets = configsForPing.filter { it.enabled }
            if (targets.isNotEmpty()) {
                val results = coroutineScope {
                    targets.map { c ->
                        async(Dispatchers.IO) {
                            val ms = ServerTester.ping(c.host, c.port)
                            c.key to (ms?.toInt() ?: 999)
                        }
                    }.awaitAll()
                }
                pings.putAll(results.toMap())
            }
            delay(PING_INTERVAL_MS)
        }
    }

    // ── connection timer ──
    LaunchedEffect(phase) {
        if (phase == Phase.CONNECTED) {
            seconds = 0
            while (true) {
                delay(1000)
                seconds++
            }
        }
    }

    // ── live speeds + monthly usage accounting ──
    var lastRx by remember { mutableLongStateOf(0L) }
    var lastTx by remember { mutableLongStateOf(0L) }
    var tick by remember { mutableIntStateOf(0) }
    LaunchedEffect(phase) {
        if (phase == Phase.CONNECTED) {
            lastRx = 0L; lastTx = 0L; tick = 0
            var pendingBytes = 0L
            var sessionBytes = 0L
            while (true) {
                delay(1000)
                val drx = (rxBytes - lastRx).coerceAtLeast(0L)
                val dtx = (txBytes - lastTx).coerceAtLeast(0L)
                if (lastRx > 0L || lastTx > 0L) {
                    downMbps = drx * 8.0 / 1_000_000.0
                    upMbps = dtx * 8.0 / 1_000_000.0
                    if (!premium) pendingBytes += drx + dtx
                    sessionBytes += drx + dtx
                }
                lastRx = rxBytes; lastTx = txBytes
                tick++
                if (tick % 5 == 0 && pendingBytes > 0) {
                    AppPrefs.addUsage(context, pendingBytes)
                    usedGb = AppPrefs.usageBytes(context) / 1e9
                    pendingBytes = 0
                    if (!premium && usedGb >= FREE_QUOTA_GB && !trialUsed) {
                        trialUsed = true
                        AppPrefs.setTrialUsed(context, true)
                    }
                }
                // مصرف هر سرور (برای پرمیوم هم) — هویت سرور از آخرین اتصال ذخیره‌شده خوانده می‌شود
                if (tick % 5 == 0 && sessionBytes > 0L) {
                    UsageTracker.addServerBytes(
                        context, AppPrefs.lastName(context), AppPrefs.lastCountry(context), sessionBytes,
                    )
                    sessionBytes = 0L
                }
                // نمونه‌گیری مصرف به تفکیک اپ هر ۲۰ ثانیه
                if (tick % 20 == 0) withContext(Dispatchers.IO) { UsageTracker.samplePerApp(context) }
            }
        }
    }

    // ── آی‌پی و کشور مبدا: قبل از اتصال (تا IP واقعی کاربر باشد)، کش ۶ ساعته ──
    LaunchedEffect(Unit) {
        if (phase == Phase.CONNECTED) return@LaunchedEffect
        if (System.currentTimeMillis() - AppPrefs.ipInfoAge(context) < 6 * 3_600_000L && AppPrefs.ipInfo(context) != null) return@LaunchedEffect
        withContext(Dispatchers.IO) {
            val o = fetchIpWhoIs()
            if (o != null) {
                AppPrefs.setIpInfo(context, o.first, o.second)
                withContext(Dispatchers.Main) {
                    originIp = o.first; originCc = o.second.lowercase()
                }
            }
        }
    }

    // ── فلش لحظه اتصال ──
    LaunchedEffect(phase) {
        if (phase == Phase.CONNECTED) {
            showFlash = true
            delay(4500)
            showFlash = false
        }
    }

    // ── چکر نسخهٔ جدید (GitHub Releases) — هر ۶ ساعت یک بار ──
    LaunchedEffect(Unit) {
        if (System.currentTimeMillis() - AppPrefs.lastUpdateCheck(context) < 6 * 3_600_000L) return@LaunchedEffect
        AppPrefs.setUpdateChecked(context)
        withContext(Dispatchers.IO) {
            val tag = fetchLatestReleaseTag()
            if (tag != null && isNewerVersion(tag, BuildConfig.VERSION_NAME)) {
                withContext(Dispatchers.Main) { updateTag = tag }
            }
        }
    }

    // ── OTA: گیرندهٔ پایان دانلود → باز کردن خودکار نصب‌کننده ──
    DisposableEffect(Unit) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, i: Intent?) {
                val id = i?.getLongExtra(android.app.DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: return
                if (id != otaDownloadId) return
                runCatching {
                    val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
                    val uri = dm.getUriForDownloadedFile(id) ?: return
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }
            }
        }
        context.registerReceiver(receiver, IntentFilter(android.app.DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        onDispose { runCatching { context.unregisterReceiver(receiver) } }
    }

    // ── rotating cover messages while busy ──
    LaunchedEffect(phase, lang) {
        while (phase == Phase.SCANNING || phase == Phase.CONNECTING) {
            VpnState.coverMsg.value =
                (if (phase == Phase.SCANNING) t.scanningMsgs else t.connectingMsgs).random()
            delay(1400)
        }
    }

    // ── vpn start/stop ──
    var pendingTarget by remember { mutableStateOf<ConfigItem?>(null) }

    fun launchVpn(server: ConfigItem) {
        val intent = Intent(context, MianboorVpnService::class.java)
            .setAction(MianboorVpnService.ACTION_CONNECT)
            .putExtra(MianboorVpnService.EXTRA_LINK, server.link)
            .putExtra(MianboorVpnService.EXTRA_NAME, server.name)
            .putExtra(MianboorVpnService.EXTRA_COUNTRY, server.country)
        VpnState.reset()
        VpnState.phase.value = Phase.CONNECTING
        ContextCompat.startForegroundService(context, intent)
    }

    val vpnPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val server = pendingTarget
        pendingTarget = null
        if (result.resultCode == Activity.RESULT_OK && server != null) {
            launchVpn(server)
        } else {
            VpnState.phase.value = Phase.IDLE
            VpnState.errorMessage.value = t.errPermission
        }
    }

    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    fun requestNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun powerTap() {
        when (phase) {
            Phase.CONNECTED -> {
                VpnState.phase.value = Phase.DISCONNECTING
                context.startService(
                    Intent(context, MianboorVpnService::class.java)
                        .setAction(MianboorVpnService.ACTION_DISCONNECT),
                )
                seconds = 0
                return
            }
            Phase.CONNECTING, Phase.SCANNING, Phase.DISCONNECTING -> return
            else -> Unit
        }
        requestNotificationsIfNeeded()
        if (!AppPrefs.isConfigured(context)) {
            showSetup = true
            return
        }
        if (!premium && trialLocked) {
            plansReason = "trial-over"
            toast(t.trialOverUpsell)
            return
        }
        val target = selectedConfig ?: bestConfig
        if (target == null) {
            toast(t.noServers)
            return
        }
        // if the selected server looks dead, quietly fall back to the fastest one
        val chosen = if ((pings[target.key] ?: target.ping) >= 900) bestConfig ?: target else target
        selectedKey = chosen.key
        AppPrefs.setSelectedKey(context, chosen.key)
        val prepare = VpnService.prepare(context)
        if (prepare != null) {
            pendingTarget = chosen
            vpnPermission.launch(prepare)
        } else {
            launchVpn(chosen)
        }
    }

    // ── orders & entitlement ──
    /**
     * ثبت سفارش خرید — روی سرور ذخیره می‌شود تا در تب Orders پنل مدیر ظاهر شود.
     * onResult با شناسه‌ی واقعی سرور (یا شناسه محلی در حالت آفلاین) صدا می‌شود.
     */
    fun createOrder(plan: String, via: String, onResult: (String) -> Unit) {
        val price = when (plan) { "p1" -> 200_000L; "p3" -> 400_000L; else -> 700_000L }
        scope.launch(Dispatchers.IO) {
            val remoteId = runCatching {
                MianboorApi.submitOrder(
                    AppPrefs.serverUrl(context), AppPrefs.clientToken(context), deviceId, plan, via,
                )
            }.getOrNull()
            val id = remoteId ?: "MB-${(1000..9999).random()}"
            if (remoteId == null) {
                // آفلاین — سفارش محلی نگه داشته شود تا بعداً دنبال شود
                withContext(Dispatchers.Main) {
                    orders = listOf(Order(id, plan, price, deviceId, via, System.currentTimeMillis(), "pending")) + orders
                    AppPrefs.setOrders(context, orders)
                }
                // در صندوق ارسال هم بگذار تا با sync بعدی دوباره به سرور فرستاده شود
                val unsent = AppPrefs.unsentOrders(context)
                unsent.put(org.json.JSONObject().put("plan", plan).put("via", via))
                AppPrefs.setUnsentOrders(context, unsent)
            }
            withContext(Dispatchers.Main) {
                toast(t.orderPlacedToast)
                onResult(id)
            }
        }
    }

    /** تأیید/رد سفارش روی سرور — دستگاه خریدار با sync بعدی پرمیوم می‌شود. */
    fun serverOrderAction(id: String, action: String) {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (!url.startsWith("http") || key.isBlank()) {
            toast("Set the server key in the Server tab first")
            return
        }
        scope.launch(Dispatchers.IO) {
            val ok = runCatching { MianboorApi.adminOrderAction(url, key, id, action) }.getOrDefault(false)
            withContext(Dispatchers.Main) {
                toast(
                    when {
                        !ok -> "Server action failed — check the key"
                        action == "approve" -> "Approved — user gets premium on their next sync"
                        else -> "Order rejected"
                    },
                )
                loadAdminData()
                refreshRemote()
            }
        }
    }

    /** پرمیوم‌کردن مستقیم دستگاه (خرید تلگرامی) یا لغو آن. days=0 یعنی لغو. */
    fun serverDevicePremium(targetDevice: String, days: Int) {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (!url.startsWith("http") || key.isBlank()) {
            toast("Set the server key in the Server tab first")
            return
        }
        scope.launch(Dispatchers.IO) {
            val ok = runCatching { MianboorApi.adminDevicePremium(url, key, targetDevice, days) }.getOrDefault(false)
            withContext(Dispatchers.Main) {
                toast(
                    when {
                        !ok -> "Server action failed — check the key"
                        days > 0 -> "$targetDevice premium for $days days — they get it on next sync"
                        else -> "$targetDevice downgraded to free"
                    },
                )
                loadAdminData()
                refreshRemote()
            }
        }
    }

    /** ذخیره‌ی اطلاعات کارت‌به‌کارت روی سرور (در اپ همه‌ی کاربران دیده می‌شود). */
    fun savePayInfo(info: PayInfo) {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (!url.startsWith("http") || key.isBlank()) {
            toast("Set the server key in the Server tab first")
            return
        }
        scope.launch(Dispatchers.IO) {
            val ok = runCatching { MianboorApi.adminSavePayInfo(url, key, info) }.getOrDefault(false)
            withContext(Dispatchers.Main) {
                toast(if (ok) "Payment info saved — users see it instantly" else "Save failed — check the key")
                if (ok) payInfo = info
            }
        }
    }

    /** تست کلید/رمز مدیر (دکمه در تب Server) — کلید یا کوکی هرکدام کار کند موفق. */
    fun testServerKey(key: String, onResult: (Boolean) -> Unit) {
        val url = AppPrefs.serverUrl(context)
        scope.launch(Dispatchers.IO) {
            val ok = MianboorApi.adminTestAny(url, key, AppPrefs.adminServerPass(context))
            withContext(Dispatchers.Main) { onResult(ok) }
        }
    }

    // ── split tunneling actions ──
    fun setSplitMode(mode: String) {
        splitMode = mode
        AppPrefs.setSplitMode(context, mode)
    }

    fun toggleSplitApp(pkg: String) {
        val next = if (pkg in splitApps) splitApps - pkg else splitApps + pkg
        splitApps = next
        AppPrefs.setSplitApps(context, next)
    }

    fun clearSplit() {
        splitApps = emptyList()
        AppPrefs.setSplitApps(context, emptyList())
    }

    // ── admin actions ──
    fun toggleConfig(key: String, v: Boolean) {
        if (key.startsWith("srv:")) {
            disabledOv = if (v) disabledOv - key else disabledOv + key
            AppPrefs.setStringSet(context, "disabled_ov", disabledOv)
            serverAdminSync(key.removePrefix("srv:"), JSONObject().put("active", v))
        } else {
            val locals = AppPrefs.localConfigs(context).map {
                if ("loc:${it.id}" == key) it.copy(enabled = v) else it
            }
            AppPrefs.setLocalConfigs(context, locals)
        }
        rebuildConfigs()
    }

    fun deleteConfig(key: String) {
        if (key.startsWith("srv:")) {
            hiddenOv = hiddenOv + key
            AppPrefs.setStringSet(context, "hidden_ov", hiddenOv)
            serverAdminSync(key.removePrefix("srv:"), delete = true)
        } else {
            AppPrefs.setLocalConfigs(
                context,
                AppPrefs.localConfigs(context).filter { "loc:${it.id}" != key },
            )
        }
        rebuildConfigs()
    }

    fun togglePremium(key: String) {
        val cur = premiumOv[key] == true
        premiumOv = premiumOv + (key to !cur)
        AppPrefs.setPremiumOv(context, premiumOv)
        rebuildConfigs()
        if (key.startsWith("srv:")) {
            serverAdminSync(key.removePrefix("srv:"), JSONObject().put("premium", !cur))
        }
    }

    /**
     * Add a config from the admin panel.
     * With a server key configured, the config is published to the server so
     * every device in the target category (free/premium) receives it on the
     * next sync. Without a key it stays on this device only.
     */
    fun addConfig(name: String, country: String, link: String, prem: Boolean) {
        val url = AppPrefs.serverUrl(context)
        val key = AppPrefs.adminServerKey(context)
        if (url.startsWith("http")) {
            scope.launch(Dispatchers.IO) {
                // کلید (سرور جدید) → اگر نشد کوکی با رمز مدیر (سرور قدیمی)
                val how = runCatching {
                    MianboorApi.adminAddConfigAny(
                        url, key, AppPrefs.adminServerPass(context), name, country, link, prem,
                    )
                }.getOrDefault("none")
                withContext(Dispatchers.Main) {
                    if (how != "none") {
                        toast(
                            if (prem) "Published — premium users only"
                            else "Published — all users"
                        )
                        refreshRemote()
                    } else {
                        AppPrefs.addLocalConfig(context, name, country, link, prem)
                        rebuildConfigs()
                        toast("Server publish failed — saved locally")
                    }
                }
            }
        } else {
            AppPrefs.addLocalConfig(context, name, country, link, prem)
            rebuildConfigs()
            toast("Saved locally — set the server key to publish")
        }
    }

    // ── reinstall simulation (anti-fraud) ──
    fun reinstallSim() {
        trialUsed = true
        reinstalls += 1
        AppPrefs.setTrialUsed(context, true)
        AppPrefs.setReinstalls(context, reinstalls)
        AppPrefs.resetUsage(context)
        usedGb = FREE_QUOTA_GB.toDouble()
        VpnState.phase.value = Phase.IDLE
        plansReason = null
        adminUnlocked = false
        screen = Screen.HOME
        entitlement = Entitlement("free", 0)
        AppPrefs.setPlan(context, "free", 0)
        orders = emptyList()
        AppPrefs.setOrders(context, emptyList())
        toast(t.reinstallDoneToast)
    }

    fun openTelegram() {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(TG_SUPPORT))) }
    }

    fun copyDeviceId() {
        clipboard.setText(AnnotatedString(deviceId))
        toast(t.copied)
    }

    // ── back handling ──
    // fresh pull every time the servers list is opened
    LaunchedEffect(screen) {
        if (screen == Screen.SERVERS) refreshRemote()
        if (screen == Screen.ADMIN) loadAdminData()
        if (screen == Screen.INBOX) refreshNotices()
    }
    BackHandler(enabled = screen in setOf(Screen.SERVERS, Screen.SETTINGS, Screen.SPLIT, Screen.INBOX, Screen.LOGIN, Screen.ACCOUNT)) {
        screen = when (screen) {
            Screen.SERVERS, Screen.SETTINGS, Screen.INBOX -> Screen.HOME
            Screen.SPLIT -> Screen.ACCOUNT
            Screen.LOGIN -> Screen.ACCOUNT
            else -> Screen.HOME
        }
    }
    BackHandler(enabled = screen == Screen.ADMIN) {
        adminUnlocked = false
        screen = Screen.ACCOUNT
    }

    val uiState = when (phase) {
        Phase.CONNECTED -> "on"
        Phase.CONNECTING, Phase.SCANNING -> "connecting"
        else -> "off"
    }

    val isAdmin = screen == Screen.LOGIN || screen == Screen.ADMIN

    Box(
        Modifier
            .fillMaxSize()
            .background(mb.night),
    ) {
        // ambient halo like the demo frame
        Box(
            Modifier
                .align(Alignment.TopCenter)
                .size(320.dp, 220.dp)
                .background(
                    androidx.compose.ui.graphics.Brush.radialGradient(
                        listOf(mb.glow.copy(alpha = 0.08f), Color.Transparent),
                    ),
                ),
        )

        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding(),
        ) {
            AnimatedContent(
                targetState = screen,
                transitionSpec = {
                    (fadeIn(androidx.compose.animation.core.tween(220)) +
                        slideInVertically(androidx.compose.animation.core.tween(220)) { it / 24 }) togetherWith
                        fadeOut(androidx.compose.animation.core.tween(160))
                },
                label = "screen",
                modifier = Modifier.weight(1f),
            ) { scr ->
                when (scr) {
                    Screen.HOME -> HomeScreen(
                        lang = lang,
                        state = uiState,
                        onToggle = { powerTap() },
                        seconds = seconds,
                        server = selectedConfig,
                        warn = when {
                            errorMessage != null -> errorMessage
                            !premium && trialLocked -> t.trialOverUpsell
                            else -> null
                        },
                        onPickServer = { screen = Screen.SERVERS },
                        onOpenSettings = { screen = Screen.SETTINGS },
                        onSupport = { openTelegram() },
                        unreadNotices = notices.count { !it.read },
                        onOpenInbox = { screen = Screen.INBOX },
                        downMbps = downMbps,
                        upMbps = upMbps,
                        originIp = originIp,
                        originCc = originCc,
                        showFlash = showFlash,
                        updateTag = updateTag,
                        onUpdateClick = { downloadAndInstallUpdate() },
                        onDismissUpdate = { updateTag = null },
                    )
                    Screen.INBOX -> InboxScreen(
                        lang = lang,
                        notices = notices,
                        onOpenNotice = { id ->
                            notices = notices.map { if (it.id == id) it.copy(read = true) else it }
                            AppPrefs.setNoticesCache(context, notices)
                            scope.launch(Dispatchers.IO) {
                                MianboorApi.markNoticeRead(AppPrefs.serverUrl(context), AppPrefs.clientToken(context), deviceId, id)
                            }
                        },
                        onMarkAll = {
                            val unreadIds = notices.filter { !it.read }.map { it.id }
                            notices = notices.map { it.copy(read = true) }
                            AppPrefs.setNoticesCache(context, notices)
                            scope.launch(Dispatchers.IO) {
                                unreadIds.forEach { id ->
                                    MianboorApi.markNoticeRead(AppPrefs.serverUrl(context), AppPrefs.clientToken(context), deviceId, id)
                                }
                            }
                        },
                        onBack = { screen = Screen.HOME },
                    )
                    Screen.SERVERS -> ServersScreen(
                        lang = lang,
                        configs = liveConfigs,
                        selectedKey = selectedKey,
                        premiumUser = premium,
                        syncing = syncing,
                        syncOk = syncOk,
                        lastSyncAt = lastSyncAt,
                        onRefresh = { refreshRemote { ok -> if (!ok && syncOk != false) toast(t.errNetwork) } },
                        onSelect = { key ->
                            selectedKey = key
                            AppPrefs.setSelectedKey(context, key)
                            screen = Screen.HOME
                        },
                        onPremiumTap = { plansReason = "premium-lock" },
                        onBack = { screen = Screen.HOME },
                        serverHost = runCatching {
                            android.net.Uri.parse(AppPrefs.serverUrl(context)).host ?: ""
                        }.getOrDefault(""),
                        syncError = AppPrefs.lastSyncError(context),
                    )
                    Screen.ACCOUNT -> AccountScreen(
                        lang = lang,
                        premium = premium,
                        planId = entitlement.plan,
                        expiresAt = entitlement.expiresAt,
                        trialLocked = trialLocked,
                        usedGb = usedGb,
                        splitCount = splitApps.size,
                        splitMode = splitMode,
                        deviceId = deviceId,
                        killSwitch = killSwitch,
                        autoConnect = autoConnect,
                        onKillSwitch = { v -> killSwitch = v; AppPrefs.setKillSwitch(context, v) },
                        onAutoConnect = { v -> autoConnect = v; AppPrefs.setAutoConnect(context, v) },
                        onOpenSplit = { screen = Screen.SPLIT },
                        onUpgrade = { plansReason = "renew" },
                        onSupport = { openTelegram() },
                        toast = { toast(it) },
                    )
                    Screen.SETTINGS -> SettingsScreen(
                        lang = lang,
                        setLang = onLang,
                        theme = themeName,
                        setTheme = onTheme,
                        pingLive = pingLive,
                        setPingLive = { v -> pingLive = v; AppPrefs.setPingLive(context, v) },
                        onReinstall = { reinstallSim() },
                        onSupport = { openTelegram() },
                        onBack = { screen = Screen.HOME },
                    )
                    Screen.SPLIT -> SplitScreen(
                        lang = lang,
                        mode = splitMode,
                        apps = splitApps,
                        installed = installedApps,
                        onSetMode = { setSplitMode(it) },
                        onToggleApp = { toggleSplitApp(it) },
                        onClear = { clearSplit() },
                        onBack = { screen = Screen.ACCOUNT },
                    )
                    Screen.LOGIN -> AdminLogin(
                        check = { u, p -> AppPrefs.checkAdminLogin(context, u, p) },
                        onSuccess = {
                            adminUnlocked = true
                            screen = Screen.ADMIN
                        },
                        onCancel = { screen = Screen.ACCOUNT },
                    )
                    Screen.ADMIN -> AdminPanel(
                        configs = configs,
                        orders = serverOrders,
                        devices = serverDevices,
                        ownDeviceId = deviceId,
                        blockRoot = blockRoot,
                        serverKey = AppPrefs.adminServerKey(context),
                        payInfo = payInfo,
                        adminBusy = adminBusy,
                        onServerKey = { k ->
                            AppPrefs.setAdminServerKey(context, k)
                            if (k.isNotBlank()) { refreshRemote(); loadAdminData() }
                            rebuildConfigs()
                        },
                        onTestKey = { k, cb -> testServerKey(k, cb) },
                        onSavePayInfo = { savePayInfo(it) },
                        notices = adminNotices,
                        onAddNotice = { title, body, kind ->
                            scope.launch(Dispatchers.IO) {
                                val ok = MianboorApi.adminAddNotice(AppPrefs.serverUrl(context), AppPrefs.adminServerKey(context), title, body, kind)
                                withContext(Dispatchers.Main) {
                                    val fa = AppPrefs.lang(context) == "fa"
                                    toast(if (ok) (if (fa) "اعلان ارسال شد" else "Notice sent") else (if (fa) "ارسال ناموفق بود" else "Send failed"))
                                    if (ok) loadAdminData()
                                }
                            }
                        },
                        onDeleteNotice = { id ->
                            scope.launch(Dispatchers.IO) {
                                MianboorApi.adminDeleteNotice(AppPrefs.serverUrl(context), AppPrefs.adminServerKey(context), id)
                                withContext(Dispatchers.Main) { loadAdminData() }
                            }
                        },
                        onRefreshAdmin = { loadAdminData(); refreshRemote() },
                        onDevicePremium = { dev, days -> serverDevicePremium(dev, days) },
                        onToggleConfig = { k, v -> toggleConfig(k, v) },
                        onDeleteConfig = { k -> deleteConfig(k) },
                        onTogglePremium = { k -> togglePremium(k) },
                        onAddConfig = { n, c, l, p -> addConfig(n, c, l, p) },
                        onOrderAction = { id, action -> serverOrderAction(id, action) },
                        onBlockRoot = { blockRoot = it },
                        onChangePass = { p ->
                            adminPass = p
                            AppPrefs.setAdminPass(context, p)
                        },
                        onExit = {
                            adminUnlocked = false
                            screen = Screen.ACCOUNT
                        },
                        serverOld = serverOld,
                        toast = { toast(it) },
                    )
                }
            }

            // ── bottom navigation (always LTR, like the demo) ──
            if (!isAdmin) {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                    BottomNav(
                        lang = lang,
                        screen = screen,
                        onHome = { screen = Screen.HOME },
                        onServers = { screen = Screen.SERVERS },
                        onAccountTap = { screen = Screen.ACCOUNT },
                        onAdminHold = {
                            vibrateTick(context)
                            screen = if (adminUnlocked) Screen.ADMIN else Screen.LOGIN
                        },
                    )
                }
            }
        }

        // ── plans sheet ──
        PlansSheet(
            visible = plansReason != null,
            lang = lang,
            reason = plansReason ?: "renew",
            payInfo = payInfo,
            onClose = { plansReason = null },
            onCreateOrder = { plan, via, onResult -> createOrder(plan, via, onResult) },
        )

        // ── setup sheet (rare: when no token was injected at build time) ──
        if (showSetup) {
            SetupSheet(
                lang = lang,
                initialUrl = AppPrefs.serverUrl(context),
                initialToken = AppPrefs.clientToken(context),
                onClose = { showSetup = false },
                onSave = { url, token ->
                    AppPrefs.save(context, url, token)
                    showSetup = false
                    toast(t.savedToast)
                    scope.launch(Dispatchers.IO) {
                        runCatching {
                            val remote = MianboorApi.fetchConfigs(url, token)
                            AppPrefs.setServerCache(
                                context,
                                remote.map { AppPrefs.CachedConfig(it.id, it.name, it.country, it.link, it.premium) },
                            )
                            scope.launch { rebuildConfigs() }
                        }
                    }
                },
            )
        }

        // ── پاپ‌آپ اعلان مدیریت ──
        popupNotice?.let { pn ->
            AlertDialog(
                onDismissRequest = { popupNotice = null },
                containerColor = mb.panel,
                title = { Text(pn.title, color = mb.ink, fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                text = { Text(pn.body, color = mb.dim, fontSize = 14.sp) },
                confirmButton = {
                    Text(
                        t.popupOk,
                        color = mb.gold,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable {
                                popupNotice = null
                                notices = notices.map { if (it.id == pn.id) it.copy(read = true) else it }
                                AppPrefs.setNoticesCache(context, notices)
                                scope.launch(Dispatchers.IO) {
                                    MianboorApi.markNoticeRead(AppPrefs.serverUrl(context), AppPrefs.clientToken(context), deviceId, pn.id)
                                }
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                },
            )
        }

        // ── toast ──
        com.mianboor.vpn.ui.ToastHost(
            message = toastMsg,
            visible = toastMsg != null,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(top = 52.dp, start = 24.dp, end = 24.dp),
        )
    }
}

// ---------------------------------------------------------------------------
// Bottom navigation with the 5s hold trigger on the Account tab
// ---------------------------------------------------------------------------

@Composable
private fun BottomNav(
    lang: Lang,
    screen: Screen,
    onHome: () -> Unit,
    onServers: () -> Unit,
    onAccountTap: () -> Unit,
    onAdminHold: () -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current

    var holding by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf(0f) }
    var fired by remember { mutableStateOf(false) }

    LaunchedEffect(holding) {
        if (holding) {
            val start = System.currentTimeMillis()
            while (holding && progress < 1f) {
                androidx.compose.runtime.withFrameNanos { }
                progress = ((System.currentTimeMillis() - start).toFloat() / HOLD_MS).coerceIn(0f, 1f)
            }
            if (progress >= 1f && !fired) {
                fired = true
                onAdminHold()
            }
        } else {
            progress = 0f
            fired = false
        }
    }

    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 12.dp, end = 12.dp, bottom = 8.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(mb.panel.copy(alpha = 0.8f))
            .border(1.dp, mb.panelEdge, RoundedCornerShape(24.dp))
            .padding(horizontal = 8.dp),
    ) {
        NavBtn(
            iconRes = com.mianboor.vpn.R.drawable.ic_home,
            label = t.home,
            active = screen == Screen.HOME,
            modifier = Modifier.weight(1f),
            onClick = onHome,
        )
        NavBtn(
            iconRes = com.mianboor.vpn.R.drawable.ic_globe,
            label = t.servers,
            active = screen == Screen.SERVERS,
            modifier = Modifier.weight(1f),
            onClick = onServers,
        )
        Box(Modifier.weight(1f)) {
            NavBtn(
                iconRes = com.mianboor.vpn.R.drawable.ic_user,
                label = t.account,
                active = screen == Screen.ACCOUNT,
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    // swallow the tap that follows a fired 5s hold
                    if (fired) fired = false else onAccountTap()
                },
                onPress = { holding = it },
            )
            if (holding && progress > 0.02f) {
                Canvas(
                    Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 2.dp)
                        .size(22.dp),
                ) {
                    drawArc(
                        color = mb.gold,
                        startAngle = -90f,
                        sweepAngle = 360f * progress,
                        useCenter = false,
                        style = Stroke(2.5f, cap = StrokeCap.Round),
                    )
                }
            }
        }
    }
}

@Composable
private fun NavBtn(
    iconRes: Int,
    label: String,
    active: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    onPress: ((Boolean) -> Unit)? = null,
) {
    val mb = LocalMb.current
    val tint = if (active) mb.glow else mb.dim
    val gesture = if (onPress != null) {
        Modifier.pointerInput(Unit) {
            detectTapGestures(
                onTap = { onClick() },
                onPress = {
                    onPress(true)
                    try {
                        awaitRelease()
                    } finally {
                        onPress(false)
                    }
                },
            )
        }
    } else {
        Modifier.clickable { onClick() }
    }
    Column(
        modifier
            .then(gesture)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            com.mianboor.vpn.ui.ic(iconRes), null,
            tint = tint, modifier = Modifier.size(24.dp),
        )
        Spacer(Modifier.height(4.dp))
        Text(label, color = tint, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

// ---------------------------------------------------------------------------
// First-time setup sheet (only shown when no token was injected into the APK)
// ---------------------------------------------------------------------------

@Composable
private fun SetupSheet(
    lang: Lang,
    initialUrl: String,
    initialToken: String,
    onClose: () -> Unit,
    onSave: (String, String) -> Unit,
) {
    val t = stringsOf(lang)
    val mb = LocalMb.current
    var url by remember { mutableStateOf(initialUrl) }
    var token by remember { mutableStateOf(initialToken) }

    Box(
        Modifier
            .fillMaxSize()
            .background(mb.night.copy(alpha = 0.7f))
            .clickable { onClose() },
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier
                .padding(24.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(mb.panel)
                .border(1.dp, mb.panelEdge, RoundedCornerShape(18.dp))
                .padding(20.dp)
                .consumeClicks(),
        ) {
            Text(t.setupTitle, color = mb.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(t.setupDesc, color = mb.dim, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            SetupField(url, { url = it }, "https://mianboor.example.com", Modifier.padding(top = 14.dp))
            SetupField(token, { token = it }, "client token", Modifier.padding(top = 8.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.glow)
                    .clickable { onSave(url.trim(), token.trim()) }
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                Text(t.saveBtn, color = mb.onGlow, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun SetupField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    val mb = LocalMb.current
    BasicTextField(
        value = value,
        onValueChange = onChange,
        singleLine = true,
        textStyle = TextStyle(color = mb.ink, fontSize = 14.sp),
        cursorBrush = SolidColor(mb.glow),
        decorationBox = { inner ->
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(mb.night)
                    .border(1.dp, mb.panelEdge, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 12.dp),
            ) {
                if (value.isEmpty()) Text(placeholder, color = mb.dim, fontSize = 14.sp)
                inner()
            }
        },
        modifier = modifier.fillMaxWidth(),
    )
}

/** https://ipwho.is/ → (ip, country_code) */
private fun fetchIpWhoIs(): Pair<String, String>? = runCatching {
    val conn = java.net.URL("https://ipwho.is/").openConnection() as java.net.HttpURLConnection
    conn.connectTimeout = 8000; conn.readTimeout = 10_000
    conn.setRequestProperty("Accept", "application/json")
    try {
        if (conn.responseCode !in 200..299) return@runCatching null
        val o = org.json.JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
        val ip = o.optString("ip"); val cc = o.optString("country_code")
        if (ip.isBlank() || cc.isBlank()) null else ip to cc
    } finally { conn.disconnect() }
}.getOrNull()

/** آخرین ریلیز گیت‌هاب → tag مثل "v1.6.0" */
private fun fetchLatestReleaseTag(): String? = runCatching {
    val conn = java.net.URL("https://api.github.com/repos/mostafaiekii/mianboor/releases/latest").openConnection() as java.net.HttpURLConnection
    conn.connectTimeout = 8000; conn.readTimeout = 10_000
    conn.setRequestProperty("Accept", "application/vnd.github+json")
    conn.setRequestProperty("User-Agent", "Mianboor-Vpn") // گیت‌هاب بدون User-Agent 403 می‌دهد
    try {
        if (conn.responseCode !in 200..299) return@runCatching null
        org.json.JSONObject(conn.inputStream.bufferedReader().use { it.readText() }).optString("tag_name").takeIf { it.isNotBlank() }
    } finally { conn.disconnect() }
}.getOrNull()

/** مقایسهٔ عددی نسخه: "v1.6.0" > "1.5.0" */
private fun isNewerVersion(remote: String, current: String): Boolean {
    fun parts(s: String) = s.trim().removePrefix("v").split(".").map { it.filter { c -> c.isDigit() }.ifEmpty { "0" }.toInt() }
    val a = parts(remote); val b = parts(current)
    for (i in 0 until maxOf(a.size, b.size)) {
        val x = a.getOrElse(i) { 0 }; val y = b.getOrElse(i) { 0 }
        if (x != y) return x > y
    }
    return false
}
