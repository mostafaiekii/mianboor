/**
 * دستیار هوشمند — لایهٔ مشترک چت.
 *
 * روی Vercel فایل کانفیگ SDK وجود ندارد، پس اگر متغیرهای محیطی
 * ZAI_BASE_URL / ZAI_API_KEY ست شده باشند مستقیم با همان پروتکل SDK
 * درخواست می‌زنیم؛ در محیط محلی (سندباکس) به SDK برمی‌گردیم.
 */

type ChatMessage = { role: string; content: string };

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { thinking?: { type: string } } = {},
): Promise<string> {
  const base = (process.env.ZAI_BASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.ZAI_API_KEY ?? "";

  if (base && key) {
    // ── مسیر مستقیم (production) — همان پروتکل z-ai-web-dev-sdk ──
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Z-AI-From": "Z",
    };
    if (process.env.ZAI_CHAT_ID) headers["X-Chat-Id"] = process.env.ZAI_CHAT_ID;
    if (process.env.ZAI_USER_ID) headers["X-User-Id"] = process.env.ZAI_USER_ID;
    if (process.env.ZAI_TOKEN) headers["X-Token"] = process.env.ZAI_TOKEN;

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages,
        thinking: opts.thinking ?? { type: "disabled" },
      }),
    });
    if (!res.ok) {
      throw new Error(`AI request failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!reply) throw new Error("empty reply");
    return reply;
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
