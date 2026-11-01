/**
 * مینی‌سرویس ربات تلگرام مین‌بوور
 * - grammY + long-polling (getUpdates)
 * - پورت health: 3031 (قابل تغییر با .env / PORT)
 * - بدون توکن → کرش نمی‌کند؛ فقط /health بالا می‌ماند و لاگ «حالت خواب» می‌دهد
 */
import { Bot } from "grammy";

const PORT = Number(process.env.PORT ?? 3031);
const API_BASE = (process.env.API_BASE ?? "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
const configured = TOKEN.length > 0;

const DEMO_USER = "demo-user";
const API_TIMEOUT_MS = 6000;
const POLL_RETRY_MS = 3000;

// ---------- ابزارهای کمکی ----------
const faFmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const fa = (n: number) => faFmt.format(n);

/** اولین مقدار موجود بین کلیدهای پیشنهادی را برمی‌گرداند (شکل پاسخ APIها متفاوت است) */
function pick(obj: any, keys: string[]): any {
  for (const o of [obj, obj?.data, obj?.result]) {
    if (o && typeof o === "object") {
      for (const k of keys) {
        if (o[k] !== undefined && o[k] !== null) return o[k];
      }
    }
  }
  return undefined;
}

function money(v: any): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return `${fa(v)} تومان`;
  if (typeof v === "string" && v.trim()) return /^[\d.,\s]+$/.test(v) ? `${fa(Number(v.replace(/,/g, "")))} تومان` : v;
  return null;
}

function faPercent(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `${faFmt.format(v)}٪`;
}

/** فراخوانی داخلی API اپ اصلی با هدر demo-user و تایم‌اوت */
async function api(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "x-demo-user": DEMO_USER, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

// ---------- سرور health ----------
try {
  Bun.serve({
    port: PORT,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        return Response.json({ ok: true, configured, port: PORT });
      }
      return Response.json({ ok: false, error: "not found" }, { status: 404 });
    },
  });
  console.log(`[telegram-bot] /health روی پورت ${PORT} بالا آمد — توکن: ${configured ? "تنظیم شده ✅" : "تنظیم نشده ❌"}`);
} catch (e) {
  // در حالت bun --hot ممکن است سرور قبلی هنوز روی همان پورت باشد
  console.warn("[telegram-bot] راه‌اندازی مجدد health — احتمالاً سرور قبلی فعال است:", e);
}

// ---------- ربات ----------
async function startBot(): Promise<never> {
  const bot = new Bot(TOKEN);

  bot.catch((err) => console.error("[telegram-bot] خطای هندلر:", err.error));

  bot.command("start", (ctx) =>
    ctx.reply(
      "سلام! 👋 به ربات مین‌بوور خوش اومدی.\n\n" +
        "این دستورها رو دارم:\n" +
        "📊 /status — وضعیت اشتراک و کیف پول\n" +
        "🖥 /servers — وضعیت سرورها\n" +
        "🎁 /gift <کد> — فعال‌کردن کد هدیه\n" +
        "♻️ /renew — تمدید اشتراک\n\n" +
        "هر سوالی داشتی همین‌جا پیام بده 😊",
    ),
  );

  bot.command("status", async (ctx) => {
    const [usage, wallet] = await Promise.allSettled([api("/api/client/usage"), api("/api/client/wallet")]);
    const lines: string[] = ["📊 وضعیت اشتراک شما:\n"];

    if (usage.status === "fulfilled" && usage.value.ok && usage.value.json?.ok !== false) {
      const j = usage.value.json;
      const percent = pick(j, ["percent", "usagePercent", "usedPercent", "used", "usage"]);
      const daysLeft = pick(j, ["daysLeft", "daysRemaining", "remainingDays", "days"]);
      if (typeof percent === "number") lines.push(`• مصرف: ${faPercent(percent)}`);
      if (daysLeft !== undefined) lines.push(`• روزهای باقی‌مانده: ${fa(Number(daysLeft))} روز`);
    }
    if (wallet.status === "fulfilled" && wallet.value.ok && wallet.value.json?.ok !== false) {
      const bal = money(pick(wallet.value.json, ["balance", "amount", "credit", "walletBalance"]));
      if (bal) lines.push(`• موجودی کیف پول: ${bal}`);
    }

    if (lines.length === 1) {
      return ctx.reply("فعلاً نمی‌تونم وضعیت رو بگیرم 🙁 کمی بعد دوباره امتحان کن.");
    }
    return ctx.reply(lines.join("\n"));
  });

  bot.command("servers", async (ctx) => {
    let r: Awaited<ReturnType<typeof api>> | null = null;
    try {
      r = await api("/api/client/servers/status");
    } catch {
      r = null;
    }

    const j = r?.json;
    const raw: unknown = Array.isArray(j)
      ? j
      : Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j?.servers)
          ? j.servers
          : Array.isArray(j?.items)
            ? j.items
            : null;

    if (!r || !r.ok || !Array.isArray(raw) || raw.length === 0) {
      return ctx.reply("فعلاً نمی‌تونم لیست سرورها رو بگیرم 🙁 کمی بعد دوباره امتحان کن.");
    }

    const lines = (raw as any[]).map((s) => {
      const name = pick(s, ["name", "title", "region", "location", "id"]) ?? "سرور";
      const aliveVal = pick(s, ["alive", "online", "healthy", "up"]);
      const statusVal = typeof pick(s, ["status", "state"]) === "string" ? String(pick(s, ["status", "state"])).toLowerCase() : null;
      const dot = typeof aliveVal === "boolean" ? (aliveVal ? "🟢" : "🔴") : statusVal ? (["up", "online", "alive", "ok", "healthy"].includes(statusVal) ? "🟢" : "🔴") : "⚪️";
      const upt = pick(s, ["uptime", "uptimePercent", "uptime_percent"]);
      const uptStr = typeof upt === "number" && Number.isFinite(upt) ? ` — آپ‌تایم ${faPercent(upt <= 1 ? upt * 100 : upt)}` : "";
      return `${dot} ${name}${uptStr}`;
    });

    return ctx.reply(`🖥 وضعیت سرورها:\n\n${lines.join("\n")}`);
  });

  bot.command("gift", async (ctx) => {
    const code = ctx.message?.text?.split(/\s+/).slice(1).join(" ").trim();
    if (!code) {
      return ctx.reply("کد هدیه رو هم بنویس 🙂\nمثال: /gift NOWRUZ1404");
    }

    let r: Awaited<ReturnType<typeof api>> | null = null;
    try {
      r = await api("/api/client/wallet/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {
      r = null;
    }

    const apiError = r?.json && typeof r.json.error === "string" && r.json.error.trim() ? r.json.error : null;
    if (!r || !r.ok || r.json?.ok === false) {
      return ctx.reply(apiError ? `⛔️ ${apiError}` : "⛔️ فعال‌سازی کد انجام نشد — کد رو چک کن و دوباره امتحان کن.");
    }

    const amount = money(pick(r.json, ["amount", "value", "credit", "balance"]));
    return ctx.reply(
      amount ? `🎁 تبریک! مبلغ ${amount} به کیف پولت اضافه شد ✅` : "🎁 کد با موفقیت فعال شد و به کیف پولت اضافه شد ✅",
    );
  });

  bot.command("renew", async (ctx) => {
    let r: Awaited<ReturnType<typeof api>> | null = null;
    try {
      r = await api("/api/client/renew", { method: "POST" });
    } catch {
      r = null;
    }

    const apiError = r?.json && typeof r.json.error === "string" && r.json.error.trim() ? r.json.error : null;
    if (!r || !r.ok || r.json?.ok === false) {
      return ctx.reply(apiError ? `⛔️ تمدید انجام نشد: ${apiError}` : "⛔️ تمدید انجام نشد — فعلاً نمی‌تونم به سرور وصل بشم. کمی بعد دوباره امتحان کن 🙏");
    }

    const plan = pick(r.json, ["plan", "planName"]);
    const days = pick(r.json, ["days", "durationDays"]);
    const amount = money(pick(r.json, ["amount", "price", "cost"]));

    const lines: string[] = ["✅ تمدید انجام شد!\n"];
    if (plan !== undefined) lines.push(`• پلن: ${plan}`);
    if (days !== undefined) lines.push(`• مدت: ${fa(Number(days))} روز`);
    if (amount) lines.push(`• مبلغ: ${amount}`);
    return ctx.reply(lines.length > 1 ? lines.join("\n") : "✅ تمدید با موفقیت انجام شد.");
  });

  // هر متن ناشناخته‌ای → راهنما
  bot.on("message:text", (ctx) =>
    ctx.reply("🤔 این دستور رو نمی‌شناسم!\nبرای دیدن لیست دستورها /start رو بزن 😊"),
  );
  bot.on("message", (ctx) =>
    ctx.reply("فعلاً فقط متن رو می‌فهمم 🙂 برای دیدن دستورها /start رو بزن."),
  );

  // حذف وب‌هوک قبلی تا long-polling تمیز شروع شود (خطا نباید کرش کند)
  await bot.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});

  // حلقه polling مقاوم: هر خطا → لاگ یک‌باره + تلاش مجدد بعد از ۳ ثانیه
  const g = globalThis as any;
  if (g.__mianboorTgPollStarted) {
    console.log("[telegram-bot] polling قبلاً فعال است (bun --hot) — رد شد");
    return;
  }
  g.__mianboorTgPollStarted = true;

  let offset = 0;
  let everFailed = false;
  let startedOnce = false;

  while (true) {
    try {
      if (!startedOnce) {
        const me = await bot.init();
        console.log(`[telegram-bot] اتصال به تلگرام برقرار است ✅ (@${me.username})`);
        startedOnce = true;
      }
      const updates = await bot.api.getUpdates(offset, 100, 30);
      for (const u of updates) {
        offset = u.update_id + 1;
        try {
          await bot.handleUpdate(u);
        } catch (e) {
          console.error("[telegram-bot] خطای پردازش آپدیت:", e);
        }
      }
      if (everFailed) {
        console.log("[telegram-bot] اتصال به تلگرام دوباره برقرار شد ✅");
        everFailed = false;
      }
    } catch (e) {
      if (!everFailed) {
        everFailed = true;
        console.error("[telegram-bot] اتصال به api.telegram.org برقرار نشد — هر ۳ ثانیه دوباره تلاش می‌کنم…", (e as Error)?.message ?? e);
      }
      await new Promise((r) => setTimeout(r, POLL_RETRY_MS));
    }
  }
}

// ---------- نقطه شروع ----------
if (!configured) {
  console.log("TELEGRAM_BOT_TOKEN تنظیم نشده — bot در حالت خواب 😴 (فایل .env را در همین پوشه پر کنید)");
} else {
  startBot().catch((e) => console.error("[telegram-bot] خطای راه‌اندازی ربات:", e));
}
