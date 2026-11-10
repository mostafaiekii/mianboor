# میانپور — نسخهٔ ویندوز

نسخهٔ ویندوزِ اپ میانپور: همون هستهٔ **Xray**، همون پینگِ **واقعی**، با یک کلیک وصل می‌شه.

## دانلود

از صفحهٔ [Releases](https://github.com/mostafaiekii/mianboor/releases) تگ `win-v*` — فایل `Mianboor-Windows-x.y.z.zip`.

## نصب

1. زیپ رو باز کنید (Extract)
2. `Mianboor.exe` رو اجرا کنید
3. ویندوز چون اپ امضای دیجیتال نداره هشدار می‌ده: **More info → Run anyway**

## چطور کار می‌کنه

- اپ یک پروسهٔ `xray.exe` لوکال بالا میاره (پورت‌های `SOCKS 127.0.0.1:10808` و `HTTP 127.0.0.1:10809` — در صورت اشغال، پورت آزاد بعدی)
- «تنظیم خودکار پروکسی ویندوز» مثل v2rayN رجیستری WinINet رو ست می‌کنه و مرورگرها/بیشتر برنامه‌ها فوری ازش رد می‌شن
- **پینگ واقعی**: برای هر کانفیگ یک هستهٔ موقت بالا میاد و از دلِ تونل درخواست HTTPS به `generate_204` می‌ره — عدد یعنی تونل واقعاً ترافیک رد کرده؛ «✗» یعنی TCP بازه ولی تونل کار نمی‌کنه
- بستنِ پنجره اپ رو نمی‌بنده — در تری می‌مونه تا اتصال قطع نشه؛ خروج کامل از منوی تری
- موقع خروج، پروکسی سیستم خودکار برمی‌گرده (اینترنت شما خراب نمی‌مونه)

## افزودن کانفیگ

- لینک مستقیم: `vmess://` / `vless://` / `trojan://` / `ss://` — هر خط یکی
- یا آدرس سابسکریپشن (`https://…`)

## ساخت از سورس (ویندوز یا لینوکس)

```bash
cd windows-app
npm install
# باینری Xray ویندوز x64 را داخل پوشهٔ xray/ بریزید (xray.exe + geoip.dat + geosite.dat)
npx electron-packager . Mianboor --platform=win32 --arch=x64 --out=build --overwrite --icon=assets/icon.ico --prune=true --ignore="^/build" --ignore="^/test" --ignore="^/xray/xray$"
```

یا در گیت‌هاب: **Actions → Build Mianboor Windows → Run workflow** و نسخه رو وارد کنید — خودش release می‌سازه.

## تست

```bash
npm test        # پارسر + پینگ واقعی E2E (باینری xray لینوکس لازم دارد)
```
