import { vidActive, vidBps, vidGet } from "@/lib/lab/videostats";

/** آمار زندهٔ سشن ویدیو — GET /api/lab/video-stats?sid=… */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const sid = (u.searchParams.get("sid") ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
  const s = sid ? vidGet(sid) : null;
  if (!s) return Response.json({ ok: false, error: "سشن پیدا نشد" }, { status: 404 });

  return Response.json(
    {
      ok: true,
      name: s.name,
      bytes: s.bytes,
      chunks: s.chunks,
      requests: s.requests,
      seeks: s.seeks,
      bps: vidBps(s),
      active: vidActive(s),
      done: s.done,
      error: s.error,
      mode: s.mode,
      msBridge: s.msBridge,
      elapsedMs: Date.now() - s.startedAt,
      log: s.log.slice(-14),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
