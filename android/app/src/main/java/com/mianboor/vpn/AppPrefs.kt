package com.mianboor.vpn

import android.content.Context

/**
 * App-wide settings. Defaults come from BuildConfig (injected by CI),
 * the hidden admin screen can override them at runtime.
 */
object AppPrefs {

    private const val FILE = "mianboor_prefs"
    private const val KEY_URL = "server_url"
    private const val KEY_TOKEN = "client_token"

    private fun p(c: Context) = c.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun serverUrl(c: Context): String =
        p(c).getString(KEY_URL, BuildConfig.SERVER_URL)?.trim() ?: ""

    fun clientToken(c: Context): String =
        p(c).getString(KEY_TOKEN, BuildConfig.CLIENT_TOKEN)?.trim() ?: ""

    fun isConfigured(c: Context): Boolean =
        serverUrl(c).startsWith("http") && clientToken(c).isNotBlank()

    fun save(c: Context, url: String, token: String) {
        p(c).edit()
            .putString(KEY_URL, url.trim())
            .putString(KEY_TOKEN, token.trim())
            .apply()
    }
}
