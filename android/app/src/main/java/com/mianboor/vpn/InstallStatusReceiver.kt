package com.mianboor.vpn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.widget.Toast

/**
 * v2.9 — گیرندهٔ نتیجهٔ نصب PackageInstaller (به‌جای Activity).
 *
 * چرا؟ نسخه‌های قبلی PendingIntent را به MainActivity می‌زدند و روی خیلی از
 * رام‌ها onNewIntent با extraهای سیستم fire نمی‌شد → «هیچ اتفاقی نمی‌افتد».
 * BroadcastReceiver ثبت‌شده در مانیفست همیشه و بدون قید و بند وضعیت را می‌گیرد؛
 * وقتی وضعیت STATUS_PENDING_USER_ACTION بود، همان‌جا دیالوگ تأیید سیستم باز می‌شود.
 */
class InstallStatusReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.mianboor.vpn.INSTALL_RESULT") return
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, Int.MIN_VALUE)
        val fa = AppPrefs.lang(context) == "fa"
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_INTENT)
                if (confirm != null) runCatching {
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(confirm)
                }
            }
            PackageInstaller.STATUS_SUCCESS ->
                toast(context, if (fa) "نسخهٔ جدید نصب شد ✓" else "New version installed ✓")
            Int.MIN_VALUE -> Unit // بدون وضعیت — بی‌خیال
            else -> {
                val detail = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                    ?: status.toString()
                toast(
                    context,
                    if (fa) "نصب انجام نشد — دوباره تلاش کن ($detail)"
                    else "Install failed — try again ($detail)"
                )
            }
        }
    }

    private fun toast(c: Context, msg: String) {
        runCatching { Toast.makeText(c, msg, Toast.LENGTH_LONG).show() }
    }
}
