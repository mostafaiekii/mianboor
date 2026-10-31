package com.mianboor.vpn

import kotlinx.coroutines.flow.MutableStateFlow

enum class Phase { IDLE, SCANNING, CONNECTING, CONNECTED, BLOCKED, DISCONNECTING }

/**
 * Shared state between the VPN service and the UI (same process).
 */
object VpnState {
    val phase = MutableStateFlow(Phase.IDLE)
    /** Friendly cover message shown while technical work happens behind the scenes. */
    val coverMsg = MutableStateFlow("")
    val serverName = MutableStateFlow("")
    val serverCountry = MutableStateFlow("")
    val errorMessage = MutableStateFlow<String?>(null)
    /** Cumulative bytes reported by the tunnel. */
    val txBytes = MutableStateFlow(0L)
    val rxBytes = MutableStateFlow(0L)

    /** کد دعوت دریافتی از دیپ‌لینک mianboor://ref/CODE (نسخهٔ ۲). */
    val pendingRefCode = MutableStateFlow<String?>(null)

    fun reset() {
        coverMsg.value = ""
        serverName.value = ""
        serverCountry.value = ""
        errorMessage.value = null
        txBytes.value = 0L
        rxBytes.value = 0L
    }
}

/** Cover messages while scanning for the fastest server. */
val SCAN_MSGS = listOf(
    "در حال بررسی مسیرهای امن…",
    "داریم بهترین میان‌برها رو پیدا می‌کنیم…",
    "چند مسیر جایگزین آماده می‌شه…",
    "داریم شبکه رو بهینه می‌کنیم…"
)

/** Cover messages while the tunnel is being established. */
val CONNECT_MSGS = listOf(
    "در حال برقراری تونل امن…",
    "کلیدهای رمزنگاری رد و بدل می‌شن…",
    "اتصالت داره ایمن می‌شه…",
    "تقریباً آماده‌ای…"
)
