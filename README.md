# میانبر | Mianboor VPN 🚀

اپلیکیشن VPN با رابط نئونی فارسی — «میان‌بر» به اینترنت آزاد.

- 📱 **اپ اندروید**: Kotlin + Compose + هسته Xray (بیلد خودکار APK با GitHub Actions)
- 🌐 **سرور میانبر**: API توکن‌محور برای اپ کلاینت (Next.js)
- 🔒 **حریم کانفیگ‌ها**: کاربر نهایی هرگز لینک کانفیگ را نمی‌بیند

## امکانات اپ

- اتصال یک‌لمسی + انتخاب خودکار سریع‌ترین سرور (TCP-ping) و پینگ زنده هر ۳ ثانیه
- ۵ گیگ رایگان ماهانه، مقاوم در برابر نصب مجدد؛ پلن‌های نامحدود ۱/۳/۶ ماهه
- Split Tunneling (Exclude / Include)، Kill Switch، اتصال خودکار روی وای‌فای ناامن
- دوزبانه (فارسی/انگلیسی) + تم‌های ملایم
- نمایش آی‌پی کاربر و کشور مقصد بعد از اتصال، مصرف دیتا به تفکیک اپ و سرور
- دعوت دوستان (رفرال)، پیام‌های داخل اپ، چت پشتیبانی و آپدیت خودکار

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
        ▲
        │ فقط «نام و کشور» دیده می‌شود
        │ لینک کانفیگ هرگز نمایش داده نمی‌شود
```

**زنجیره اتصال در اندروید:**
`VpnService (TUN)` → `hev-socks5-tunnel` → `Xray core` (SOCKS5 محلی ۱۲۷٫۰٫۰٫۱:۱۰۸۰۹) → سرور

- پروتکل‌های پشتیبانی‌شده: `vmess` / `vless` (شامل Reality) / `trojan` / `ss` با شبکه‌های tcp، ws، grpc، h2، httpupgrade، xhttp.

## ساختار ریپو

```
├── src/                    # وب‌اپ میانبر (Next.js 16 + Prisma)
│   ├── app/page.tsx        # دموی نئونی وب (قاب گوشی + راهنما)
│   └── app/api/…           # APIهای سرور (کلاینت توکن‌محور، بدون لینک خام در UI)
├── android/                # اپ اندروید (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/mianboor/vpn/
│       ├── MainActivity.kt           # UI نئونی
│       ├── MianboorVpnService.kt     # VpnService + مدیریت هسته Xray
│       ├── XrayConfigBuilder.kt      # پارسر vmess/vless/trojan/ss → کانفیگ Xray
│       ├── MianboorApi.kt            # دریافت کانفیگ‌ها از سرور (توکن‌محور)
│       ├── ServerTester.kt           # انتخاب سریع‌ترین سرور (TCP ping)
│       └── TProxyService.kt          # پل JNI به hev-socks5-tunnel
└── .github/workflows/android.yml     # بیلد خودکار APK + انتشار در Releases
```

## نصب اپ اندروید

1. به بخش [Releases](https://github.com/mostafaiekii/mianboor/releases) برو و آخرین `Mianboor-vX.Y.Z.apk` را دانلود کن (فعلاً **v1.6.0**).
2. فایل را نصب کن (اجازه «نصب از منابع ناشناس» لازم است).
3. اگر Play Protect هشدار داد: **More details → Install anyway** را بزن. (چرا؟ پایین را بخوان: «هشدارهای نصب و Play Protect»)
4. همین! ✅ آدرس سرور و توکن از قبل داخل APK تزریق شده — دکمه پاور را بزن و وصل شو. هیچ کلیدی لازم نیست.
5. کانفیگ‌های جدید به‌صورت خودکار در استارت اپ، هنگام باز کردن بخش سرورها و با دکمهٔ رفرش به همهٔ گوشی‌ها می‌رسد.

## راه‌اندازی سرور (وب‌اپ)

```bash
bun install
cp .env.example .env   # متغیرهای محرمانه را تنظیم کن
bun run db:push
bun run dev            # یا deploy روی هر هاست Node
```

- مقادیر محرمانه (توکن‌ها و رمزها) فقط از طریق Environment Variables روی هاست و GitHub Secrets مدیریت می‌شوند و هیچ پیش‌فرضی در کد یا مستندات قرار نمی‌گیرد.
- API کلاینت: `GET /api/client/configs?token=CLIENT_TOKEN&device=MB-…` → کانفیگ‌های فعال مجاز برای آن دستگاه + وضعیت پلن و اطلاعات پرداخت.
- پس از پرداخت، پلن کاربر توسط تیم میانبر فعال می‌شود؛ پیگیری: [@member9](https://t.me/member9).

## تنظیم مقدارهای بیلد اندروید (اختیاری)

از نسخهٔ **v1.5.0** آدرس سرور و توکن کلاینت به‌صورت پیش‌فرض امن داخل APK تزریق می‌شوند — یعنی حتی بدون هیچ Secret، همگام‌سازی کانفیگ‌ها خودکار کار می‌کند.

Secretها فقط برای «تغییر سرور» یا «چرخاندن توکن» لازم‌اند (repo → Settings → Secrets and variables → Actions):

- `MIANOOR_SERVER_URL` — مثل `https://your-server.com`
- `MIANOOR_CLIENT_TOKEN` — همان مقدار `CLIENT_TOKEN` سرور
- `MIANOOR_ADMIN_KEY` — کلید انتشار سمت سرور

⚠️ اگر `CLIENT_TOKEN` را روی سرور عوض کردید، حتماً secret `MIANOOR_CLIENT_TOKEN` را در GitHub هم همان مقدار بگذارید و تگ جدید بزنید، وگرنه اپ با توکن قدیمی 401 می‌گیرد.

برای امضای release (کاهش هشدارهای Play Protect بین آپدیت‌ها) این secret‌ها تنظیم شده‌اند:
- `MB_KEYSTORE_BASE64` — فایل keystore به‌صورت base64
- `MB_STORE_PASSWORD` / `MB_KEY_ALIAS` / `MB_KEY_PASSWORD`

بدون این secret‌ها بیلد با کلید debug امضا می‌شود (نصب‌پذیر، ولی ثبات امضا بین نسخه‌ها کمتر است).

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

- ✅ `.env`، دیتابیس و هر مقدار محرمانه در گیت **commite نمی‌شوند** و پیش‌فرض محرمانه‌ای در کد/مستندات منتشر نمی‌شود.
- ✅ لینک کانفیگ فقط در حافظه اپ نگه داشته می‌شود و در UI رندر نمی‌شود.
- ✅ APK release با keystore ثابت (GitHub Secrets) امضا می‌شود؛ خود keystore در گیت قرار نمی‌گیرد.
- ⚠️ توکن کلاینت ذاتاً داخل APK قرار می‌گیرد (مثل هر اپ کلاینت)؛ برای کنترل بیشتر توکن را به‌صورت دوره‌ای عوض کنید.
- ⚠️ در دسترس‌بودن IPv6 بستگی به شبکه دارد؛ مسیرهای IPv4 و IPv6 هر دو به تونل هدایت می‌شوند.

## پشتیبانی

تلگرام: [@member9](https://t.me/member9)

---

🌐 دموی وب: [mianboor.vercel.app](https://mianboor.vercel.app) · 📦 آخرین نسخه: [Releases](https://github.com/mostafaiekii/mianboor/releases/latest)
