import { bridgeDoRequest, parseReqMeta, reassembleBody } from "../../src/lib/lab/core";
import { LAB_PORTS, sealInner, type LabEvent, type LabLog } from "../../src/lib/lab/protocol";

/* ────────────────────────────────────────────────────────────────────────────
 * بات پل (HTTP :3033) — نقش «بات تلگرام روی VPS» در طرح اصلی.
 * مثل getUpdates بوت تلگرام، مدام از دیتاسنتر برداشت می‌کند؛ چون کلید رمز
 * درونی اپ↔پل را دارد، درخواست را می‌بیند، واقعاً به اینترنت آزاد می‌زند و
 * پاسخ را چانک‌چانک رمزکرده تحویل دیتاسنتر می‌دهد.
 * ──────────────────────────────────────────────────────────────────────────── */

const events: LabEvent[] = [];
const log: LabLog = (hop, msg, bytes) => {
  events.push({ t: Date.now(), hop, msg, bytes });
  if (events.length > 400) events.splice(0, events.length - 400);
  console.log(`[bridge] ${msg}`);
};

const DC = `http://127.0.0.1:${LAB_PORTS.dcApi}`;
const BATCH = 12;

async function handleJob(job: { id: number; metaSealed: string; upChunks: string[] }): Promise<void> {
  log("bridge", `برداشت از دیتاسنتر: تونل #${job.id % 10000} (${job.upChunks.length} بخش)`);
  const meta = parseReqMeta(Buffer.from(job.metaSealed, "base64"));
  log("bridge", "رمز درونی با کلید اپ↔پل باز شد (دیتاسنتر قادر به باز کردنش نبود)");
  const body = reassembleBody(job.upChunks.map((c) => Buffer.from(c, "base64")));

  const { resMeta, chunksSealed } = await bridgeDoRequest(meta, body, log);
  const resMetaSealed = sealInner(Buffer.from(JSON.stringify(resMeta), "utf8"));

  if (chunksSealed.length === 0) {
    await fetch(`${DC}/deliver`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: job.id, resMetaSealed: resMetaSealed.toString("base64"), chunksSealed: [], offset: 0, total: 0, end: true }),
    });
    return;
  }
  for (let i = 0; i < chunksSealed.length; i += BATCH) {
    const end = i + BATCH >= chunksSealed.length;
    await fetch(`${DC}/deliver`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: job.id,
        resMetaSealed: i === 0 ? resMetaSealed.toString("base64") : undefined,
        chunksSealed: chunksSealed.slice(i, i + BATCH).map((c) => c.toString("base64")),
        offset: i,
        total: chunksSealed.length,
        end,
      }),
    });
  }
  log("bridge", `${chunksSealed.length} چانک تحویل دیتاسنتر داده شد — برگشت به سمت اپ`);
}

async function workerLoop(): Promise<void> {
  for (;;) {
    try {
      const r = await fetch(`${DC}/pick?wait=2500`, { signal: AbortSignal.timeout(8000) });
      if (r.status === 200) {
        const job = (await r.json()) as { id: number; metaSealed: string; upChunks: string[] };
        await handleJob(job);
        continue;
      }
    } catch (e) {
      log("bridge", `خطای حلقهٔ برداشت: ${e instanceof Error ? e.message : "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}
void workerLoop();

Bun.serve({
  port: LAB_PORTS.bridge,
  fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === "/health") return Response.json({ ok: true, svc: "bridge" });
    if (u.pathname === "/events") {
      const since = Number(u.searchParams.get("since") ?? 0);
      return Response.json({ events: events.filter((e) => e.t >= since) });
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`[bridge] bridge bot listening on 127.0.0.1:${LAB_PORTS.bridge}`);
