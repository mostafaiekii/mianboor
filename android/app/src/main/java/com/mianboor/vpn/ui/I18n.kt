package com.mianboor.vpn.ui

/** Bilingual strings for the Mianboor Android app (ported 1:1 from the web demo). */

enum class Lang { EN, FA }

const val TG_SUPPORT = "https://t.me/member9"

interface Strings {
    val home: String
    val servers: String
    val account: String
    val settings: String
    val notConnected: String
    val connecting: String
    val connected: String
    val tapProtect: String
    val download: String
    val upload: String
    val tabFree: String
    val tabPremium: String
    val selectLocation: String
    val search: String
    val smart: String
    val smartSub: String
    val locations: String
    val noMatch: String
    val livePing: String
    val syncErrorTitle: String
    val inbox: String
    val inboxEmpty: String
    val markAllRead: String
    val popupOk: String
    val best: String
    val premiumLockSub: String
    val planFree: String
    val planFreeSub: String
    val planPremium: String
    val planPremiumSub: String
    fun quotaOf(u: String, total: String): String
    val dataUsage: String
    val resetsOn: String
    val trialUsedTitle: String
    val trialUsedSub: String
    val unlimited: String
    val validUntil: String
    val killSwitch: String
    val killSwitchSub: String
    val autoConnect: String
    val autoConnectSub: String
    val split: String
    val splitSubOff: String
    fun splitSubOn(n: Int, mode: String): String
    val modeExcl: String
    val modeIncl: String
    val support: String
    val supportSub: String
    val renewRow: String
    val renewWhat: String
    val renewExplain: String
    val deviceId: String
    val deviceIdSub: String
    val copied: String
    val upgrade: String
    val renewBtn: String
    val trialOverUpsell: String
    val plansTitle: String
    val currentPlan: String
    val freeFeat: String
    val premFeat: String
    val pickPlan: String
    val m1: String
    val m3: String
    val m6: String
    val price1: String
    val price3: String
    val price6: String
    val sub1: String
    val sub3: String
    val sub6: String
    val popular: String
    val bestValue: String
    val continuePay: String
    val payTitle: String
    val payGateway: String
    val payGatewaySub: String
    val viaTelegram: String
    val viaTelegramSub: String
    val payCardLabel: String
    val payHolderLabel: String
    val payAmountLabel: String
    val payCardHint: String
    val payCopiedCard: String
    val payOrderId: String
    val processing: String
    val paySuccess: String
    val orderPlaced: String
    val orderPlacedSub: String
    val openTelegram: String
    val done: String
    val orderApprovedToast: String
    val orderRejectedToast: String
    val orderPlacedToast: String
    val splitTitle: String
    val splitSearch: String
    val splitModeExcl: String
    val splitModeIncl: String
    val splitExclHint: String
    val splitInclHint: String
    fun exclCount(n: Int): String
    fun inclCount(n: Int): String
    val exclCount0: String
    val inclCount0: String
    val resetSplit: String
    val splitApplyHint: String
    val theme: String
    val themeSub: String
    val reinstallSim: String
    val reinstallSimSub: String
    val reinstallDoneToast: String
    val language: String
    val livePingSet: String
    val livePingSetDesc: String
    val blockQuic: String
    val blockQuicSub: String
    val about: String
    fun aboutLine(v: String): String
    val noKey: String
    val noServers: String
    val syncRefresh: String
    val syncing: String
    val syncNever: String
    fun syncOkAgo(mins: String): String
    val syncFail: String
    val syncRetry: String
    val connectingMsgs: List<String>
    val scanningMsgs: List<String>
    val errPermission: String
    val errNoConfig: String
    val errSetup: String
    val errServer: String
    val errNetwork: String
    val errGeneric: String
    val setupTitle: String
    val setupDesc: String
    val saveBtn: String
    val savedToast: String
    val yourIp: String
    fun connectFlash(from: String, to: String): String
    val usageDetails: String
    val usageThisMonth: String
    val usageByApp: String
    val usageAppSub: String
    val usageByServer: String
    val usageSrvSub: String
    val updateTitle: String
    fun updateSub(v: String): String
    val updateBtn: String
    val updateLater: String
    fun pendingOrders(n: Int): String
    val serverOldWarn: String

    // ── referral — دعوت دوستان ──
    val invite: String
    val inviteSub: String
    val giftNote: String
    val yourCode: String
    val copyBtn: String
    val copyLink: String
    val friendsJoined: String
    val giftDaysLabel: String
    fun claimGift(days: Int): String
    val noGiftYet: String
    val friendJoined: String
    val friendBought: String
    fun daysShort(days: Int): String
    val inviteHow: String
    val invStep1: String
    val invStep2: String
    val invStep3: String
    val enterCodeTitle: String
    val enterCodeSub: String
    val applyCode: String
    val refOk: String
    val refAlready: String
    val refBad: String
    val refSelf: String
    val refOffline: String
    fun claimedOk(days: Int): String

    // ── پشتیبانی آنلاین ──
    val supportOnline: String
    val supportSubChat: String
    val chatWith: String
    val aiOnline: String
    val chatWelcome: String
    val chatPlaceholder: String
    val quick1: String
    val quick2: String
    val quick3: String
    val quick4: String
    val aiFailed: String
    val chatHuman: String

    // ── پنل مدیریت: تب Update + آهنگساز اعلان ──
    val tabUpdate: String
    val updCurVer: String
    val updCurSub: String
    val updPubTitle: String
    val updVerLabel: String
    val updCodeLabel: String
    val updUrlLabel: String
    val updPublish: String
    val updOk: String
    val updFail: String
    val updNoKey: String
    val nTypeLabel: String
    val nAudience: String
    val nDelivery: String
    val nSend: String
    val kInfo: String
    val kGift: String
    val kWarn: String
    val kUpdate: String
    val aAll: String
    val aFree: String
    val aPremium: String
    val dInbox: String
    val dPopup: String
    val dPush: String

    // ── v2: محافظت اتصال + امکانات جدید ──
    val connSection: String
    val failover: String
    val failoverSub: String
    val autoReconn: String
    val autoReconnSub: String
    val stealth: String
    val stealthSub: String
    val stealthNormal: String
    val stealthStrict: String
    val stealthBadge: String
    val blockedTitle: String
    val blockedSub: String
    val dns: String
    val dnsSub: String
    val dnsAuto: String
    val dnsCf: String
    val dnsGoogle: String
    val dnsCustom: String
    val dnsCustomHint: String
    val speedTest: String
    val speedResultSub: String
    val speedPing: String
    val speedDown: String
    val speedUp: String
    val speedTesting: String
    val speedDone: String
    val speedFail: String
    val speedNeedConn: String
    val statusTitle: String
    val statusSub: String
    val statusDown: String
    val statusLive: String
    val importTitle: String
    val importLinkTab: String
    val importSubTab: String
    val importLinkHint: String
    val importSubHint: String
    val importName: String
    val importDefaultName: String
    val importAdd: String
    val importInvalid: String
    val importFetch: String
    val importFetching: String
    val importAdded: String
    val importSubOk: String
    val importSubFail: String
    val qrScan: String
    val qrPrompt: String
    val qrNote: String
    val wallet: String
    val walletSub: String
    val walletBalance: String
    val toman: String
    val walletTopupNote: String
    val walletRedeem: String
    val walletRedeemPh: String
    val walletRedeemBtn: String
    val walletTxs: String
    val txTopup: String
    val txPay: String
    val walletRedeemOk: String
    val walletRedeemBad: String
    val walletPayOk: String
    val walletPayLow: String
    val walletOff: String
    val promoPh: String
    val promoApply: String
    val promoBad: String
    val payWallet: String
    val walletPayNote: String
    val walletOpenRow: String
    val quotaWarnCta: String
    val expiryWarnCta: String
    val usageChart: String
    val usageChartSub: String
    val chartToday: String
    val privacyRow: String
    val privacyRowSub: String
    val privacyTitle: String
    val p1t: String
    val p1b: String
    val p2t: String
    val p2b: String
    val p3t: String
    val p3b: String
    val p4t: String
    val p4b: String
    val codesTab: String
    val codesGift: String
    val codesPromo: String
    val codesAmount: String
    val codesPercent: String
    val codesCreate: String
    val codesDelete: String
    val codesUsed: String
    val codesCreated: String

    fun quotaWarn(pct: Int): String
    fun expiryWarn(days: Int): String
    fun failoverToast(server: String): String
    fun promoOk(pct: Int): String
}

object EnStrings : Strings {
    override val home = "Home"
    override val servers = "Servers"
    override val account = "Account"
    override val settings = "Settings"
    override val notConnected = "Not connected"
    override val connecting = "Connecting…"
    override val connected = "Connected"
    override val tapProtect = "Tap to protect your connection"
    override val download = "Download"
    override val upload = "Upload"
    override val tabFree = "Free"
    override val tabPremium = "Premium"
    override val selectLocation = "Select Location"
    override val search = "Search countries…"
    override val smart = "Smart Connect"
    override val smartSub = "Fastest server for you"
    override val locations = "Locations"
    override val noMatch = "No servers match."
    override val livePing = "Live ping"
    override val syncErrorTitle = "Last sync to server failed"
    override val inbox = "Inbox"
    override val inboxEmpty = "No notices yet — you're all caught up"
    override val markAllRead = "Mark all read"
    override val popupOk = "Got it"
    override val best = "BEST"
    override val premiumLockSub = "Premium server · tap to unlock"
    override val planFree = "Free Plan"
    override val planFreeSub = "5 GB every month · standard servers"
    override val planPremium = "Premium"
    override val planPremiumSub = "Unlimited data · every server unlocked"
    override fun quotaOf(u: String, total: String) = "$u of $total"
    override val dataUsage = "Data usage"
    override val resetsOn = "Monthly reset · free tier renews every 30 days"
    override val trialUsedTitle = "Free quota used on this device"
    override val trialUsedSub =
        "The 5 GB free tier is locked to this device — reinstalling the app won't reset it."
    override val unlimited = "Unlimited"
    override val validUntil = "Valid until"
    override val killSwitch = "Kill Switch"
    override val killSwitchSub = "Reconnects automatically if the VPN drops"
    override val autoConnect = "Auto Connect"
    override val autoConnectSub = "When the phone boots"
    override val split = "Split Tunneling"
    override val splitSubOff = "Choose apps that use VPN"
    override fun splitSubOn(n: Int, mode: String) = "$n apps · $mode"
    override val modeExcl = "excluded"
    override val modeIncl = "VPN-only"
    override val support = "Support"
    override val supportSub = "Telegram · @member9"
    override val renewRow = "Renew Subscription"
    override val renewWhat = "What is “Renew Subscription”?"
    override val renewExplain =
        "When your plan runs out, buy the same plan (or a different one) and the new period is added " +
        "to your account — same device, same settings, no interruption. Your premium servers and " +
        "unlimited data simply keep working."
    override val deviceId = "Device ID"
    override val deviceIdSub = "Binds your free tier & subscription to this phone"
    override val copied = "Copied!"
    override val upgrade = "Go Premium"
    override val renewBtn = "Renew / Extend plan"
    override val trialOverUpsell = "Free quota is finished on this device — pick a plan to continue."
    override val plansTitle = "Go Premium"
    override val currentPlan = "Current plan"
    override val freeFeat = "5 GB / month · standard servers"
    override val premFeat = "Unlimited data · all servers incl. premium"
    override val pickPlan = "Choose your plan"
    override val m1 = "1 month"
    override val m3 = "3 months"
    override val m6 = "6 months"
    override val price1 = "200,000 T"
    override val price3 = "400,000 T"
    override val price6 = "700,000 T"
    override val sub1 = "200,000 T per month"
    override val sub3 = "≈ 133,000 T per month"
    override val sub6 = "≈ 117,000 T per month"
    override val popular = "Popular"
    override val bestValue = "Best value"
    override val continuePay = "Continue to payment"
    override val payTitle = "Payment method"
    override val payGateway = "Card to card"
    override val payGatewaySub = "Transfer to the card, then send the receipt"
    override val viaTelegram = "Telegram · @member9"
    override val viaTelegramSub = "Pay via admin, activation by admin"
    override val payCardLabel = "Card number"
    override val payHolderLabel = "Card holder"
    override val payAmountLabel = "Amount"
    override val payCardHint =
        "Transfer the exact amount, put your order ID in the description, then send the receipt on Telegram."
    override val payCopiedCard = "Card number copied"
    override val payOrderId = "Order ID"
    override val processing = "Connecting to the gateway…"
    override val paySuccess = "Payment successful"
    override val orderPlaced = "Order placed — waiting for admin approval"
    override val orderPlacedSub =
        "The admin sees your order instantly and activates your plan. Follow up: @member9"
    override val openTelegram = "Open Telegram"
    override val done = "Done"
    override val orderApprovedToast = "Premium activated 🎉"
    override val orderRejectedToast = "Order was rejected"
    override val orderPlacedToast = "Order sent to admin"
    override val splitTitle = "Split Tunneling"
    override val splitSearch = "Search apps…"
    override val splitModeExcl = "Exclude from VPN"
    override val splitModeIncl = "Only these apps use VPN"
    override val splitExclHint =
        "Excluded apps bypass the VPN and use your real network."
    override val splitInclHint =
        "Only selected apps go through the VPN — everything else uses your real network."
    override fun exclCount(n: Int) = "$n apps excluded from VPN"
    override fun inclCount(n: Int) = "$n apps routed through VPN"
    override val exclCount0 = "No apps excluded — everything goes through VPN"
    override val inclCount0 = "Nothing selected — everything goes through VPN"
    override val resetSplit = "Clear selection"
    override val splitApplyHint = "Changes apply the next time you connect."
    override val theme = "Theme"
    override val themeSub = "Soft palettes · applies instantly"
    override val reinstallSim = "Simulate reinstall"
    override val reinstallSimSub =
        "Anti-fraud demo: resets the app like a fresh install — the free tier stays consumed on this device."
    override val reinstallDoneToast = "App reset — but your device keeps its free-tier state!"
    override val language = "Language"
    override val livePingSet = "Live ping refresh"
    override val livePingSetDesc = "Re-measure server pings every 3 seconds"
    override val blockQuic = "Faster browsing (block QUIC)"
    override val blockQuicSub = "Forces browsers onto fast HTTP/2-over-TCP inside the tunnel. Recommended ON."
    override val about = "About"
    override fun aboutLine(v: String) = "Mianboor VPN · v$v"
    override val noKey = "No key, no sign-up — install & connect."
    override val noServers = "No servers available yet — the admin hasn't published any."
    override val syncRefresh = "Refresh"
    override val syncing = "Syncing…"
    override val syncNever = "Not synced yet"
    override fun syncOkAgo(mins: String) = "Synced $mins ago"
    override val syncFail = "Sync failed"
    override val syncRetry = "Tap ↻ to retry"
    override val connectingMsgs = listOf(
        "Establishing the secure tunnel…",
        "Encryption keys are being exchanged…",
        "Your connection is getting safer…",
        "Almost ready…",
    )
    override val scanningMsgs = listOf(
        "Checking secure routes…",
        "Finding your best shortcut…",
        "Preparing backup routes…",
        "Optimizing the network…",
    )
    override val errPermission = "VPN permission was not granted"
    override val errNoConfig = "No active configs available"
    override val errSetup = "Enter the Mianboor server settings first"
    override val errServer = "Mianboor server not found — check the address"
    override val errNetwork = "Can't reach the server — check your internet"
    override val errGeneric = "Connection failed; try again"
    override val setupTitle = "First-time setup"
    override val setupDesc = "Enter the Mianboor server address and client token once."
    override val saveBtn = "Save"
    override val savedToast = "Saved"
    override val yourIp = "Your IP"
    override fun connectFlash(from: String, to: String) = "Connected from $from to $to"
    override val usageDetails = "Usage details"
    override val usageThisMonth = "This month"
    override val usageByApp = "By app"
    override val usageAppSub = "Apps that used the VPN tunnel"
    override val usageByServer = "By server"
    override val usageSrvSub = "Data routed through each server"
    override val updateTitle = "New version available"
    override fun updateSub(v: String) = "Mianboor v$v is out — updated servers & fixes."
    override val updateBtn = "Update now"
    override val updateLater = "Later"
    override fun pendingOrders(n: Int) = "You have $n pending orders"
    override val serverOldWarn =
        "Server runs an old version — publishing configs & orders won't reach it. Redeploy the project on Vercel."

    override val invite = "Invite Friends"
    override val inviteSub = "Give 3 days, get 3 days"
    override val giftNote = "Gift days turn into premium time on your account."
    override val yourCode = "Your referral code"
    override val copyBtn = "Copy"
    override val copyLink = "Copy invite link"
    override val friendsJoined = "Friends joined"
    override val giftDaysLabel = "Gift days"
    override fun claimGift(days: Int) = "Claim $days gift days"
    override val noGiftYet = "No gift days yet — invite a friend!"
    override val friendJoined = "joined with your code"
    override val friendBought = "went Premium"
    override fun daysShort(days: Int) = "+$days days"
    override val inviteHow = "How it works"
    override val invStep1 = "Share your code with friends"
    override val invStep2 = "They install Mianboor and enter your code"
    override val invStep3 = "You both get 3 days — 7 more if they go Premium"
    override val enterCodeTitle = "Have a friend's code?"
    override val enterCodeSub = "Enter their referral code — you both get 3 gift days"
    override val applyCode = "Apply"
    override val refOk = "Code applied — 3 gift days for each of you! 🎁"
    override val refAlready = "You already joined with a code"
    override val refBad = "Code not found"
    override val refSelf = "That's your own code!"
    override val refOffline = "Couldn't reach the server — check your internet"
    override fun claimedOk(days: Int) = "$days premium days added to your account 🎉"

    override val supportOnline = "Online Support"
    override val supportSubChat = "AI chat · 24/7"
    override val chatWith = "Support Chat"
    override val aiOnline = "AI assistant · online"
    override val chatWelcome = "Hi 👋 I'm the Mianboor assistant. Ask me anything — connection, plans, or your account."
    override val chatPlaceholder = "Write a message…"
    override val quick1 = "How do I connect?"
    override val quick2 = "Speed is slow"
    override val quick3 = "How to go premium?"
    override val quick4 = "When is my order approved?"
    override val aiFailed = "Couldn't reach the assistant — try again."
    override val chatHuman = "For a human: @member9 on Telegram"

    override val tabUpdate = "Update"
    override val updCurVer = "Announced version"
    override val updCurSub = "Apps compare their build against this on every sync — a higher code shows the update banner."
    override val updPubTitle = "Announce a new version"
    override val updVerLabel = "Version name — e.g. 1.7.0"
    override val updCodeLabel = "versionCode — a number greater than the previous one"
    override val updUrlLabel = "APK URL (GitHub Releases)"
    override val updPublish = "Publish update announce"
    override val updOk = "Announced — users get the update banner 🚀"
    override val updFail = "Publish failed — check the server key"
    override val updNoKey = "Set the server key in the Server tab first"
    override val nTypeLabel = "Type"
    override val nAudience = "Audience"
    override val nDelivery = "Delivery"
    override val nSend = "Send to users"
    override val kInfo = "Info"
    override val kGift = "Gift"
    override val kWarn = "Warning"
    override val kUpdate = "Update"
    override val aAll = "Everyone"
    override val aFree = "Free users"
    override val aPremium = "Premium users"
    override val dInbox = "Inbox"
    override val dPopup = "Popup"
    override val dPush = "Push"

    // ── v2 ──
    override val connSection = "Connection protection"
    override val failover = "Auto failover"
    override val failoverSub = "Switch to the best server if the current one dies"
    override val autoReconn = "Auto reconnect"
    override val autoReconnSub = "Rejoin after Wi-Fi / data changes"
    override val stealth = "Anti-censorship mode"
    override val stealthSub = "Strict mode fragments TLS to beat heavy filtering"
    override val stealthNormal = "Normal"
    override val stealthStrict = "Strict"
    override val stealthBadge = "Stealth"
    override val blockedTitle = "Blocked by Kill Switch"
    override val blockedSub = "Internet is cut to protect your IP — tap to reconnect"
    override val dns = "DNS"
    override val dnsSub = "Encrypted DNS inside the tunnel"
    override val dnsAuto = "Auto"
    override val dnsCf = "Cloudflare DoH"
    override val dnsGoogle = "Google DoH"
    override val dnsCustom = "Custom IP"
    override val dnsCustomHint = "e.g. 178.22.122.100"
    override val speedTest = "Speed test"
    override val speedResultSub = "Measured over the live tunnel"
    override val speedPing = "Latency"
    override val speedDown = "Download"
    override val speedUp = "Upload"
    override val speedTesting = "Testing…"
    override val speedDone = "Done"
    override val speedFail = "Test failed — connect first, then try again"
    override val speedNeedConn = "Connect first — the test runs inside the tunnel"
    override val statusTitle = "Server status"
    override val statusSub = "Health of every server right now"
    override val statusDown = "offline"
    override val statusLive = "live"
    override val importTitle = "Import config"
    override val importLinkTab = "Share link"
    override val importSubTab = "Subscription"
    override val importLinkHint = "vless:// · vmess:// · trojan:// · ss://"
    override val importSubHint = "https://your-subscription-url"
    override val importName = "Name (optional)"
    override val importDefaultName = "Custom server"
    override val importAdd = "Add server"
    override val importInvalid = "Link looks invalid — check and try again"
    override val importFetch = "Fetch servers"
    override val importFetching = "Fetching…"
    override val importAdded = "Server added to your list"
    override val importSubOk = "Servers imported from subscription"
    override val importSubFail = "Couldn't fetch the subscription URL"
    override val qrScan = "Scan QR code"
    override val qrPrompt = "Point the camera at the config QR code"
    override val qrNote = "Camera permission is asked only for scanning — nothing is recorded"
    override val wallet = "Wallet"
    override val walletSub = "Balance, gift codes & payments"
    override val walletBalance = "Balance"
    override val toman = "T"
    override val walletTopupNote = "Top up with gift codes from support, or ask the team to charge your wallet."
    override val walletRedeem = "Redeem gift code"
    override val walletRedeemPh = "e.g. MB-XXXXXX"
    override val walletRedeemBtn = "Redeem"
    override val walletTxs = "Transactions"
    override val txTopup = "Wallet top-up"
    override val txPay = "Plan purchase"
    override val walletRedeemOk = " added to your wallet 🎉"
    override val walletRedeemBad = "Invalid or already-used code"
    override val walletPayOk = "Paid from wallet — premium activated 🎉"
    override val walletPayLow = "Not enough balance — redeem a gift code first"
    override val walletOff = "Couldn't reach the wallet — check your connection"
    override val promoPh = "Promo code"
    override val promoApply = "Apply"
    override val promoBad = "Invalid promo code"
    override val payWallet = "Pay with wallet · "
    override val walletPayNote = "Instant activation from your balance"
    override val walletOpenRow = "Open wallet →"
    override val quotaWarnCta = "Get a plan"
    override val expiryWarnCta = "Renew now"
    override val usageChart = "Last 14 days"
    override val usageChartSub = "Daily tunnel usage (GB)"
    override val chartToday = "Today"
    override val privacyRow = "Privacy & No-logs"
    override val privacyRowSub = "What we collect — and what we never do"
    override val privacyTitle = "Privacy & No-logs"
    override val p1t = "What we store"
    override val p1b = "Only your device ID, plan state and total usage — just enough to run your subscription. No name, no email, no phone number."
    override val p2t = "What we never store"
    override val p2b = "Browsing history, DNS queries, traffic content or destination IPs. No activity logs — nothing to sell, nothing to leak."
    override val p3t = "Tunnel security"
    override val p3b = "Traffic is end-to-end encrypted with Xray (VLESS · Reality · TLS). Kill Switch cuts the internet if the tunnel drops."
    override val p4t = "Your controls"
    override val p4b = "Split tunneling, encrypted DNS of your choice and full server selection are always in your hands."
    override val codesTab = "Codes"
    override val codesGift = "Gift codes"
    override val codesPromo = "Promo codes"
    override val codesAmount = "Amount (T)"
    override val codesPercent = "Percent %"
    override val codesCreate = "Create"
    override val codesDelete = "Delete"
    override val codesUsed = "used"
    override val codesCreated = "Code created: "

    override fun quotaWarn(pct: Int) = "$pct% of your free quota is used — grab a plan before it runs out"
    override fun expiryWarn(days: Int) = "Your plan ends in $days days — renew to stay protected"
    override fun failoverToast(server: String) = "Server dropped — switched to $server"
    override fun promoOk(pct: Int) = "$pct% off applied 🎉"
}

object FaStrings : Strings {
    override val home = "خانه"
    override val servers = "سرورها"
    override val account = "حساب"
    override val settings = "تنظیمات"
    override val notConnected = "وصل نیستی"
    override val connecting = "در حال اتصال…"
    override val connected = "متصل"
    override val tapProtect = "برای امن شدن اتصالت لمس کن"
    override val download = "دانلود"
    override val upload = "آپلود"
    override val tabFree = "رایگان"
    override val tabPremium = "پرمیوم"
    override val selectLocation = "انتخاب سرور"
    override val search = "جستجوی کشور…"
    override val smart = "اتصال هوشمند"
    override val smartSub = "سریع‌ترین سرور برای تو"
    override val locations = "سرور"
    override val noMatch = "سروری پیدا نشد."
    override val livePing = "پینگ زنده"
    override val syncErrorTitle = "آخرین سنک با سرور ناموفق بود"
    override val inbox = "اعلان‌ها"
    override val inboxEmpty = "هنوز اعلانی نداری"
    override val markAllRead = "خواندن همه"
    override val popupOk = "متوجه شدم"
    override val best = "برترین"
    override val premiumLockSub = "سرور پرمیوم · برای باز شدن بزن"
    override val planFree = "پلن رایگان"
    override val planFreeSub = "۵ گیگ در ماه · سرورهای استاندارد"
    override val planPremium = "پرمیوم"
    override val planPremiumSub = "دیتای نامحدود · همه سرورها باز"
    override fun quotaOf(u: String, total: String) = "$u از $total"
    override val dataUsage = "مصرف دیتا"
    override val resetsOn = "ریست ماهانه · حجم رایگان هر ۳۰ روز شارژ می‌شه"
    override val trialUsedTitle = "حجم رایگان این دستگاه تمام شده"
    override val trialUsedSub =
        "۵ گیگ رایگان قفلِ همین دستگاهه — نصب مجدد اپ هم ریستش نمی‌کنه."
    override val unlimited = "نامحدود"
    override val validUntil = "معتبر تا"
    override val killSwitch = "کلید قطع اضطراری"
    override val killSwitchSub = "اگر VPN قطع شه، خودکار دوباره وصل می‌شه"
    override val autoConnect = "اتصال خودکار"
    override val autoConnectSub = "بعد از روشن شدن گوشی"
    override val split = "تونل‌گذاری انتخابی"
    override val splitSubOff = "انتخاب اپ‌هایی که از VPN استفاده می‌کنن"
    override fun splitSubOn(n: Int, mode: String) = "$n اپ · $mode"
    override val modeExcl = "مستثنی"
    override val modeIncl = "فقط از VPN"
    override val support = "پشتیبانی"
    override val supportSub = "تلگرام · @member9"
    override val renewRow = "تمدید اشتراک"
    override val renewWhat = "«تمدید اشتراک» یعنی چی؟"
    override val renewExplain =
        "وقتی پلنت داره تموم می‌شه، همون پلن یا یه پلن دیگه رو می‌خری و مدت جدید مستقیم به حسابت " +
        "اضافه می‌شه — همین دستگاه، همین تنظیمات، بدون قطع شدن سرویس. سرورهای پرمیوم و دیتای نامحدود " +
        "همون‌طوری به کارش ادامه می‌ده."
    override val deviceId = "شناسه دستگاه"
    override val deviceIdSub = "حجم رایگان و اشتراکت به همین گوشی قفله"
    override val copied = "کپی شد!"
    override val upgrade = "خرید پرمیوم"
    override val renewBtn = "تمدید / افزایش پلن"
    override val trialOverUpsell = "حجم رایگان این دستگاه تموم شده — برای ادامه یه پلن انتخاب کن."
    override val plansTitle = "ارتقا به پرمیوم"
    override val currentPlan = "پلن فعلی تو"
    override val freeFeat = "۵ گیگ در ماه · سرورهای استاندارد"
    override val premFeat = "دیتای نامحدود · همه سرورها حتی پرمیوم"
    override val pickPlan = "تعرفه‌ات رو انتخاب کن"
    override val m1 = "۱ ماهه"
    override val m3 = "۳ ماهه"
    override val m6 = "۶ ماهه"
    override val price1 = "۲۰۰ هزار تومان"
    override val price3 = "۴۰۰ هزار تومان"
    override val price6 = "۷۰۰ هزار تومان"
    override val sub1 = "ماهی ۲۰۰ هزار تومان"
    override val sub3 = "ماهی ≈ ۱۳۳ هزار تومان"
    override val sub6 = "ماهی ≈ ۱۱۷ هزار تومان"
    override val popular = "پیشنهاد ما"
    override val bestValue = "به‌صرفه‌ترین"
    override val continuePay = "ادامه و پرداخت"
    override val payTitle = "روش پرداخت"
    override val payGateway = "کارت به کارت"
    override val payGatewaySub = "به شماره کارت واریز کن و رسید رو بفرست"
    override val viaTelegram = "تلگرام · @member9"
    override val viaTelegramSub = "پرداخت نزد ادمین، فعال‌سازی دستی"
    override val payCardLabel = "شماره کارت"
    override val payHolderLabel = "به نام"
    override val payAmountLabel = "مبلغ"
    override val payCardHint =
        "مبلغ دقیق رو واریز کن، شماره سفارش رو در شرح پرداخت بنویس و رسیدش رو در تلگرام بفرست."
    override val payCopiedCard = "شماره کارت کپی شد"
    override val payOrderId = "شماره سفارش"
    override val processing = "در حال اتصال به درگاه…"
    override val paySuccess = "پرداخت موفق"
    override val orderPlaced = "سفارش ثبت شد — منتظر تأیید ادمین"
    override val orderPlacedSub =
        "ادمین سفارشت رو همون لحظه می‌بینه و پلنت رو فعال می‌کنه. پیگیری: @member9"
    override val openTelegram = "باز کردن تلگرام"
    override val done = "باشه"
    override val orderApprovedToast = "پرمیوم فعال شد 🎉"
    override val orderRejectedToast = "سفارش رد شد"
    override val orderPlacedToast = "سفارش برای ادمین ارسال شد"
    override val splitTitle = "تونل‌گذاری انتخابی"
    override val splitSearch = "جستجوی اپ…"
    override val splitModeExcl = "مستثنی کردن از VPN"
    override val splitModeIncl = "فقط این اپ‌ها از VPN استفاده کنن"
    override val splitExclHint =
        "اپ‌های انتخابی از VPN خارج می‌شن و با اینترنت واقعی تو کار می‌کنن."
    override val splitInclHint =
        "فقط اپ‌های انتخابی از VPN رد می‌شن — بقیه با اینترنت واقعی تو کار می‌کنن."
    override fun exclCount(n: Int) = "$n اپ از VPN مستثنی شده"
    override fun inclCount(n: Int) = "$n اپ از داخل VPN رد می‌شه"
    override val exclCount0 = "هیچ اپی مستثنی نیست — همه از VPN رد می‌شن"
    override val inclCount0 = "چیزی انتخاب نشده — همه از VPN رد می‌شن"
    override val resetSplit = "پاک کردن انتخاب‌ها"
    override val splitApplyHint = "تغییرات دفعه بعد که وصل می‌شی اعمال می‌شه."
    override val theme = "تم"
    override val themeSub = "پالت‌های ملایم · لحظه‌ای اعمال می‌شه"
    override val reinstallSim = "شبیه‌سازی نصب مجدد"
    override val reinstallSimSub =
        "دموی ضدچیت: اپ رو مثل نصب تازه ریست می‌کنه — ولی دوره رایگان روی همین دستگاه مصرف‌شده می‌مونه."
    override val reinstallDoneToast = "اپ ریست شد — ولی وضعیت دوره رایگان دستگاه حفظ شد!"
    override val language = "زبان"
    override val livePingSet = "به‌روزرسانی زنده پینگ"
    override val livePingSetDesc = "اندازه‌گیری دوباره پینگ سرورها هر ۳ ثانیه"
    override val blockQuic = "مرور سریع‌تر (بستن QUIC)"
    override val blockQuicSub = "مرورگر را به HTTP/2 روی TCPِ تونل می‌برد — سرعت باز شدن سایت‌ها بالاتر می‌ره. پیشنهاد: روشن."
    override val about = "درباره اپ"
    override fun aboutLine(v: String) = "میانبر VPN · نسخه $v"
    override val noKey = "نه کلید می‌خواد نه ثبت‌نام؛ نصب کن و وصل شو."
    override val noServers = "هنوز سروری منتشر نشده — ادمین بعداً اضافه می‌کنه."
    override val syncRefresh = "به‌روزرسانی"
    override val syncing = "در حال همگام‌سازی…"
    override val syncNever = "هنوز همگام نشده"
    override fun syncOkAgo(mins: String) = "$mins دقیقه پیش همگام شد"
    override val syncFail = "همگام‌سازی ناموفق"
    override val syncRetry = "برای تلاش دوباره ↻ را بزن"
    override val connectingMsgs = listOf(
        "در حال برقراری تونل امن…",
        "کلیدهای رمزنگاری رد و بدل می‌شن…",
        "اتصالت داره ایمن می‌شه…",
        "تقریباً آماده‌ای…",
    )
    override val scanningMsgs = listOf(
        "در حال بررسی مسیرهای امن…",
        "داریم بهترین میان‌برها رو پیدا می‌کنیم…",
        "چند مسیر جایگزین آماده می‌شه…",
        "داریم شبکه رو بهینه می‌کنیم…",
    )
    override val errPermission = "اجازه اتصال VPN داده نشد"
    override val errNoConfig = "هیچ کانفیگ فعالی موجود نیست"
    override val errSetup = "اول تنظیمات سرور میانبر رو وارد کن"
    override val errServer = "سرور میانبر پیدا نشد؛ آدرس رو بررسی کن"
    override val errNetwork = "ارتباط با سرور ممکن نشد؛ اینترنتت رو بررسی کن"
    override val errGeneric = "اتصال برقرار نشد؛ یک بار دیگه امتحان کن"
    override val setupTitle = "راه‌اندازی اولیه"
    override val setupDesc = "آدرس سرور میانبر و توکن کلاینت رو یک بار وارد کن."
    override val saveBtn = "ذخیره"
    override val savedToast = "ذخیره شد"
    override val yourIp = "آی‌پی تو"
    override fun connectFlash(from: String, to: String) = "از $from به $to وصل شدی"
    override val usageDetails = "جزئیات مصرف"
    override val usageThisMonth = "این ماه"
    override val usageByApp = "به تفکیک اپ"
    override val usageAppSub = "اپ‌هایی که از تونل استفاده کردن"
    override val usageByServer = "به تفکیک سرور"
    override val usageSrvSub = "دیتای ردشده از هر سرور"
    override val updateTitle = "نسخهٔ جدید اومده!"
    override fun updateSub(v: String) = "میانبر نسخهٔ $v منتشر شده — سرورها و فیکس‌های تازه."
    override val updateBtn = "همین حالا آپدیت کن"
    override val updateLater = "بعداً"
    override fun pendingOrders(n: Int) = "$n سفارش در انتظار تأیید داری"
    override val serverOldWarn =
        "سرور نسخهٔ قدیمی است — انتشار کانفیگ و سفارش‌ها به سرور نمی‌رسد. لطفاً پروژه را روی Vercel دوباره Deploy کن."

    override val invite = "دعوت دوستان"
    override val inviteSub = "۳ روز بده، ۳ روز بگیر"
    override val giftNote = "روزهای هدیه به‌شکل زمان پرمیوم به حسابت اضافه می‌شن."
    override val yourCode = "کد معرف تو"
    override val copyBtn = "کپی"
    override val copyLink = "کپی لینک دعوت"
    override val friendsJoined = "دوست دعوت‌شده"
    override val giftDaysLabel = "روز هدیه"
    override fun claimGift(days: Int) = "دریافت $days روز هدیه"
    override val noGiftYet = "هنوز روز هدیه‌ای نداری — یه دوست رو دعوت کن!"
    override val friendJoined = "با کد تو اومد"
    override val friendBought = "پرمیوم خرید"
    override fun daysShort(days: Int) = "+$days روز"
    override val inviteHow = "چطور کار می‌کنه؟"
    override val invStep1 = "کدت رو با دوستات به اشتراک بذار"
    override val invStep2 = "اپ میانبر رو نصب می‌کنن و کدت رو وارد می‌کنن"
    override val invStep3 = "هر دو ۳ روز می‌گیرید — اگه پرمیوم بخره ۷ روز دیگه"
    override val enterCodeTitle = "کد دوستت رو داری؟"
    override val enterCodeSub = "کد معرفش رو وارد کن — هر دو ۳ روز هدیه می‌گیرید"
    override val applyCode = "ثبت"
    override val refOk = "کد ثبت شد — هر دو ۳ روز هدیه گرفتید! 🎁"
    override val refAlready = "شما قبلاً با یک کد ثبت شده‌اید"
    override val refBad = "چنین کدی پیدا نشد"
    override val refSelf = "این کد خودته!"
    override val refOffline = "ارتباط با سرور برقرار نشد — اینترنتت رو چک کن"
    override fun claimedOk(days: Int) = "$days روز پرمیوم به حسابت اضافه شد 🎉"

    override val supportOnline = "پشتیبانی آنلاین"
    override val supportSubChat = "چت با دستیار هوشمند"
    override val chatWith = "چت پشتیبانی"
    override val aiOnline = "دستیار هوشمند · آنلاین"
    override val chatWelcome = "سلام 👋 دستیار میانبرم. هر سوالی داری بپرس — اتصال، پلن‌ها یا حسابت."
    override val chatPlaceholder = "پیامت رو بنویس…"
    override val quick1 = "چطور وصل شم؟"
    override val quick2 = "سرعت کند شده"
    override val quick3 = "چطور پرمیوم بشم؟"
    override val quick4 = "سفارشم کی تأیید می‌شه؟"
    override val aiFailed = "ارتباط با دستیار برقرار نشد — دوباره تلاش کن."
    override val chatHuman = "پاسخ انسانی: @member9 در تلگرام"

    override val tabUpdate = "آپدیت"
    override val updCurVer = "نسخهٔ اعلام‌شده"
    override val updCurSub = "اپ‌ها موقع هر sync نسخهٔ خودشون رو با این مقایسه می‌کنن — اگر کد بزرگ‌تر باشد بنر آپدیت نمایش داده می‌شود."
    override val updPubTitle = "اعلام نسخهٔ جدید"
    override val updVerLabel = "نام نسخه — مثل 1.7.0"
    override val updCodeLabel = "versionCode — عددی بزرگ‌تر از قبلی"
    override val updUrlLabel = "لینک APK (گیتهاب ریلیز)"
    override val updPublish = "انتشار اعلام آپدیت"
    override val updOk = "اعلام شد — کاربران بنر آپدیت می‌بینند 🚀"
    override val updFail = "انتشار ناموفق بود — کلید سرور را چک کن"
    override val updNoKey = "اول در تب سرور، کلید سرور را ست کن"
    override val nTypeLabel = "نوع"
    override val nAudience = "مخاطب"
    override val nDelivery = "روش ارسال"
    override val nSend = "ارسال به کاربران"
    override val kInfo = "اطلاع"
    override val kGift = "هدیه"
    override val kWarn = "هشدار"
    override val kUpdate = "آپدیت"
    override val aAll = "همه"
    override val aFree = "کاربران رایگان"
    override val aPremium = "کاربران پرمیوم"
    override val dInbox = "صندوق"
    override val dPopup = "پاپ‌آپ"
    override val dPush = "نوتیف"

    // ── نسخهٔ ۲ ──
    override val connSection = "محافظت اتصال"
    override val failover = "تعویض خودکار سرور"
    override val failoverSub = "اگه سرور فعلی بمیره، خودکار به بهترین سرور می‌ره"
    override val autoReconn = "اتصال مجدد خودکار"
    override val autoReconnSub = "بعد از تغییر وای‌فای/دیتا دوباره وصل می‌شه"
    override val stealth = "حالت ضد-فیلترینگ"
    override val stealthSub = "حالت سخت‌گیر TLS رو تیکه‌تیکه می‌کنه تا از فیلترینگ سنگین رد شه"
    override val stealthNormal = "عادی"
    override val stealthStrict = "سخت‌گیر"
    override val stealthBadge = "استلث"
    override val blockedTitle = "کلید قطع اضطراری فعال شد"
    override val blockedSub = "اینترنت قطعه تا آی‌پی‌ت لو نره — برای بازگشت لمس کن"
    override val dns = "DNS"
    override val dnsSub = "DNS رمزنگاری‌شده داخل تونل"
    override val dnsAuto = "خودکار"
    override val dnsCf = "کلودفلر DoH"
    override val dnsGoogle = "گوگل DoH"
    override val dnsCustom = "IP دلخواه"
    override val dnsCustomHint = "مثلاً 178.22.122.100"
    override val speedTest = "اسپیدتست"
    override val speedResultSub = "اندازه‌گیری از داخل تونل زنده"
    override val speedPing = "تأخیر"
    override val speedDown = "دانلود"
    override val speedUp = "آپلود"
    override val speedTesting = "در حال تست…"
    override val speedDone = "تموم شد"
    override val speedFail = "تست نشد — اول وصل شو و دوباره امتحان کن"
    override val speedNeedConn = "اول وصل شو — تست از داخل تونل انجام می‌شه"
    override val statusTitle = "وضعیت سرورها"
    override val statusSub = "سلامت هر سرور در همین لحظه"
    override val statusDown = "قطع"
    override val statusLive = "زنده"
    override val importTitle = "ورود کانفیگ"
    override val importLinkTab = "لینک کانفیگ"
    override val importSubTab = "لینک اشتراک"
    override val importLinkHint = "vless:// · vmess:// · trojan:// · ss://"
    override val importSubHint = "https://آدرس-اشتراک-تو"
    override val importName = "نام (اختیاری)"
    override val importDefaultName = "سرور شخصی"
    override val importAdd = "افزودن سرور"
    override val importInvalid = "لینک معتبر به نظر نمی‌رسه — دوباره چک کن"
    override val importFetch = "دریافت سرورها"
    override val importFetching = "در حال دریافت…"
    override val importAdded = "سرور به لیستت اضافه شد"
    override val importSubOk = "سرورها از اشتراک وارد شدن"
    override val importSubFail = "دریافت لینک اشتراک نشد"
    override val qrScan = "اسکن کد QR"
    override val qrPrompt = "دوربین رو روی کد QR کانفیگ بگیر"
    override val qrNote = "مجوز دوربین فقط برای اسکن می‌خواد — هیچ چیزی ذخیره نمی‌شه"
    override val wallet = "کیف پول"
    override val walletSub = "موجودی، کد هدیه و پرداخت‌ها"
    override val walletBalance = "موجودی"
    override val toman = "تومان"
    override val walletTopupNote = "شارژ با کد هدیه از پشتیبانی، یا از تیم بخواه کیف پولت رو شارژ کنه."
    override val walletRedeem = "ردیم کد هدیه"
    override val walletRedeemPh = "مثلاً MB-XXXXXX"
    override val walletRedeemBtn = "ردیم کن"
    override val walletTxs = "تراکنش‌ها"
    override val txTopup = "شارژ کیف پول"
    override val txPay = "خرید پلن"
    override val walletRedeemOk = " تومان به کیف پولت اضافه شد 🎉"
    override val walletRedeemBad = "کد نامعتبره یا قبلاً استفاده شده"
    override val walletPayOk = "از کیف پول پرداخت شد — پرمیوم فعال شد 🎉"
    override val walletPayLow = "موجودی کافی نیست — اول کد هدیه ردیم کن"
    override val walletOff = "ارتباط با کیف پول برقرار نشد — اینترنتت رو چک کن"
    override val promoPh = "کد تخفیف"
    override val promoApply = "اعمال"
    override val promoBad = "کد تخفیف معتبر نیست"
    override val payWallet = "پرداخت با کیف پول · "
    override val walletPayNote = "فعال‌سازی آنی از موجودی کیف پول"
    override val walletOpenRow = "رفتن به کیف پول ←"
    override val quotaWarnCta = "خرید پلن"
    override val expiryWarnCta = "همین حالا تمدید"
    override val usageChart = "۱۴ روز اخیر"
    override val usageChartSub = "مصرف روزانهٔ تونل (گیگابایت)"
    override val chartToday = "امروز"
    override val privacyRow = "حریم خصوصی و بدون لاگ"
    override val privacyRowSub = "چی ذخیره می‌کنیم — و چی هرگز"
    override val privacyTitle = "حریم خصوصی و بدون لاگ"
    override val p1t = "چی ذخیره می‌کنیم"
    override val p1b = "فقط شناسهٔ دستگاه، وضعیت پلن و مصرف کل — همون‌قدر که برای سرویس لازمه. نه اسم، نه ایمیل، نه شماره تلفن."
    override val p2t = "چی هرگز ذخیره نمی‌کنیم"
    override val p2b = "تاریخچهٔ مرور، کوئری‌های DNS، محتوای ترافیک یا IP مقصدها. هیچ لاگی از فعالیتت وجود نداره — چیزی برای فروش نیست، چیزی برای لو دادن نیست."
    override val p3t = "امنیت تونل"
    override val p3b = "ترافیک سرتاسر با Xray رمز می‌شه (VLESS · Reality · TLS). اگه تونل قطع شه، Kill Switch اینترنت رو کور می‌کنه تا آی‌پی‌ت لو نره."
    override val p4t = "کنترل‌های دست تو"
    override val p4b = "تونل‌گذاری انتخابی، DNS رمز دلخواه و انتخاب کامل سرور همیشه دست خودته."
    override val codesTab = "کدها"
    override val codesGift = "کد هدیه"
    override val codesPromo = "کد تخفیف"
    override val codesAmount = "مبلغ (تومان)"
    override val codesPercent = "درصد %"
    override val codesCreate = "ساخت کد"
    override val codesDelete = "حذف"
    override val codesUsed = "مصرف‌شده"
    override val codesCreated = "کد ساخته شد: "

    override fun quotaWarn(pct: Int) = "$pct٪ حجم رایگانت مصرف شده — قبل از تموم شدن یه پلن بگیر"
    override fun expiryWarn(days: Int) = "پلنت $days روز دیگه تموم می‌شه — برای تمدید بزن"
    override fun failoverToast(server: String) = "سرور قطع شد — منتقل شدی به $server"
    override fun promoOk(pct: Int) = "$pct٪ تخفیف اعمال شد 🎉"
}

fun stringsOf(lang: Lang): Strings = if (lang == Lang.FA) FaStrings else EnStrings
