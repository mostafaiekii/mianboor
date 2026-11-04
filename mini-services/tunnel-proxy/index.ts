import { createDecipheriv } from "node:crypto";
import net from "node:net";
import { LAB_PORTS, TAG_INTERMEDIATE, deriveKeys, type LabEvent, type LabLog } from "../../src/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * شبیه‌ساز پروکسی MTProto تلگرام (TCP :3031 — API رویدادها :3035)
 * دقیقاً مثل MTProto proxy واقعی: هندشیک ۶۴ بایتی را می‌بیند، رمز را با کلیدِ
 * مشتق‌شده اعتبارسنجی می‌کند و بعد جریان رمز را «کورکورانه» به دیتاسنتر رله می‌کند.
 * ──────────────────────────────────────────────────────────────────────────── */

const events: LabEvent[] = [];
const log: LabLog = (hop, msg, bytes) => {
  events.push({ t: Date.now(), hop, msg, bytes });
  if (events.length > 400) events.splice(0, events.length - 400);
  console.log(`[proxy] ${msg}`);
};

net.createServer((sock) => {
  let pending = Buffer.alloc(0);
  let phase: "handshake" | "connecting" | "relay" = "handshake";
  let upstream: net.Socket | null = null;
  let upBytes = 0;
  let downBytes = 0;
  const timeout = setTimeout(() => sock.destroy(), 120_000);

  const cleanup = () => {
    clearTimeout(timeout);
    if (upstream) {
      log("proxy", `رلهٔ تونل بسته شد — ↑${upBytes}B از اپ، ↓${downBytes}B به اپ`);
      upstream.destroy();
    }
    upstream = null;
  };

  sock.on("data", (d: Buffer) => {
    if (phase === "relay" && upstream) {
      upBytes += d.length;
      upstream.write(d);
      return;
    }
    pending = Buffer.concat([pending, d]);
    if (phase !== "handshake") return; /* connecting — تا وصل شدن upstream بافر می‌شود */
    if (pending.length < 68) return; /* 64 هندشیک + 4 بایت تگ اولین فریم */

    const handshake = Buffer.from(pending.subarray(0, 64));
    const keys = deriveKeys(handshake);
    /* اعتبارسنجی مثل پروکسی واقعی: تگ اولین فریم با کلید مشتق‌شده از رمز چک می‌شود */
    const probe = createDecipheriv("aes-256-ctr", keys.kUp, keys.ivUp);
    const tag = probe.update(Buffer.from(pending.subarray(64, 68)));
    if (!tag.equals(TAG_INTERMEDIATE)) {
      log("proxy", "هندشیک نامعتبر — رمز اشتباه است؛ اتصال رد شد (رفتار واقعی MTProto proxy)");
      sock.destroy();
      return;
    }
    log("proxy", "هندشیک معتبر شد (رمز درست) — رلهٔ کورِ جریان رمز به دیتاسنتر آغاز می‌شود");
    phase = "connecting";

    const up = net.connect(LAB_PORTS.dc, "127.0.0.1");
    upstream = up;
    up.on("error", () => {
      log("proxy", "اتصال به دیتاسنتر برقرار نشد");
      sock.destroy();
    });
    up.on("connect", () => {
      phase = "relay";
      upBytes += Math.max(0, pending.length - 64); /* فقط جریان پس از هندشیک */
      up.write(pending); /* هندشیک + شروع جریان، دست‌نخورده */
      pending = Buffer.alloc(0);
      log("proxy", "جریان رمز در حال عبور است — پروکسی محتوا را نمی‌بیند");
    });
    up.on("data", (b: Buffer) => {
      downBytes += b.length;
      sock.write(b);
    });
    up.on("close", () => sock.destroy());
  });

  sock.on("close", cleanup);
  sock.on("error", () => {});
}).listen(LAB_PORTS.proxy, "127.0.0.1", () => {
  console.log(`[proxy] MTProto proxy simulator listening on 127.0.0.1:${LAB_PORTS.proxy}`);
});

Bun.serve({
  port: LAB_PORTS.proxyApi,
  fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === "/health") return Response.json({ ok: true, svc: "proxy" });
    if (u.pathname === "/events") {
      const since = Number(u.searchParams.get("since") ?? 0);
      return Response.json({ events: events.filter((e) => e.t >= since) });
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`[proxy] events API on 127.0.0.1:${LAB_PORTS.proxyApi}`);
