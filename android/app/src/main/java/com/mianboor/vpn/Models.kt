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

/** Purchase order created from the plans sheet, approved in the hidden panel. */
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
