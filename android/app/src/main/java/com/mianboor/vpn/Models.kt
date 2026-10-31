package com.mianboor.vpn

/** A server row in the UI — merged from the remote API + local admin entries. */
data class ConfigItem(
    val key: String,          // "srv:<id>" or "loc:<id>"
    val name: String,
    val country: String,
    val protocol: String,
    val host: String,
    val port: Int,
    val ping: Int,
    val premium: Boolean,
    val enabled: Boolean,
    val link: String,
    val local: Boolean,
)

/** Purchase order created from the plans sheet, confirmed on the server. */
data class Order(
    val id: String,
    val plan: String,         // p1 | p3 | p6
    val price: Long,
    val device: String,
    val via: String,          // gateway | telegram
    val at: Long,
    val status: String,       // pending | approved | rejected
)

/** Anti-fraud device ledger row. */
data class DeviceRecord(
    val id: String,
    val trialUsed: Boolean,
    val reinstalls: Int,
    val seen: String,
)

/** اعلان مدیریت — صندوق کاربر (بل زنگ) یا پاپ‌آپ داخل اپ. */
data class Notice(
    val id: String,
    val title: String,
    val body: String,
    val kind: String,     // inbox | popup (legacy — از channels مشتق می‌شود)
    val createdAt: Long,  // epoch ms
    val read: Boolean = false,
    val ntype: String = "info",             // info | gift | warn | update
    val audience: String = "all",           // all | free | premium
    val channels: List<String> = listOf("inbox"), // inbox | popup | push
)

/** دوست دعوت‌شده (رفرال) — از سرور. */
data class RefFriend(
    val id: String,
    val label: String,
    val at: Long,
    val premium: Boolean,
)

/** وضعیت دعوت دوستان این دستگاه. */
data class RefInfo(
    val code: String,
    val giftDays: Int,
    val invitedCount: Int,
    val friends: List<RefFriend>,
)

/** تنظیمات اعلام نسخه (تب Update پنل مدیر). */
data class AdminSettings(
    val latestVersion: String = "",
    val latestCode: Int = 0,
    val latestUrl: String = "",
)
