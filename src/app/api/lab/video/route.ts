import { labVideoStart } from "@/lib/lab/client";
import { parseByteRange, validateMediaName } from "@/lib/lab/protocol";
import { vidCount, vidDone, vidGet, vidLog, vidRegister } from "@/lib/lab/videostats";

/**
 * استریم ویدیو از داخل تونل ۴-هاپ — GET /api/lab/video?name=clip-480.mp4&sid=…
 *
 * مرورگر (<video>) خودش هدر Range می‌فرستد؛ هر درخواست = یک سشن تونل واقعی
 * (هندشیک → پروکسی → دیتاسنتر → پل/CDN → اینترنت) و چانک‌های رمزگشایی‌شده
 * به‌صورت جریان پیش‌رونده به پخش‌کننده می‌رسند. سک = سشن Range جدید.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get("name") ?? "").trim();
  const sid = (u.searchParams.get("sid") ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
  const rangeHeader = req.headers.get("range");

  if (!validateMediaName(name).ok) {
    return Response.json({ ok: false, error: "نام مدیا مجاز نیست" }, { status: 400 });
  }

  const rStart = parseByteRange(rangeHeader)?.start ?? 0;
  const stat = sid ? vidRegister(sid, name, rStart) : null;
  if (stat) {
    vidLog(
      stat,
      "app",
      rStart > 0
        ? `درخواست HTTP مرورگر: ${name} از بایت ${rStart} (سک) — سشن تونل جدید`
        : `درخواست HTTP مرورگر: ${name} (از ابتدا) — سشن تونل جدید`,
    );
  }

  const start = await labVideoStart(name, rangeHeader, (e) => {
    if (stat) vidLog(stat, e.hop, e.msg);
  });

  if (stat) {
    stat.mode = start.mode;
    stat.msBridge = start.msBridge;
  }

  if (!start.ok) {
    const msg = start.error ?? "تونل ویدیو برقرار نشد";
    if (stat) {
      vidLog(stat, "app", `شکست: ${msg}`);
      vidDone(stat, msg);
    }
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", start.contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-store");
  const len = start.rangeEnd - start.rangeStart + 1;
  headers.set("Content-Length", String(len));
  if (start.status === 206) {
    headers.set("Content-Range", `bytes ${start.rangeStart}-${start.rangeEnd}/${start.totalBytes}`);
  }

  let lastChunkLog = 0;
  const body = start.stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        if (stat) {
          vidCount(stat, chunk.byteLength);
          if (stat.chunks >= lastChunkLog + 24) {
            lastChunkLog = stat.chunks;
            vidLog(stat, "app", `${stat.chunks} پردهٔ رمزگشایی شد (${Math.round(stat.bytes / 1024)} KB داخل بافر مرورگر)`);
          }
        }
        ctrl.enqueue(chunk);
      },
      flush() {
        if (stat) {
          vidLog(stat, "app", `جریان کامل شد — ${Math.round(stat.bytes / 1024)} KB از تونل به پخش‌کننده رسید`);
          vidDone(stat);
        }
      },
    }),
  );

  return new Response(body, { status: start.status, headers });
}
