/**
 * پروکسی‌های تلگرام — منبع مشترک کلاینت و پنل مدیریت
 *
 * FALLBACK فقط وقتی استفاده می‌شود که دیتابیس در دسترس نباشد؛ اپ اندروید
 * با پرچم demo:true می‌فهمد این‌ها دادهٔ نمایشی هستند و نباید حتماً وصل شود.
 */

export type TgProxyItem = {
  id: string;
  title: string;
  server: string;
  port: number;
  kind: string;
  secret: string | null;
  country: string | null;
};

export const TG_PROXY_FALLBACK: TgProxyItem[] = [
  {
    id: "tp1",
    title: "پروکسی طلایی تلگرام",
    server: "91.107.213.199",
    port: 443,
    kind: "mtproto",
    secret: "ee1603010200ee1603010200aabbccdd",
    country: "fi",
  },
  {
    id: "tp2",
    title: "پروکسی تلگرام اروپا",
    server: "5.188.206.14",
    port: 8443,
    kind: "mtproto",
    secret: "dd0000000000000aabbccddeeff00112233445566778899aabbccddeeff0011",
    country: "nl",
  },
  {
    id: "tp3",
    title: "پروکسی تلگرام ترکیه",
    server: "soc.mianboor.xyz",
    port: 1080,
    kind: "socks",
    secret: null,
    country: "tr",
  },
];
