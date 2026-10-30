import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * دموی چت پشتیبانی هوشمند میانبر.
 * دستیار فقط از اطلاعات واقعی محصول جواب می‌ده و سؤال‌های انسانی
 * (پرداخت، فعال‌سازی دستی، ریفاند) رو به تلگرام ادمین (@member9) ارجاع می‌ده.
 */
const SYSTEM = `You are the in-app support assistant for "Mianboor VPN" (میانبر), an Android VPN app powered by Xray-core. Be friendly, concise and helpful.

Facts you must rely on (never invent features beyond these):
- Free tier: 5 GB per month, bound to the device ID (reinstalling the app does NOT reset it).
- Plans: 1 month = 200,000 Toman · 3 months = 400,000 Toman (most popular) · 6 months = 700,000 Toman (best value). Premium = unlimited data + all servers.
- Buying flow: Account → Go Premium → pick a plan → card-to-card payment → send the receipt on Telegram @member9 → the admin approves → premium activates on the device.
- Servers: Netherlands (Amsterdam), Germany (Frankfurt), Finland (Helsinki) are standard; UK (London), Turkey (Istanbul), USA (New York) are premium-only. Pings refresh live every 3 seconds and the list is sorted by lowest ping. Smart Connect picks the fastest available server.
- Features: Kill Switch, Auto Connect on unsecured Wi-Fi, Split Tunneling (exclude/include apps), soft themes (light/dark), Persian & English UI, invite friends (referral: 3 gift days per friend, +7 more if they buy premium), this AI support chat.
- Troubleshooting: slow speed → pick a server with lower ping or use Smart Connect; can't connect → check your internet, toggle off/on, try another server; servers missing → tap the refresh button on the Servers screen; premium not active → your order may still be pending, contact @member9.

Rules:
- Reply in the SAME language as the user's last message (Persian or English). Persian replies must sound natural and casual (like the app's tone).
- Keep answers SHORT: 1-4 sentences or a small list. Never write long essays.
- For anything requiring the human admin (payment issues, manual activation, refunds) → point them to Telegram @member9.
- If you genuinely don't know, say so and offer @member9.`;

type CMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let body: { lang?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reply: "" }, { status: 400 });
  }

  /* فقط پیام‌های معتبر، کوتاه‌شده — آخرین ۱۲ پیام */
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const clean: CMsg[] = raw
    .filter(
      (m): m is CMsg =>
        !!m &&
        typeof m === "object" &&
        ((m as CMsg).role === "user" || (m as CMsg).role === "assistant") &&
        typeof (m as CMsg).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
    .slice(-12);

  const last = clean[clean.length - 1];
  if (!last || last.role !== "user") {
    return NextResponse.json({ ok: false, reply: "" }, { status: 400 });
  }

  const langNote =
    body.lang === "fa"
      ? "The user's app language is Persian (فارسی)."
      : "The user's app language is English.";

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "assistant", content: `${SYSTEM}\n${langNote}` }, ...clean],
      thinking: { type: "disabled" },
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("empty reply");
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    console.error("support-chat failed:", err);
    return NextResponse.json({ ok: false, reply: "" }, { status: 200 });
  }
}
