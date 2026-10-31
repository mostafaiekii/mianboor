/**
 * دستیار هوشمند — لایهٔ مشترک چت پشتیبانی.
 *
 * ۱) اگر ZAI_BASE_URL / ZAI_API_KEY در محیط ست باشد → درخواست مستقیم
 *    با همان پروتکل z-ai-web-dev-sdk (production یا هر OpenAI-compatible gateway).
 * ۲) وگرنه SDK با فایل کانفیگ (محیط محلی).
 * ۳) اگر هیچ‌کدام در دسترس نبود → پاسخ‌دهندهٔ قانون‌محور (rules engine) با
 *    دانش واقعی محصول — سریع، امن و بی‌نیاز از اینترنت خارجی.
 */

type ChatMessage = { role: string; content: string };

/** بعد از هر شکست گیت‌وی، این مدت دوباره تلاش نکن (به‌ازای هر instance) */
const COOLDOWN_MS = 15 * 60 * 1000;
let gatewayDownUntil = 0;

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { thinking?: { type: string } } = {},
): Promise<string> {
  const base = (process.env.ZAI_BASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.ZAI_API_KEY ?? "";

  if (base && key && Date.now() >= gatewayDownUntil) {
    // ── مسیر مستقیم — همان پروتکل z-ai-web-dev-sdk ──
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Z-AI-From": "Z",
    };
    if (process.env.ZAI_CHAT_ID) headers["X-Chat-Id"] = process.env.ZAI_CHAT_ID;
    if (process.env.ZAI_USER_ID) headers["X-User-Id"] = process.env.ZAI_USER_ID;
    if (process.env.ZAI_TOKEN) headers["X-Token"] = process.env.ZAI_TOKEN;

    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(8_000), // fail fast — کاربر منتظر نمی‌ماند
        body: JSON.stringify({
          messages,
          thinking: opts.thinking ?? { type: "disabled" },
        }),
      });
      if (!res.ok) {
        gatewayDownUntil = Date.now() + COOLDOWN_MS;
        throw new Error(`AI request failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) throw new Error("empty reply");
      return reply;
    } catch (err) {
      gatewayDownUntil = Date.now() + COOLDOWN_MS;
      throw err;
    }
  }

  // ── fallback: SDK با فایل کانفیگ (محیط محلی) ──
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: opts.thinking ?? { type: "disabled" },
  });
  const reply =
    (completion as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) throw new Error("empty reply");
  return reply;
}

/* ------------------------------------------------------------------ */
/* پاسخ‌دهندهٔ قانون‌محور — چایک‌بکِ سریع پشتیبانی برای production       */
/* ------------------------------------------------------------------ */

const TG = "@member9";

export function supportFallback(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = (last?.content ?? "").toLowerCase();
  if (!q.trim()) return "";
  const isFa = /[\u0600-\u06FF]/.test(last?.content ?? "");

  const has = (...words: string[]) => words.some((w) => q.includes(w));

  // اتصال
  if (has("connect", "وصل", "اتصال", "اتصال نمیشه", "وصل نمیشم", "کانکت")) {
    return isFa
      ? "برای اتصال: سرورهای صفحهٔ «سرورها» رو باز کن، سریع‌ترین رو انتخاب کن و بعد دکمهٔ روشن‌کنندهٔ صفحهٔ اصلی رو بزن. اتصال نداشت؟ اینترنتت رو چک کن، اپ رو ببند و باز کن یا یه سرور دیگه امتحان کن. اگر باز حل نشد، همین‌جا بگو چه خطایی می‌بینی 🙏"
      : "To connect: open the Servers screen, pick the fastest one, then tap the power button on Home. If it fails, check your internet, restart the app, or try another server. Still stuck? Tell me the error you see 🙏";
  }

  // سرعت
  if (has("slow", "کند", "سرعت", "speed")) {
    return isFa
      ? "برای سرعت بهتر: پینگ‌ها هر ۳ ثانیه به‌روز می‌شن — سروری با کمترین پینگ انتخاب کن یا از «اتصال هوشمند» استفاده کن که خودش بهترین سرور رو پیدا می‌کنه. اگر همه کند بودن، ساعت دیگه‌ای دوباره امتحان کن."
      : "For better speed: pings refresh every 3s — pick the lowest-ping server or use Smart Connect, which picks the best one automatically. If everything is slow, try again at a different time.";
  }

  // پرمیوم / خرید
  if (has("premium", "پرمیوم", "خرید", "بخرم", "upgrade", "buy", "plan", "پلن", "تعرفه", "قیمت", "price", "cost")) {
    return isFa
      ? "پلن‌ها: ۱ ماهه ۲۰۰ هزار تومان · ۳ ماهه ۴۰۰ هزار تومان (پیشنهاد ما) · ۶ ماهه ۷۰۰ هزار تومان (به‌صرفه‌ترین). پرمیوم یعنی حجم نامحدود + همهٔ سرورها. مسیر: حساب → ارتقا به پرمیوم → کارت‌به‌کارت → رسید رو در تلگرام " + TG + " بفرست."
      : "Plans: 1 month 200k · 3 months 400k (most popular) · 6 months 700k Toman (best value). Premium = unlimited data + all servers. Path: Account → Go Premium → card-to-card → send the receipt on Telegram " + TG + ".";
  }

  // سفارش / فعال‌سازی
  if (has("order", "سفارش", "تایید", "تأیید", "فعال", "approve", "activation", "receipt", "رسید")) {
    return isFa
      ? "سفارش‌ها معمولاً خیلی زود بررسی می‌شن. وضعیتش رو از بخش «حساب» دنبال کن؛ اگر عجله داری، شمارهٔ سفارش و رسید پرداخت رو به " + TG + " بفرست تا سریع فعالش کنیم."
      : "Orders are reviewed quickly. Track the status in the Account section; if you're in a hurry, send the order number and receipt to " + TG + " and we'll activate it right away.";
  }

  // رفرال
  if (has("referral", "دعوت", "معرف", "هدیه", "invite", "friend", "دوست", "gift")) {
    return isFa
      ? "دعوت دوستان: در «حساب → دعوت دوستان» کد معرف خودت رو کپی کن و بده به دوستت. او کد رو توی اپ وارد می‌کنه و هر دو ۳ روز پرمیوم هدیه می‌گیرید — اگر دوستت پرمیوم بخره، ۷ روز هم اضافه می‌گیری 🎁"
      : "Referral: Account → Invite Friends → copy your code and share it. Your friend enters it in the app and you BOTH get 3 premium gift days — plus 7 more if they go Premium 🎁";
  }

  // سرورها
  if (has("server", "سرور", "کشور", "country", "location", "لوکیشن")) {
    return isFa
      ? "سرورهای استاندارد: هلند، آلمان، فنلاند، فرانسه، سوئد. سرورهای پرمیوم: انگلیس، ترکیه، آمریکا، امارات، سنگاپور، کانادا، ژاپن. لیست سرورها با پینگ زنده مرتب می‌شه و «اتصال هوشمند» بهترین رو انتخاب می‌کنه."
      : "Standard servers: Netherlands, Germany, Finland, France, Sweden. Premium servers: UK, Turkey, USA, UAE, Singapore, Canada, Japan. The list is sorted by live ping and Smart Connect picks the best automatically.";
  }

  // مصرف / حجم
  if (has("usage", "مصرف", "حجم", "quota", "data", "گیگ", "gb", "5")) {
    return isFa
      ? "پلن رایگان ماهی ۵ گیگه و به شناسهٔ دستگاه قفله (نصب مجدد اپ ریستش نمی‌کنه). مصرفت رو از «حساب → مصرف داده» ببین. برای حجم نامحدود، پرمیوم بخر."
      : "The free tier is 5 GB per month, bound to your device ID (reinstalling won't reset it). Check usage in Account → Data Usage. For unlimited data, go Premium.";
  }

  // آپدیت
  if (has("update", "آپدیت", "به‌روز", "نسخه", "version")) {
    return isFa
      ? "آپدیت‌ها داخل خود اپ اعلام می‌شن — بنر «نسخهٔ جدید اومده» رو که دیدی، بزن روی «همین حالا آپدیت کن» تا APK جدید دانلود و نصب بشه."
      : "Updates are announced inside the app — when you see the \"New version\" banner, tap \"Update now\" and the new APK downloads and installs automatically.";
  }

  // سلام / تشکر
  if (has("سلام", "درود", "hi", "hello", "hey", "salam") && q.length < 30) {
    return isFa
      ? "سلام! 👋 دستیار میانبرم. هر سوالی دربارهٔ اتصال، سرورها، پلن‌ها یا حسابت داری بپرس."
      : "Hi! 👋 I'm the Mianboor assistant. Ask me anything about connecting, servers, plans, or your account.";
  }
  if (has("ممنون", "مرسی", "thanks", "thank you", "تشکر")) {
    return isFa ? "خواهش می‌کنم! 🙌 اگر چیز دیگه‌ای لازم داشتی در خدمتم." : "You're welcome! 🙌 Ping me anytime.";
  }

  // پاسخ عمومی
  return isFa
    ? "این رو دقیق نمی‌دونم، ولی تیم میانبر در تلگرام " + TG + " خیلی سریع جواب می‌ده. دربارهٔ اتصال، سرورها، مصرف، خرید پرمیوم یا دعوت دوستان هم می‌تونی همین‌جا ازم بپرسی 🙂"
    : "I'm not sure about that one — the Mianboor team on Telegram " + TG + " will help you quickly. You can also ask me here about connecting, servers, usage, Premium, or referrals 🙂";
}
