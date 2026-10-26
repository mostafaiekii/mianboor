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
│   ├── app/page.tsx        # دموی نئونی وب
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

1. به بخش [Releases](https://github.com/kopersheikhi-jpg/mianboor/releases) برو و آخرین `Mianboor-vX.Y.Z.apk` را دانلود کن.
2. فایل را نصب کن (اجازه «نصب از منابع ناشناس» لازم است).
3. بار اول، دکمه پاور را بزن؛ اگر تنظیمات سرور وارد نشده باشد، صفحه «راه‌اندازی اولیه» باز می‌شود.
4. آدرس سرور و توکن کلاینت را (که مدیر در اختیارت گذاشته) وارد کن — فقط یک بار.

### تنظیمات مدیر داخل اپ

مشابه وب: **۵ بار روی نسخه (Mianboor v1.0.0) در ۴ ثانیه لمس کن** یا **انگشتت را ۱٫۲ ثانیه نگه دار**.

## راه‌اندازی سرور (وب‌اپ)

```bash
bun install
cp .env.example .env   # ADMIN_PASSWORD و CLIENT_TOKEN را تنظیم کن
bun run db:push
bun run dev            # یا deploy روی هر هاست Node
```

- پنل مدیر: در وب‌اپ، ۵ بار روی نسخه در فوتر لمس کن (یا نگه دار) → ورود با `ADMIN_PASSWORD` → افزودن کانفیگ‌ها (هر خط یک لینک).
- API کلاینت: `GET /api/client/configs?token=CLIENT_TOKEN` → فقط کانفیگ‌های فعال.

## تنظیم مقدارهای بیلد اندروید (اختیاری)

می‌توانید آدرس سرور و توکن را در زمان بیلد داخل APK تزریق کنید تا کاربر نیازی به وارد کردن نداشته باشد:

- در تنظیمات ریپو → Secrets and variables → Actions → دو secret بسازید:
  - `MIANOOR_SERVER_URL` — مثل `https://your-server.com`
  - `MIANOOR_CLIENT_TOKEN` — همان مقدار `CLIENT_TOKEN` سرور

اگر ست نشده باشند، کاربر مقادیر را از داخل اپ (تنظیمات مدیر) وارد می‌کند.

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
- ⚠️ توکن کلاینت ذاتاً داخل APK قرار می‌گیرد (مثل هر اپ کلاینت)؛ برای کنترل بیشتر، توکن را از پنل مدیر به‌صورت دوره‌ای عوض کنید.
- ⚠️ در دسترس‌بودن IPv6 بستگی به شبکه دارد؛ مسیرهای IPv4 و IPv6 هر دو به تونل هدایت می‌شوند.

## پشتیبانی

телگرام: [@member9](https://t.me/member9)
