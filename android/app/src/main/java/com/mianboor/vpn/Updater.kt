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
 * به‌روزرسانی کامل داخل اپ (v2.7) — «کاربر فقط یک بار اپ را نصب می‌کند»:
 *
 *   1. check():  GitHub Releases API → نسخه/لینک APK
 *   2. download(): دانلود با نوار پیشرفت به files/ota/update.apk
 *   3. install(): PackageInstaller session → نصب بی‌صدا با تأیید سیستم؛
 *                 اگر «منابع ناشناس» روشن نباشد، یک‌بار همان صفحهٔ سیستم باز می‌شود.
 *
 * هیچ لینک بیرونی (مرورگر/گیت‌هاب) در مسیر به‌روزرسانی باز نمی‌شود.
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

    /** آخرین ریلیز از GitHub — با فال‌بک به لینک اعلامی سرور. */
    fun checkLatest(serverFallbackUrl: String = ""): Release? {
        // اول fallback اعلامی از پنل (اگر APK مستقیم داد)
        runCatching {
            if (serverFallbackUrl.endsWith(".apk")) {
                val v = Regex("""Mianboor-v([\d.]+)\.apk""").find(serverFallbackUrl)?.groupValues?.get(1)
                if (v != null) return Release(v, serverFallbackUrl, -1L, "")
            }
        }
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
                else Release(tag, url, size, j.optString("body", "").take(400))
            } finally {
                conn.disconnect()
            }
        }.getOrNull()
    }

    // ── دانلود با پیشرفت ─────────────────────────────────────────────

    fun apkFile(c: Context): File = File(File(c.filesDir, "ota").apply { mkdirs() }, "update.apk")

    /** دانلود مستقیم APK — onProgress(pct, downloadedBytes, totalBytes). */
    fun download(c: Context, url: String, onProgress: (Int, Long, Long) -> Unit): File {
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
     * نصب APK دانلودشده — PackageInstaller session (اندروید ۸+، بدون خروج از اپ).
     * بعد از فراخوانی، دیالوگ تأیید سیستم نمایش داده می‌شود و اپ ری‌استارت می‌شود.
     */
    fun installDownloaded(c: Context): Boolean = runCatching {
        val apk = apkFile(c)
        if (!apk.exists() || apk.length() < 1024) return@runCatching false
        if (Build.VERSION.SDK_INT >= 24) {
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
        } else {
            // مسیر قدیمی — FileProvider + ACTION_VIEW (اندروید <۷ — عملاً دست‌نیافتنی چون minSdk=26)
            val uri = androidx.core.content.FileProvider.getUriForFile(
                c, c.packageName + ".fileprovider", apk,
            )
            c.startActivity(
                Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            true
        }
    }.getOrDefault(false)
}
