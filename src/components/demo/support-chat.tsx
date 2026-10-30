"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { TG_SUPPORT, tr, type Lang } from "./i18n";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * چت پشتیبانی هوشمند — پاسخ خودکار با AI (دمو).
 * در اپ واقعی همین اتصال به بک‌اند `/api/support-chat` برقرار می‌شه؛
 * دستیار فقط از اطلاعات واقعی میانبر (پلن‌ها، عیب‌یابی، سرورها) جواب می‌ده
 * و سؤال‌های انسانی رو به @member9 ارجاع می‌ده.
 */
export function SupportChatScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const t = tr(lang);
  const rtl = lang === "fa";
  const Back = rtl ? ChevronRight : ChevronLeft;
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: t.chatWelcome }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  /* هر پیام جدید → اسکرول خودکار به آخر */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/demo/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: next.slice(-10) }),
      });
      const data = (await res.json()) as { ok?: boolean; reply?: string };
      setMsgs((m) => [...m, { role: "assistant", content: data.reply?.trim() || t.aiFailed }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: t.aiFailed }]);
    } finally {
      setBusy(false);
    }
  };

  const quicks = [t.quick1, t.quick2, t.quick3, t.quick4];

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col px-5 pt-2">
      {/* هدر */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="w-fit text-dim hover:text-ink">
          <Back className="size-6" />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-bold text-ink">{t.chatWith}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-dim">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-glow" />
            </span>
            {t.aiOnline}
          </span>
        </span>
        <a
          href={TG_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.chatHuman}
          title={t.chatHuman}
          className="grid size-9 shrink-0 place-items-center rounded-full text-dim hover:text-ink"
        >
          <Send className="size-5" />
        </a>
      </div>

      {/* پیام‌ها */}
      <div className="scroll-hide mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[82%] self-end rounded-2xl rounded-ee-md bg-glow px-3.5 py-2.5 text-sm font-medium leading-6 text-on-glow"
                : "max-w-[85%] self-start rounded-2xl rounded-ss-md border border-panel-edge bg-panel px-3.5 py-2.5 text-sm leading-6 text-ink"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-1.5 self-start rounded-2xl rounded-ss-md border border-panel-edge bg-panel px-4 py-3.5" aria-label="typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 animate-bounce rounded-full bg-dim" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* پاسخ‌های سریع — فقط قبل از اولین پیام */}
      {msgs.length <= 1 && !busy && (
        <div className="flex flex-wrap gap-2 pb-2">
          {quicks.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-glow/30 bg-glow/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-glow/60"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ورودی پیام */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-panel-edge py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chatPlaceholder}
          aria-label={t.chatPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-glow text-on-glow transition-opacity disabled:opacity-40"
        >
          <Send className="size-4 rtl:-scale-x-100" />
        </button>
      </form>
      <div className="pb-1.5 text-center text-[11px] text-dim">{t.chatHuman}</div>
    </div>
  );
}
