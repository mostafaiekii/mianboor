import { NextResponse } from "next/server";
import net from "node:net";

/**
 * پینگ واقعی TCP برای پروکسی‌های تلگرام — نسخهٔ ۲٫۶
 *
 * عین TgProxyManager.measureAll اپ اندروید: یک هندشیک TCP به host:port و
 * زمانِ دست‌دادن = تأخیر. همهٔ اهداف همزمان پینگ می‌شوند و نامرئی‌ها 999
 * می‌گیرند تا ته لیست بیفتند (مرجع: ServerTester اپ).
 *
 * فراخوانی: POST /api/client/telegram/ping
 * بدنه: { "targets": [{ "id": "p1", "host": "1.2.3.4", "port": 443 }, …] }
 * پاسخ: { "ok": true, "pings": { "p1": 87, … } }   (نامرئی = 999)
 *
 * سقف اهداف: ۱۲ — بیشتر از آن هم فقط ۱۲ تای اول پینگ می‌شود.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنهٔ نامعتبر" }, { status: 400 });
  }

  const targets = Array.isArray((body as { targets?: unknown })?.targets)
    ? ((body as { targets: Array<{ id?: unknown; host?: unknown; port?: unknown }> }).targets ?? [])
    : [];

  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: "هدفی نیست" }, { status: 400 });
  }

  const list = targets
    .slice(0, 12)
    .map((t, i) => ({
      id: String(t?.id ?? `t${i}`),
      host: String(t?.host ?? "").trim(),
      port: Number(t?.port ?? 0),
    }))
    .filter(
      (t) =>
        t.host.length > 0 &&
        t.host.length <= 253 &&
        Number.isInteger(t.port) &&
        t.port >= 1 &&
        t.port <= 65535,
    );

  if (list.length === 0) {
    return NextResponse.json({ ok: false, error: "هدف نامعتبر" }, { status: 400 });
  }

  const pingOne = (host: string, port: number): Promise<number> =>
    new Promise((resolve) => {
      const started = process.hrtime.bigint();
      const sock = new net.Socket();
      let done = false;
      const finish = (ms: number) => {
        if (done) return;
        done = true;
        sock.destroy();
        resolve(ms);
      };
      sock.setTimeout(2500);
      sock.once("connect", () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        finish(Math.max(1, Math.round(ms)));
      });
      sock.once("timeout", () => finish(999));
      sock.once("error", () => finish(999));
      try {
        sock.connect(port, host);
      } catch {
        finish(999);
      }
    });

  const settled = await Promise.all(list.map((t) => pingOne(t.host, t.port)));
  const pings: Record<string, number> = {};
  list.forEach((t, i) => {
    pings[t.id] = settled[i];
  });

  return NextResponse.json(
    { ok: true, pings },
    { headers: { "Cache-Control": "no-store" } },
  );
}
