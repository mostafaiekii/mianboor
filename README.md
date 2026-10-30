# میانبر | Mianboor VPN 🚀

اپلیکیشن VPN با رابط نئونی فارسی — «میان‌بر» به اینترنت آزاد.

- 📱 **اپ اندروید**: Kotlin + Compose + هسته Xray (بیلد خودکار APK با GitHub Actions)
- 🌐 **وب‌اپ مدیریت**: پنل مخفی مدیر + API توکن‌محور برای اپ کلاینت (Next.js)
- 🔒 **حریم کانفیگ‌ها**: کاربر نهایی هرگز لینک کانفیگ را نمی‌بیند

## معماری

```
┌─────────────────────┐        ┌──────────────────────────────┐
│   اپ اندروید         │  GET   │  سرور میانبر (Next.js)        │
│  Mianboor Android   │ ─────► │  /api/client/configs?token=… │
│                     │  JSON  │  ┌────────────────────────┐  │
│  [VpnService TUN]   │ ◄───── │  │  دیتابیس (Prisma/SQLite)│  │
│   → hev-socks5-tunnel│       │  │  کانفیگ‌های فعال        │  │
│   → Xray core       │        │  └────────────────────────┘  │
└─────────────────────┘        └──────────────────────────────┘
        ▲                                   ▲
        │ فقط «نام و کشور» دیده می‌شود        │ پنل مخفی مدیر
        │ لینک کانفیگ هرگز نمایش داده نمی‌شود  │ (۵ لمس روی نسخه / نگه‌داشتن ۱٫۲ ثانیه)
```

**زنجیره اتصال در اندروید:**
`VpnService (TUN)` → `hev-socks5-tunnel` → `Xray core` (SOCKS5 محلی ۱۲۷٫۰٫۰٫۱:۱۰۸۰۹) → سرور

- سریع‌ترین سرور به‌صورت خودکار با TCP-ping انتخاب می‌شود؛ کاربر فقط پیام‌های دوستانه می‌بیند.
- پروتکل‌های پشتیبانی‌شده: `vmess` / `vless` (شامل Reality) / `trojan` / `ss` با شبکه‌های tcp، ws، grpc، h2، httpupgrade، xhttp.

## ساختار ریپو

```
├── src/                    # وب‌اپ میانبر (Next.js 16 + Prisma)
│   ├── app/page.tsx        # دموی نئونی وب (قاب گوشی + راهنما)
│   ├── app/api/admin/…     # پنل مدیر (احراز هویت با کوکی HMAC)
│   └── app/api/client/…    # API کلاینت (توکن‌محور، بدون لینک خام در UI)
├── android/                # اپ اندروید (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/mianboor/vpn/
│       ├── MainActivity.kt           # UI نئونی + تریگر مخفی مدیر
│       ├── MianboorVpnService.kt     # VpnService + مدیریت هسته Xray
│       ├── XrayConfigBuilder.kt      # پارسر vmess/vless/trojan/ss → کانفیگ Xray
│       ├── MianboorApi.kt            # دریافت کانفیگ‌ها از سرور (توکن‌محور)
│       ├── ServerTester.kt           # انتخاب سریع‌ترین سرور (TCP ping)
│       └── TProxyService.kt          # پل JNI به hev-socks5-tunnel
└── .github/workflows/android.yml     # بیلد خودکار APK + انتشار در Releases
```

## نصب اپ اندروید

1. به بخش [Releases](https://github.com/mostafaiekii/mianboor/releases) برو و آخرین `Mianboor-vX.Y.Z.apk` را دانلود کن (فعلاً **v1.2.0**).
2. فایل را نصب کن (اجازه «نصب از منابع ناشناس» لازم است).
3. اگر Play Protect هشدار داد: **More details → Install anyway** را بزن. (چرا؟ پایین را بخوان: «هشدارهای نصب و Play Protect»)
4. همین! ✅ آدرس سرور و توکن از قبل داخل APK تزریق شده — دکمه پاور را بزن و وصل شو. هیچ کلیدی لازم نیست.
5. فقط اگر بیلد بدون Secret انجام شده باشد، صفحه «راه‌اندازی اولیه» باز می‌شود و باید آدرس سرور و توکن را یک بار وارد کنی.

### تنظیمات مدیر داخل اپ

در اپ: **انگشتت را ۵ ثانیه روی تب Account نگه دار** → ورود با یوزر/پسورد مدیر.

در تب **Security** پنل، بخش **Server sync key** را با مقدار `ADMIN_PASSWORD` سرور پر کن — از این به بعد کانفیگ‌هایی که اضافه می‌کنی مستقیم روی سرور منتشر می‌شوند.

## راه‌اندازی سرور (وب‌اپ)

```bash
bun install
cp .env.example .env   # ADMIN_PASSWORD و CLIENT_TOKEN را تنظیم کن
bun run db:push
bun run dev            # یا deploy روی هر هاست Node
```

- پنل مدیر: در وب‌اپ، ۵ بار روی نسخه در فوتر لمس کن (یا نگه دار) → ورود با `ADMIN_PASSWORD` → افزودن کانفیگ‌ها (هر خط یک لینک).
- API کلاینت: `GET /api/client/configs?token=CLIENT_TOKEN&plan=free|premium` → کانفیگ‌های فعال مجاز برای آن دسته.

## تنظیم مقدارهای بیلد اندروید (اختیاری)

می‌توانید آدرس سرور و توکن را در زمان بیلد داخل APK تزریق کنید تا کاربر نیازی به وارد کردن نداشته باشد:

- در تنظیمات ریپو → Secrets and variables → Actions → دو secret بسازید:
  - `MIANOOR_SERVER_URL` — مثل `https://your-server.com`
  - `MIANOOR_CLIENT_TOKEN` — همان مقدار `CLIENT_TOKEN` سرور

اگر ست نشده باشند، کاربر مقادیر را از داخل اپ (تنظیمات مدیر) وارد می‌کند.

برای امضای release (کاهش هشدارهای Play Protect بین آپدیت‌ها) این secret‌ها هم تنظیم شده‌اند:
- `MB_KEYSTORE_BASE64` — فایل keystore به‌صورت base64
- `MB_STORE_PASSWORD` / `MB_KEY_ALIAS` / `MB_KEY_PASSWORD`

بدون این secret‌ها بیلد با کلید debug امضا می‌شود (نصب‌پذیر، ولی ثبات امضا بین نسخه‌ها کمتر است).

## همگام‌سازی کانفیگ‌ها (توزیع هدفمند)

کانفیگ‌ها از پنل مخفی اپ مدیر مستقیم **روی سرور منتشر می‌شوند** و همه گوشی‌ها همان لحظه (اپ start شود یا تب Servers باز شود) آن‌ها را می‌گیرند:

- هر کانفیگ یک دسته دارد: **رایگان** یا **پرمیوم** (کلید تاج 👑 در تب Configs پنل).
- کاربر **رایگان** فقط کانفیگ‌های رایگان را دریافت می‌کند — لینک پرمیوم هرگز به دستگاهش حتی نمی‌رسد.
- کاربر **پرمیوم** همه کانفیگ‌ها را می‌گیرد؛ بعد از Approve شدن سفارشش، لیست بلافاصله رفرش می‌شود.
- خاموش/روشن‌کردن، حذف و تغییر دسته در پنل ادمین، هم روی سرور اعمال می‌شود و هم بقیه دستگاه‌ها.

## هشدارهای نصب و Play Protect

وقتی APK را از خارج از فروشگاه نصب می‌کنی، اندروید/Play Protect به هر حال هشدار می‌دهد. این کارها ریسک را کم می‌کند:

1. **امضای ثابت release**: همه نسخه‌ها با یک keystore امضا می‌شوند (بالا را ببین) — Play Protect به اپ‌های با امضای ثابت و نسخه‌بندی منظم اعتماد بیشتری می‌کند. اپ‌های debug-signed زودتر پرچم می‌خورند.
2. مسیر کاربر برای نصب: **More details → Install anyway** یا Play Protect → آیکن چرخ‌دنده → خاموش‌کردن «Scan apps with Play Protect» (فقط اگر مطمئنی).
3. مسیر قطعی: انتشار روی Google Play (هزینه ثبت توسعه‌دهنده) یا مارکت‌های ایرانی مثل کافه‌بازار/مایکت — هشدارها کامل حذف می‌شود.

## بیلد دستی APK

```bash
cd android
./gradlew :app:assembleRelease \
  -PMIANOOR_SERVER_URL="https://your-server.com" \
  -PMIANOOR_CLIENT_TOKEN="your-token"
# خروجی: app/build/outputs/apk/release/app-release.apk
```

> نیازمندی: JDK 17. کتابخانه‌های نیتیو (`libhev-socks5-tunnel.so` و `libxray.so`) در CI دانلود/ساخت می‌شوند و در ریپو قرار نمی‌گیرند.

## امنیت

- ✅ `.env`، دیتابیس و هر مقدار محرمانه در گیت **commite نمی‌شوند**.
- ✅ لینک کانفیگ فقط در حافظه اپ نگه داشته می‌شود و در UI رندر نمی‌شود.
- ✅ APK release با keystore ثابت (GitHub Secrets) امضا می‌شود؛ خود keystore در گیت قرار نمی‌گیرد.
- ⚠️ توکن کلاینت ذاتاً داخل APK قرار می‌گیرد (مثل هر اپ کلاینت)؛ برای کنترل بیشتر، توکن را از پنل مدیر به‌صورت دوره‌ای عوض کنید.
- ⚠️ در دسترس‌بودن IPv6 بستگی به شبکه دارد؛ مسیرهای IPv4 و IPv6 هر دو به تونل هدایت می‌شوند.

## پشتیبانی

телگرام: [@member9](https://t.me/member9)

---

🌐 دموی وب: [mianboor.vercel.app](https://mianboor.vercel.app) · 📦 آخرین نسخه: [Releases](https://github.com/mostafaiekii/mianboor/releases/latest)
