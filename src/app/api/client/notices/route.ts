import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { clientToken } from "@/lib/admin-auth";

/**
 * صندوق اعلان‌های کاربر — اپ اندروید هنگام sync آن را می‌گیرد.
 *
 * GET  /api/client/notices?token=…&device=MB-…
 *      ← اعلان‌های فعال + پرچم خوانده‌شده برای همین دستگاه
 * POST /api/client/notices  { token, device, id }
 *      ← علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const device = (searchParams.get("device") ?? "").trim().toUpperCase();
  if (!token || token !== clientToken()) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureDb();
  const rows = await db.notice.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const reads = device
    ? await db.noticeRead.findMany({
        where: { deviceId: device, noticeId: { in: rows.map((n) => n.id) } },
      })
    : [];
  const readSet = new Set(reads.map((r) => r.noticeId));
  const notices = rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    createdAt: n.createdAt.getTime(),
    read: readSet.has(n.id),
  }));
  return NextResponse.json({
    ok: true,
    notices,
    unread: notices.filter((n) => !n.read).length,
  });
}

export async function POST(req: Request) {
  let body: { token?: string; device?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const device = String(body.device ?? "").trim().toUpperCase();
  const id = String(body.id ?? "").trim();
  if (!token || token !== clientToken() || !device || !id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await ensureDb();
  await db.noticeRead
    .upsert({
      where: { noticeId_deviceId: { noticeId: id, deviceId: device } },
      create: { noticeId: id, deviceId: device },
      update: {},
    })
    .catch(() => undefined);
  return NextResponse.json({ ok: true });
}
