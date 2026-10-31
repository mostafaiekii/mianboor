package com.mianboor.vpn

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * App-wide settings & state. Defaults come from BuildConfig (injected by CI);
 * the admin screen can override server settings at runtime.
 *
 * Everything the new demo-style UI needs is persisted here: language, theme,
 * split tunneling, entitlements, orders, usage quotas and the anti-fraud ledger.
 */
object AppPrefs {

    private const val FILE = "mianboor_prefs"

    private fun p(c: Context) = c.getSharedPreferences(FILE, Context.MODE_PRIVATE)
    private fun ed(c: Context) = p(c).edit()

    // ── server / token ────────────────────────────────────────────────

    // SERVER_URL is a safe public fallback. Tokens are secrets: they come
    // ONLY from saved prefs (set in the panel) or BuildConfig (CI secrets) —
    // never hardcoded in the repository.
    private const val FALLBACK_SERVER_URL = "https://mianboor.vercel.app"

    /** ذخیره‌شده (اگر مدیر در پنل عوض کرده) ← BuildConfig ← خالی (بدون sync). */
    private fun prefOr(loaded: String?, built: String): String =
        loaded?.trim()?.takeIf { it.isNotEmpty() }
            ?: built.trim().takeIf { it.isNotEmpty() }
            ?: ""

    fun serverUrl(c: Context): String =
        prefOr(p(c).getString("server_url", null), BuildConfig.SERVER_URL)
            .ifBlank { FALLBACK_SERVER_URL }

    fun clientToken(c: Context): String =
        prefOr(p(c).getString("client_token", null), BuildConfig.CLIENT_TOKEN)

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

    // ── config overrides (admin) ───────────────────────────────────

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

    // ── panel credentials (first login sets them — nothing hardcoded) ──

    fun adminUser(c: Context): String = p(c).getString("admin_user", "") ?: ""
    fun adminPass(c: Context): String = p(c).getString("admin_pass", "") ?: ""
    fun setAdminPass(c: Context, v: String) { ed(c).putString("admin_pass", v).apply() }

    /** First entry sets the credentials; afterwards they are required. */
    fun checkAdminLogin(c: Context, u: String, pass: String): Boolean {
        val saved = adminPass(c)
        if (saved.isBlank()) {
            if (pass.length < 6) return false
            ed(c).putString("admin_user", u.ifBlank { "admin" }).putString("admin_pass", pass).apply()
            return true
        }
        return u == adminUser(c) && pass == saved
    }

    /**
     * کلید مدیر سرور — پیش‌فرض از BuildConfig.ADMIN_KEY (که CI از secret تزریق می‌کند)
     * تا انتشار کانفیگ و مدیریت کاربران بدون تنظیم دستی کار کند. از تب Server قابل
     * تغییر است (مثلاً اگر کلید سرور عوض شد).
     */
    fun adminServerKey(c: Context): String =
        p(c).getString("admin_server_key", BuildConfig.ADMIN_KEY)?.trim() ?: ""
    fun setAdminServerKey(c: Context, v: String) { ed(c).putString("admin_server_key", v.trim()).apply() }

    /**
     * رمز مدیر سرور (ADMIN_PASSWORD روی هاست) — برای fallback کوکی وقتی سرور
     * قدیمی است و x-admin-key را نمی‌شناسد. پیش‌فرض خالی است؛ در تب Server
     * تنظیم می‌شود.
     */
    fun adminServerPass(c: Context): String =
        p(c).getString("admin_server_pass", "")?.trim() ?: ""
    fun setAdminServerPass(c: Context, v: String) {
        ed(c).putString("admin_server_pass", v.trim()).apply()
        com.mianboor.vpn.MianboorApi.adminResetCookie()
    }

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

    /** آخرین پیام خطای سنک — برای نمایش در بخش سرورها (دیاگ نوز). */
    fun lastSyncError(c: Context): String = p(c).getString("last_sync_error", "") ?: ""
    fun setSyncError(c: Context, msg: String) {
        ed(c).putString("last_sync_error", msg.take(160)).apply()
    }

    /** نسخهٔ جدید اعلام‌شده از سرور — لینک دانلود (fallback: releases گیت‌هاب). */
    fun latestUpdateUrl(c: Context): String = p(c).getString("latest_update_url", "") ?: ""
    fun setLatestUpdateUrl(c: Context, v: String) { ed(c).putString("latest_update_url", v.trim()).apply() }

    /** نسخهٔ سرور که آخرین سنک از آن آمد ("2.0.0") — برای دیاگ نوز. */
    fun serverBuild(c: Context): String = p(c).getString("server_build", "") ?: ""
    fun setServerBuild(c: Context, v: String) { ed(c).putString("server_build", v.take(24)).apply() }

    // ── origin IP cache (fetched BEFORE connecting, so it is the user's real IP) ──

    fun ipInfo(c: Context): Pair<String, String>? {
        val raw = p(c).getString("ip_info", null) ?: return null
        val a = raw.split("|")
        return if (a.size == 2 && a[0].isNotBlank()) a[0] to a[1] else null
    }

    fun setIpInfo(c: Context, ip: String, cc: String) {
        ed(c).putString("ip_info", "$ip|$cc").putLong("ip_at", System.currentTimeMillis()).apply()
    }

    fun ipInfoAge(c: Context): Long = p(c).getLong("ip_at", 0L)

    // ── update checker throttle ──

    fun lastUpdateCheck(c: Context): Long = p(c).getLong("update_check_at", 0L)
    fun setUpdateChecked(c: Context) { ed(c).putLong("update_check_at", System.currentTimeMillis()).apply() }

    // ── monthly per-app traffic (UsageTracker) ──

    fun appSnap(c: Context): String = p(c).getString("app_snap", "{}") ?: "{}"
    fun setAppSnap(c: Context, v: String) { ed(c).putString("app_snap", v).apply() }
    fun appMonthKey(c: Context): String = p(c).getString("app_month", "") ?: ""
    fun setAppMonth(c: Context, key: String, acc: String) { ed(c).putString("app_month", key).putString("app_acc", acc).apply() }
    fun appAcc(c: Context): String = p(c).getString("app_acc", "{}") ?: "{}"

    // ── monthly per-server traffic ──

    fun srvMonthKey(c: Context): String = p(c).getString("srv_month", "") ?: ""
    fun srvAcc(c: Context): String = p(c).getString("srv_acc", "{}") ?: "{}"
    fun setSrvAcc(c: Context, key: String, acc: String) { ed(c).putString("srv_month", key).putString("srv_acc", acc).apply() }

    // ── order outbox: orders that failed to reach the server — retried on every sync ──

    fun unsentOrders(c: Context): JSONArray = JSONArray(p(c).getString("unsent_orders", "[]") ?: "[]")
    fun setUnsentOrders(c: Context, a: JSONArray) { ed(c).putString("unsent_orders", a.toString()).apply() }

    // ── اعلان‌ها (صندوق + پاپ‌آپ) ──

    fun noticesCache(c: Context): List<Notice> {
        val a = JSONArray(p(c).getString("notices_cache", "[]") ?: "[]")
        return (0 until a.length()).map { i ->
            val o = a.getJSONObject(i)
            Notice(
                id = o.optString("id"), title = o.optString("title"),
                body = o.optString("body"),
                kind = if (o.optString("kind") == "popup") "popup" else "inbox",
                createdAt = o.optLong("at"), read = o.optBoolean("read", false),
            )
        }
    }

    fun setNoticesCache(c: Context, list: List<Notice>) {
        val a = JSONArray()
        list.forEach { n ->
            a.put(JSONObject()
                .put("id", n.id).put("title", n.title).put("body", n.body)
                .put("kind", n.kind).put("at", n.createdAt).put("read", n.read))
        }
        ed(c).putString("notices_cache", a.toString()).apply()
    }

    /** اعلان‌های پاپ‌آپ که یک‌بار نمایش داده شده‌اند — تا دوباره تکرار نشوند. */
    fun popupSeen(c: Context): Set<String> = stringSet(c, "popup_seen")
    fun addPopupSeen(c: Context, id: String) { setStringSet(c, "popup_seen", popupSeen(c) + id) }
}
