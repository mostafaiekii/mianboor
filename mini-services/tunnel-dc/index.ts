import net from "node:net";
import { DcConnection, DcStore } from "../../src/lib/lab/core";
import { LAB_PORTS, deriveKeys, type LabEvent, type LabLog } from "../../src/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * دیتاسنتر تلگرام (TCP :3032 — API پل/رویدادها :3036)
 * جریان رمزِ اپ را رمزگشایی می‌کند (لایهٔ بیرونی)؛ ولی چون کلید رمز درونی را
 * ندارد، محتوای قاب‌ها برایش opaque می‌ماند. پاسخ پل را به داخل جریان رمز
 * برمی‌گرداند تا از مسیر پروکسی به اپ برسد.
 * ──────────────────────────────────────────────────────────────────────────── */

const events: LabEvent[] = [];
const log: LabLog = (hop, msg, bytes) => {
  events.push({ t: Date.now(), hop, msg, bytes });
  if (events.length > 400) events.splice(0, events.length - 400);
  console.log(`[dc] ${msg}`);
};

const store = new DcStore(log);

net.createServer((sock) => {
  let hs = Buffer.alloc(0);
  let conn: DcConnection | null = null;
  const timeout = setTimeout(() => sock.destroy(), 120_000);

  sock.on("data", (d: Buffer) => {
    if (conn) {
      conn.feed(d);
      return;
    }
    hs = Buffer.concat([hs, d]);
    if (hs.length < 64) return;
    const handshake = Buffer.from(hs.subarray(0, 64));
    const rest = Buffer.from(hs.subarray(64));
    const keys = deriveKeys(handshake);
    conn = new DcConnection(keys, (b) => sock.write(b), log, store);
    log("dc", "جریان رمز اپ ترمینیت شد (لایهٔ بیرونی باز شد؛ لایهٔ درونی برای دیتاسنتر بسته می‌ماند)");
    if (rest.length) conn.feed(rest);
  });

  sock.on("close", () => {
    clearTimeout(timeout);
    if (conn?.sessionId != null) {
      store.drop(conn.sessionId);
      log("dc", `اتصال تونل #${conn.sessionId % 10000} بسته شد`);
    }
  });
  sock.on("error", () => {});
}).listen(LAB_PORTS.dc, "127.0.0.1", () => {
  console.log(`[dc] Telegram DC simulator listening on 127.0.0.1:${LAB_PORTS.dc}`);
});

Bun.serve({
  port: LAB_PORTS.dcApi,
  idleTimeout: 30, /* long-poll برداشت پل نباید وسط راه قطع شود */
  fetch: async (req) => {
    const u = new URL(req.url);
    if (u.pathname === "/health") return Response.json({ ok: true, svc: "dc", sessions: store.size });
    if (u.pathname === "/events") {
      const since = Number(u.searchParams.get("since") ?? 0);
      return Response.json({ events: events.filter((e) => e.t >= since) });
    }
    if (u.pathname === "/pick" && req.method === "GET") {
      const wait = Math.min(Number(u.searchParams.get("wait") ?? 0) || 0, 5000);
      const deadline = Date.now() + wait;
      for (;;) {
        const job = store.pick();
        if (job) {
          return Response.json({
            id: job.id,
            metaSealed: job.metaSealed.toString("base64"),
            upChunks: job.upChunks.map((c) => c.toString("base64")),
          });
        }
        if (Date.now() >= deadline) return new Response(null, { status: 204 });
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (u.pathname === "/deliver" && req.method === "POST") {
      const j = (await req.json()) as {
        id: number;
        resMetaSealed?: string;
        chunksSealed?: string[];
        offset?: number;
        total?: number;
        end?: boolean;
      };
      const ok = store.deliver(
        j.id,
        j.resMetaSealed ? Buffer.from(j.resMetaSealed, "base64") : null,
        (j.chunksSealed ?? []).map((c) => Buffer.from(c, "base64")),
        j.offset ?? 0,
        j.total ?? 0,
        j.end ?? false,
      );
      return Response.json({ ok });
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`[dc] bridge/events API on 127.0.0.1:${LAB_PORTS.dcApi}`);
