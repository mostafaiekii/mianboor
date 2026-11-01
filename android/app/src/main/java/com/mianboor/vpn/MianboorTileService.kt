package com.mianboor.vpn

import android.content.Intent
import android.net.VpnService
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * کاشی Quick Settings (نسخهٔ ۲) — یک لمس از نوار بالای گوشی، وصل/قطع بدون باز کردن اپ.
 * اگر اجازهٔ VPN از قبل داده شده باشد مستقیم وصل می‌کند؛ وگرنه اپ را باز می‌کند
 * تا دیالوگ سیستم نمایش داده شود.
 */
class MianboorTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        updateTile()
    }

    override fun onClick() {
        super.onClick()
        val phase = VpnState.phase.value
        if (phase == Phase.CONNECTED || phase == Phase.CONNECTING || phase == Phase.BLOCKED) {
            // قطع
            startService(
                Intent(this, MianboorVpnService::class.java).setAction(MianboorVpnService.ACTION_DISCONNECT)
            )
        } else {
            val prepared = VpnService.prepare(this) == null
            if (prepared && AppPrefs.lastLink(this).isNotBlank()) {
                startService(
                    Intent(this, MianboorVpnService::class.java)
                        .setAction(MianboorVpnService.ACTION_CONNECT)
                        .putExtra(MianboorVpnService.EXTRA_LINK, AppPrefs.lastLink(this))
                        .putExtra(MianboorVpnService.EXTRA_NAME, AppPrefs.lastName(this))
                        .putExtra(MianboorVpnService.EXTRA_COUNTRY, AppPrefs.lastCountry(this)),
                )
            } else {
                // اولین بار — دیالوگ اجازهٔ سیستم لازم است؛ اپ باز می‌شود
                startActivityAndCollapse(
                    Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
        updateTile()
    }

    private fun updateTile() {
        val tile = qsTile ?: return
        val phase = VpnState.phase.value
        tile.state = when (phase) {
            Phase.CONNECTED -> Tile.STATE_ACTIVE
            Phase.CONNECTING, Phase.BLOCKED, Phase.DISCONNECTING -> Tile.STATE_UNAVAILABLE
            else -> Tile.STATE_INACTIVE
        }
        tile.updateTile()
    }
}
