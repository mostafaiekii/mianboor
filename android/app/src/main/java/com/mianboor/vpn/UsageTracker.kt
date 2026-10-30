package com.mianboor.vpn

import android.content.Context
import android.net.TrafficStats
import android.content.pm.PackageManager
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * آمار مصرف به تفکیک اپ و سرور.
 *  - per-app: نمونه‌گیری دوره‌ای TrafficStats به تفکیک UID (تقریبی، شامل کل ترافیک هر اپ)
 *  - per-server: بایت‌های سشن VPN که به سرورِ انتخاب‌شده نسبت داده می‌شود
 * همه‌چیز ماهانه در SharedPreferences ذخیره می‌شود و اول هر ماه صفر می‌شود.
 */
object UsageTracker {

    private fun monthKey(): String = SimpleDateFormat("yyyy-MM", Locale.US).format(Date())

    /** یک نمونه‌گیری: دلتای ترافیک هر اپ از نمونهٔ قبلی را به جمع ماه اضافه می‌کند. */
    fun samplePerApp(context: Context) {
        try {
            val pm = context.packageManager
            val packages = pm.getInstalledPackages(0)
            val snap = JSONObject(AppPrefs.appSnap(context))
            val month = monthKey()
            val acc = JSONObject(if (AppPrefs.appMonthKey(context) == month) AppPrefs.appAcc(context) else "{}")
            val next = JSONObject()
            for (pi in packages) {
                val appInfo = pi.applicationInfo ?: continue
                val uid = appInfo.uid
                val total = TrafficStats.getUidRxBytes(uid) + TrafficStats.getUidTxBytes(uid)
                if (total <= 0L) continue
                next.put(uid.toString(), total)
                // اولین نمونه: دلتا صفر (پایه می‌سازیم)
                val prev = if (snap.has(uid.toString())) snap.optLong(uid.toString(), total) else total
                val delta = (total - prev).coerceAtLeast(0L)
                if (delta > 512_000L) { // فقط دلتاهای معنی‌دار (>512KB)
                    val label = runCatching { pm.getApplicationLabel(appInfo).toString() }.getOrDefault("App")
                    acc.put(label, acc.optLong(label, 0L) + delta)
                }
            }
            AppPrefs.setAppSnap(context, next.toString())
            AppPrefs.setAppMonth(context, month, acc.toString())
        } catch (_: Throwable) { }
    }

    /** بایت‌های سشن را به سرور فعلی اضافه می‌کند (cc برای پرچم). */
    fun addServerBytes(context: Context, name: String, cc: String, bytes: Long) {
        if (bytes <= 0L || name.isBlank()) return
        try {
            val month = monthKey()
            val acc = JSONObject(if (AppPrefs.srvMonthKey(context) == month) AppPrefs.srvAcc(context) else "{}")
            val entry = acc.optJSONObject(name) ?: JSONObject().put("cc", cc).put("b", 0L)
            entry.put("b", entry.optLong("b", 0L) + bytes)
            if (cc.isNotBlank()) entry.put("cc", cc)
            acc.put(name, entry)
            AppPrefs.setSrvAcc(context, month, acc.toString())
        } catch (_: Throwable) { }
    }

    fun topApps(context: Context, n: Int = 6): List<Pair<String, Long>> {
        return try {
            val acc = JSONObject(if (AppPrefs.appMonthKey(context) == monthKey()) AppPrefs.appAcc(context) else "{}")
            acc.keys().asSequence().mapNotNull { k ->
                val v = acc.optLong(k, 0L)
                if (v > 0L) k to v else null
            }.sortedByDescending { it.second }.take(n)
        } catch (_: Throwable) { emptyList() }
    }

    /** سه‌تایی: نام سرور، کد کشور، بایت */
    fun topServers(context: Context, n: Int = 5): List<Triple<String, String, Long>> {
        return try {
            val acc = JSONObject(if (AppPrefs.srvMonthKey(context) == monthKey()) AppPrefs.srvAcc(context) else "{}")
            acc.keys().asSequence().mapNotNull { k ->
                val o = acc.optJSONObject(k) ?: return@mapNotNull null
                val b = o.optLong("b", 0L)
                if (b > 0L) Triple(k, o.optString("cc", ""), b) else null
            }.sortedByDescending { it.third }.take(n)
        } catch (_: Throwable) { emptyList() }
    }
}
