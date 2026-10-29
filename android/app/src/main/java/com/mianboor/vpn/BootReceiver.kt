package com.mianboor.vpn

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.VpnService
import androidx.core.content.ContextCompat

/**
 * Auto-connect on boot: when the user enables «Auto Connect» in the Account
 * screen, the last used server is re-established after the phone restarts.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!AppPrefs.autoConnect(context)) return
        if (!AppPrefs.isConfigured(context)) return
        val link = AppPrefs.lastLink(context)
        if (link.isBlank()) return
        // can't show the consent dialog from here — only proceed when already granted
        if (VpnService.prepare(context) != null) return

        runCatching {
            ContextCompat.startForegroundService(
                context,
                Intent(context, MianboorVpnService::class.java)
                    .setAction(MianboorVpnService.ACTION_CONNECT)
                    .putExtra(MianboorVpnService.EXTRA_LINK, link)
                    .putExtra(MianboorVpnService.EXTRA_NAME, AppPrefs.lastName(context))
                    .putExtra(MianboorVpnService.EXTRA_COUNTRY, AppPrefs.lastCountry(context)),
            )
        }
    }
}
