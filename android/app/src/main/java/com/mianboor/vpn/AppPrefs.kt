package com.mianboor.vpn

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * App-wide settings & state. Defaults come from BuildConfig (injected by CI);
 * the hidden admin screen can override server settings at runtime.
 *
 * Everything the new demo-style UI needs is persisted here: language, theme,
 * split tunneling, entitlements, orders, usage quotas and the anti-fraud ledger.
 */
object AppPrefs {

    private const val FILE = "mianboor_prefs"

    private fun p(c: Context) = c.getSharedPreferences(FILE, Context.MODE_PRIVATE)
    private fun ed(c: Context) = p(c).edit()

    // ── server / token ────────────────────────────────────────────────

    fun serverUrl(c: Context): String =
        p(c).getString("server_url", BuildConfig.SERVER_URL)?.trim() ?: ""

    fun clientToken(c: Context): String =
        p(c).getString("client_token", BuildConfig.CLIENT_TOKEN)?.trim() ?: ""

    fun isConfigured(c: Context): Boolean =
        serverUrl(c).startsWith("http") && clientToken(c).isNotBlank()

    fun save(c: Context, url: String, token: String) {
        ed(c).putString("server_url", url.trim()).putString("client_token", token.trim()).apply()
    }

    // ── ui: language / theme / toggles ────────────────────────────────

    fun lang(c: Context): String = p(c).getString("lang", "en") ?: "en"
    fun setLang(c: Context, v: String) { ed(c).putString("lang", v).apply() }

    fun theme(c: Context): String = p(c).getString("theme", "MIDNIGHT") ?: "MIDNIGHT"
    fun setTheme(c: Context, v: String) { ed(c).putString("theme", v).apply() }

    fun pingLive(c: Context): Boolean = p(c).getBoolean("ping_live", true)
    fun setPingLive(c: Context, v: Boolean) { ed(c).putBoolean("ping_live", v).apply() }

    fun killSwitch(c: Context): Boolean = p(c).getBoolean("kill_switch", true)
    fun setKillSwitch(c: Context, v: Boolean) { ed(c).putBoolean("kill_switch", v).apply() }

    fun autoConnect(c: Context): Boolean = p(c).getBoolean("auto_connect", false)
    fun setAutoConnect(c: Context, v: Boolean) { ed(c).putBoolean("auto_connect", v).apply() }

    // ── split tunneling ───────────────────────────────────────────────

    fun splitMode(c: Context): String = p(c).getString("split_mode", "exclude") ?: "exclude"
    fun setSplitMode(c: Context, v: String) { ed(c).putString("split_mode", v).apply() }

    fun splitApps(c: Context): List<String> =
        p(c).getString("split_apps", "")?.split(",").orEmpty().filter { it.isNotBlank() }

    fun setSplitApps(c: Context, apps: List<String>) {
        ed(c).putString("split_apps", apps.joinToString(",")).apply()
    }

    // ── config overrides (hidden admin) ───────────────────────────────

    fun premiumOv(c: Context): Map<String, Boolean> {
        val o = JSONObject(p(c).getString("premium_ov", "{}") ?: "{}")
        val m = mutableMapOf<String, Boolean>()
        o.keys().forEach { k -> m[k] = o.optBoolean(k, false) }
        return m
    }

    fun setPremiumOv(c: Context, m: Map<String, Boolean>) {
        val o = JSONObject()
        m.forEach { (k, v) -> o.put(k, v) }
        ed(c).putString("premium_ov", o.toString()).apply()
    }

    fun stringSet(c: Context, key: String): Set<String> {
        val a = JSONArray(p(c).getString(key, "[]") ?: "[]")
        return buildSet { for (i in 0 until a.length()) add(a.optString(i)) }
    }

    fun setStringSet(c: Context, key: String, values: Set<String>) {
        val a = JSONArray()
        values.forEach { a.put(it) }
        ed(c).putString(key, a.toString()).apply()
    }

    // ── local (admin-added) configs ───────────────────────────────────

    data class LocalConfig(
        val id: String, val name: String, val country: String,
        val link: String, val premium: Boolean, val enabled: Boolean,
    )

    fun localConfigs(c: Context): List<LocalConfig> {
        val a = JSONArray(p(c).getString("local_configs", "[]") ?: "[]")
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            LocalConfig(
                id = o.optString("id"), name = o.optString("name"),
                country = o.optString("country"), link = o.optString("link"),
                premium = o.optBoolean("premium", false), enabled = o.optBoolean("enabled", true),
            )
        }
    }

    fun setLocalConfigs(c: Context, list: List<LocalConfig>) {
        val a = JSONArray()
        list.forEach { l ->
            a.put(JSONObject()
                .put("id", l.id).put("name", l.name).put("country", l.country)
                .put("link", l.link).put("premium", l.premium).put("enabled", l.enabled))
        }
        ed(c).putString("local_configs", a.toString()).apply()
    }

    fun addLocalConfig(c: Context, name: String, country: String, link: String, premium: Boolean) {
        val cur = localConfigs(c).toMutableList()
        cur.add(0, LocalConfig("L${System.currentTimeMillis()}", name, country, link, premium, true))
        setLocalConfigs(c, cur)
    }

    // ── server cache (so the UI shows servers instantly) ──────────────

    data class CachedConfig(
        val id: String, val name: String, val country: String,
        val link: String, val premium: Boolean, val active: Boolean = true,
    )

    fun serverCache(c: Context): List<CachedConfig> {
        val a = JSONArray(p(c).getString("server_cache", "[]") ?: "[]")
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            CachedConfig(
                id = o.optString("id"), name = o.optString("name"),
                country = o.optString("country"), link = o.optString("link"),
                premium = o.optBoolean("premium", false), active = o.optBoolean("active", true),
            )
        }
    }

    fun setServerCache(c: Context, list: List<CachedConfig>) {
        val a = JSONArray()
        list.forEach { s ->
            a.put(JSONObject()
                .put("id", s.id).put("name", s.name).put("country", s.country)
                .put("link", s.link).put("premium", s.premium).put("active", s.active))
        }
        ed(c).putString("server_cache", a.toString()).apply()
    }

    // ── selection ─────────────────────────────────────────────────────

    fun selectedKey(c: Context): String? = p(c).getString("selected_key", null)
    fun setSelectedKey(c: Context, v: String?) { ed(c).putString("selected_key", v).apply() }

    // ── entitlement (plan) ────────────────────────────────────────────

    fun plan(c: Context): String = p(c).getString("plan", "free") ?: "free"
    fun planExpiresAt(c: Context): Long = p(c).getLong("plan_expires_at", 0L)

    fun setPlan(c: Context, plan: String, expiresAt: Long) {
        ed(c).putString("plan", plan).putLong("plan_expires_at", expiresAt).apply()
    }

    // ── monthly usage quota ───────────────────────────────────────────

    private fun monthKey(): String =
        SimpleDateFormat("yyyy-MM", Locale.US).format(Date())

    fun usageBytes(c: Context): Long {
        val key = monthKey()
        val stored = p(c).getString("usage_month", key) ?: key
        if (stored != key) return 0L            // new month → fresh quota
        return p(c).getLong("usage_bytes", 0L)
    }

    fun addUsage(c: Context, bytes: Long) {
        val cur = usageBytes(c)
        ed(c).putString("usage_month", monthKey()).putLong("usage_bytes", cur + bytes).apply()
    }

    fun resetUsage(c: Context) {
        ed(c).putString("usage_month", monthKey()).putLong("usage_bytes", 0L).apply()
    }

    // ── anti-fraud device ledger ──────────────────────────────────────

    fun deviceId(c: Context): String = p(c).getString("device_id", "") ?: ""
    fun setDeviceId(c: Context, v: String) { ed(c).putString("device_id", v).apply() }

    fun trialUsed(c: Context): Boolean = p(c).getBoolean("trial_used", false)
    fun setTrialUsed(c: Context, v: Boolean) { ed(c).putBoolean("trial_used", v).apply() }

    fun reinstalls(c: Context): Int = p(c).getInt("reinstalls", 0)
    fun setReinstalls(c: Context, v: Int) { ed(c).putInt("reinstalls", v).apply() }

    // ── orders ────────────────────────────────────────────────────────

    fun orders(c: Context): List<Order> {
        val a = JSONArray(p(c).getString("orders", "[]") ?: "[]")
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            Order(
                id = o.optString("id"), plan = o.optString("plan"), price = o.optLong("price"),
                device = o.optString("device"), via = o.optString("via"),
                at = o.optLong("at"), status = o.optString("status", "pending"),
            )
        }
    }

    fun setOrders(c: Context, list: List<Order>) {
        val a = JSONArray()
        list.forEach { o ->
            a.put(JSONObject()
                .put("id", o.id).put("plan", o.plan).put("price", o.price)
                .put("device", o.device).put("via", o.via)
                .put("at", o.at).put("status", o.status))
        }
        ed(c).putString("orders", a.toString()).apply()
    }

    fun addOrder(c: Context, o: Order) {
        setOrders(c, listOf(o) + orders(c))
    }

    // ── hidden admin credentials ──────────────────────────────────────

    fun adminUser(c: Context): String = p(c).getString("admin_user", "admin") ?: "admin"
    fun adminPass(c: Context): String = p(c).getString("admin_pass", "Mianboor@2026") ?: "Mianboor@2026"
    fun setAdminPass(c: Context, v: String) { ed(c).putString("admin_pass", v).apply() }

    /**
     * کلید مدیر سرور — پیش‌فرض از BuildConfig.ADMIN_KEY (که CI از secret تزریق می‌کند)
     * تا انتشار کانفیگ و مدیریت کاربران بدون تنظیم دستی کار کند. از پنل مخفی قابل
     * تغییر است (مثلاً اگر ADMIN_SYNC_KEY سرور را عوض کردید).
     */
    fun adminServerKey(c: Context): String =
        p(c).getString("admin_server_key", BuildConfig.ADMIN_KEY)?.trim() ?: ""
    fun setAdminServerKey(c: Context, v: String) { ed(c).putString("admin_server_key", v.trim()).apply() }

    // ── last connected server (auto-connect on boot) ──────────────────

    fun lastLink(c: Context): String = p(c).getString("last_link", "") ?: ""
    fun lastName(c: Context): String = p(c).getString("last_name", "") ?: ""
    fun lastCountry(c: Context): String = p(c).getString("last_country", "") ?: ""

    fun setLastServer(c: Context, link: String, name: String, country: String) {
        ed(c).putString("last_link", link).putString("last_name", name).putString("last_country", country).apply()
    }

    // ── sync status (for the servers screen) ──────────────────────

    fun lastSyncAt(c: Context): Long = p(c).getLong("last_sync_at", 0L)
    fun lastSyncOk(c: Context): Boolean = p(c).getBoolean("last_sync_ok", false)

    fun setSyncStatus(c: Context, ok: Boolean) {
        ed(c).putLong("last_sync_at", System.currentTimeMillis()).putBoolean("last_sync_ok", ok).apply()
    }
}
