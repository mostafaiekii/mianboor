package com.mianboor.vpn

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import androidx.core.content.FileProvider

/**
 * به‌روزرسانی کامل داخل اپ (v2.8) — «کاربر فقط یک بار اپ را نصب می‌کند»:
 *
 *   1. check():    اول سرور خودمان (mianboor.vercel.app — همیشه در دسترس، بدون فیلتر)؛
 *                  فال‌بک: GitHub API. هیچ‌جا مرورگر یا صفحهٔ گیت‌هاب باز نمی‌شود.
 *   2. download(): دانلود با نوار پیشرفت (درصد) به files/ota/update.apk —
 *                  اول از سرور خودمان (پروکسی استریم؛ گیت‌هاب در ایران فیلتر است)،
 *                  فال‌بک: لینک مستقیم GitHub (وقتی VPN روشن است کار می‌کند).
 *   3. install():  PackageInstaller session → نصب با تأیید سیستم؛
 *                  اگر «منابع ناشناس» روشن نباشد، یک‌بار همان صفحهٔ سیستم باز می‌شود.
 *
 * هیچ لینک بیرونی (مرورگر/گیت‌هاب) در مسیر به‌روزرسانی به کاربر نشان داده نمی‌شود —
 * گیت‌هاب فقط پشت‌صحنهٔ سرور خودمان است.
 */
object Updater {

    const val REPO = "mostafaiekii/mianboor"
    private const val API = "https://api.github.com/repos/$REPO/releases/latest"

    data class Release(val version: String, val apkUrl: String, val sizeBytes: Long, val notes: String)

    // ── نسخه ─────────────────────────────────────────────────────────

    /** "v2.7.0" / "2.7.0" → [2,7,0] */
    fun parseVersion(v: String): List<Int> =
        v.trim().removePrefix("v").removePrefix("V")
            .split('.').map { it.takeWhile { ch -> ch.isDigit() }.toIntOrNull() ?: 0 }

    fun isNewer(remote: String, current: String): Boolean {
        val r = parseVersion(remote)
        val c = parseVersion(current)
        for (i in 0 until maxOf(r.size, c.size)) {
            val a = r.getOrElse(i) { 0 }
            val b = c.getOrElse(i) { 0 }
            if (a != b) return a > b
        }
        return false
    }

    private fun cleanVer(v: String): String = v.trim().removePrefix("v").removePrefix("V")

    // ── بررسی نسخهٔ جدید ─────────────────────────────────────────────

    /**
     * آخرین نسخه — اولویت:
     *   1. سرور خودمان  /api/client/update/check  (در ایران هم بدون VPN کار می‌کند)
     *   2. GitHub API مستقیم (وقتی VPN روشن است / سرور جواب نداد)
     *   3. لینک اعلامی سرور (فیلد latest_url پنل) اگر APK مستقیم داد
     */
    fun checkLatest(serverUrl: String = "", fallbackUrl: String = ""): Release? {
        // ۱) سرور خودمان — نقطهٔ اصلی برای کاربر ایرانی
        val base = serverUrl.trim().trimEnd('/')
        if (base.startsWith("http")) {
            checkViaServer(base)?.let { return it }
        }

        // ۲) فال‌بک اعلامی از پنل (اگر APK مستقیم داد)
        runCatching {
            if (fallbackUrl.endsWith(".apk")) {
                val v = Regex("""Mianboor-v([\d.]+)\.apk""").find(fallbackUrl)?.groupValues?.get(1)
                if (v != null) return Release(v, fallbackUrl, -1L, "")
            }
        }

        // ۳) GitHub API مستقیم — وقتی شبکه اجازه می‌دهد
        return runCatching {
            val conn = URL(API).openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 12000
            conn.setRequestProperty("Accept", "application/vnd.github+json")
            try {
                if (conn.responseCode != 200) return@runCatching null
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val j = JSONObject(body)
                val tag = j.optString("tag_name", "")
                val assets = j.optJSONArray("assets")
                var url = ""
                var size = -1L
                if (assets != null) {
                    for (i in 0 until assets.length()) {
                        val a = assets.optJSONObject(i) ?: continue
                        val n = a.optString("name", "")
                        if (n.endsWith(".apk")) {
                            url = a.optString("browser_download_url", "")
                            size = a.optLong("size", -1L)
                            break
                        }
                    }
                }
                if (tag.isBlank() || url.isBlank()) null
                else Release(cleanVer(tag), url, size, j.optString("body", "").take(400))
            } finally {
                conn.disconnect()
            }
        }.getOrNull()
    }

    /** GET /api/client/update/check روی سرور خودمان. */
    private fun checkViaServer(base: String): Release? = runCatching {
        val conn = URL("$base/api/client/update/check").openConnection() as HttpURLConnection
        conn.connectTimeout = 7000
        conn.readTimeout = 12000
        try {
            if (conn.responseCode != 200) return@runCatching null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val j = JSONObject(body)
            if (!j.optBoolean("ok", false)) return@runCatching null
            val ver = j.optString("latestVersion", "").trim()
            if (ver.isBlank()) return@runCatching null
            var url = j.optString("apkUrl", "").trim()
            // مسیر نسبی سرور → مطلق
            if (url.startsWith("/")) url = base + url
            Release(
                cleanVer(ver), url,
                j.optLong("sizeBytes", -1L),
                j.optString("notes", "").take(400),
            )
        } finally {
            conn.disconnect()
        }
    }.getOrNull()

    // ── دانلود با پیشرفت ─────────────────────────────────────────────

    fun apkFile(c: Context): File = File(File(c.filesDir, "ota").apply { mkdirs() }, "update.apk")

    /**
     * دانلود مستقیم APK — onProgress(pct, downloadedBytes, totalBytes).
     * v2.8: اول از سرور خودمان (پروکسی استریم — در ایران هم کار می‌کند)،
     * فال‌بک خودکار به لینک مستقیم GitHub.
     */
    fun download(
        c: Context,
        url: String,
        serverUrl: String = "",
        onProgress: (Int, Long, Long) -> Unit,
    ): File {
        val base = serverUrl.trim().trimEnd('/')
        val proxyUrl = buildProxyUrl(base, url)
        // ۱) سرور خودمان
        if (proxyUrl != null) {
            try {
                return downloadTo(c, proxyUrl, onProgress)
            } catch (t: Throwable) {
                // مسیر بعدی: مستقیم
            }
        }
        // ۲) لینک مستقیم (گیت‌هاب — فقط وقتی شبکه اجازه دهد)
        return downloadTo(c, url, onProgress)
    }

    /** نسخهٔ پروکسی سرور خودمان برای این فایل APK — از روی نام/نسخه استخراج می‌شود. */
    private fun buildProxyUrl(base: String, url: String): String? {
        if (!base.startsWith("http")) return null
        // از لینک گیت‌هاب: …/releases/download/v2.8.0/Mianboor-v2.8.0.apk
        val m = Regex("""Mianboor-v?([\d.]+)\.apk""").find(url)
        val ver = m?.groupValues?.get(1)?.let { cleanVer(it) }
            ?: latestVersionHint?.let { cleanVer(it) }
            ?: return null
        if (!Regex("""^\d{1,3}(\.\d{1,3}){1,2}$""").matches(ver)) return null
        return "$base/api/client/update/download?v=$ver"
    }

    /** آخرین نسخه‌ای که checkLatest دید — برای ساخت مسیر پروکسی اگر لینک گیت‌هاب نسخه را ندهد. */
    var latestVersionHint: String? = null

    /** دانلود به فایل — هر خطایی بالا می‌آید تا caller فال‌بک را انجام دهد. */
    private fun downloadTo(c: Context, url: String, onProgress: (Int, Long, Long) -> Unit): File {
        val out = apkFile(c)
        val tmp = File(out.absolutePath + ".part")
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 20000
        conn.instanceFollowRedirects = true
        try {
            val total = conn.contentLengthLong
            conn.inputStream.use { ins ->
                java.io.FileOutputStream(tmp).use { fos ->
                    val buf = ByteArray(64 * 1024)
                    var done = 0L
                    var lastPct = -1
                    while (true) {
                        val n = ins.read(buf)
                        if (n < 0) break
                        fos.write(buf, 0, n)
                        done += n
                        if (total > 0) {
                            val pct = ((done * 100) / total).toInt()
                            if (pct != lastPct) {
                                lastPct = pct
                                onProgress(pct, done, total)
                            }
                        } else {
                            onProgress(-1, done, -1L)
                        }
                    }
                }
            }
        } finally {
            conn.disconnect()
        }
        if (out.exists()) out.delete()
        if (!tmp.renameTo(out)) {
            tmp.copyTo(out, overwrite = true)
            tmp.delete()
        }
        return out
    }

    // ── نصب داخل اپ ─────────────────────────────────────────────────

    /** «نصب اپ‌های ناشناس» برای این اپ روشن است؟ (اندروید ۸+) */
    fun canInstall(c: Context): Boolean =
        if (Build.VERSION.SDK_INT >= 26) c.packageManager.canRequestPackageInstalls() else true

    /** درخواست یک‌بارهٔ «اجازه نصب» — فقط بار اول دیده می‌شود. */
    fun requestInstallPermission(c: Context): Boolean =
        runCatching {
            c.startActivity(
                Intent(
                    android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${c.packageName}"),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            true
        }.getOrDefault(false)

    /**
     * نصب APK دانلودشده — دو مسیر پشت سر هم:
     *
     *   ۱) PackageInstaller session — از اندروید ۱۲ به بعد دیالوگ تأیید را خودِ اپِ
     *      نصب‌کننده باید باز کند: نتیجهٔ commit با STATUS_PENDING_USER_ACTION به
     *      MainActivity برمی‌گردد و MainActivity باید startActivity بزند (v2.8.1).
     *   ۲) اگر مسیر ۱ به هر دلیل (ROM خاص، SecurityException، …) شروع نشد —
     *      فال‌بک: نصب‌کنندهٔ سیستم با FileProvider. همان دیالوگ تأیید، بدون مرورگر.
     *
     * خروجی true فقط یعنی «فرایند نصب شروع شد» — نتیجهٔ نهایی از INSTALL_RESULT می‌آید.
     */
    fun installDownloaded(c: Context): Boolean = installViaSession(c) || installViaIntent(c)

    /** APK سالم؟ — وجود + حجم واقعی + امضای ZIP («PK») تا فایل خراب هرگز به نصب نرسد. */
    private fun validApk(f: File): Boolean =
        f.exists() && f.length() > 1_000_000L && runCatching {
            f.inputStream().use { ins ->
                val h = ByteArray(2)
                if (ins.read(h) < 2) false
                else h[0] == 'P'.code.toByte() && h[1] == 'K'.code.toByte()
            }
        }.getOrDefault(false)

    /** مسیر ۱ — PackageInstaller session (نتیجه به MainActivity/INSTALL_RESULT). */
    private fun installViaSession(c: Context): Boolean = runCatching {
        val apk = apkFile(c)
        if (!validApk(apk)) return@runCatching false
        val pi = c.packageManager.packageInstaller
        val sid = pi.createSession(
            PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        )
        val session = pi.openSession(sid)
        session.use { s ->
            apk.inputStream().use { ins ->
                s.openWrite("mianboor_apk", 0, apk.length()).use { out ->
                    ins.copyTo(out, 64 * 1024)
                    out.flush()
                    s.fsync(out)
                }
            }
            val intent = Intent(c, MainActivity::class.java)
                .setAction("com.mianboor.vpn.INSTALL_RESULT")
            val piFlags = if (Build.VERSION.SDK_INT >= 31)
                android.app.PendingIntent.FLAG_MUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            else
                android.app.PendingIntent.FLAG_UPDATE_CURRENT
            val status = android.app.PendingIntent.getActivity(c, sid, intent, piFlags)
            s.commit(status.intentSender)
        }
        true
    }.getOrElse { false }

    /** مسیر ۲ — نصب‌کنندهٔ سیستم با FileProvider (فال‌بک امن؛ بدون مرورگر، بدون گیت‌هاب). */
    private fun installViaIntent(c: Context): Boolean = runCatching {
        val apk = apkFile(c)
        if (!validApk(apk)) return@runCatching false
        val uri = androidx.core.content.FileProvider.getUriForFile(
            c, c.packageName + ".fileprovider", apk,
        )
        c.startActivity(
            Intent(Intent.ACTION_INSTALL_PACKAGE)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_ACTIVITY_NEW_TASK
                )
        )
        true
    }.getOrElse { false }
}
