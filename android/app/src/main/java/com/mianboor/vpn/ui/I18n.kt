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
}

fun stringsOf(lang: Lang): Strings = if (lang == Lang.FA) FaStrings else EnStrings
