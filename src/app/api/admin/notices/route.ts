import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";

/**
 * اعلان‌های تیم میانبر — از پنل مدیریت (وب یا اپ) ارسال می‌شود و
 * در صندوق کاربران (بل زنگ صفحهٔ خانه) یا به‌صورت پاپ‌آپ داخل اپ ظاهر می‌شود.
 *
 * GET    /api/admin/notices            ← فهرست همهٔ اعلان‌ها
 * POST   /api/admin/notices            { title, body, kind: "inbox"|"popup" }
 * DELETE /api/admin/notices?id=…       ← حذف اعلان
 */
export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  await ensureDb();
  const notices = await db.notice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ ok: true, notices });
}

export async function POST(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  let body: { title?: string; body?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim().slice(0, 120);
  const text = String(body.body ?? "").trim().slice(0, 1000);
  const kind = body.kind === "popup" ? "popup" : "inbox";
  if (!title || !text) {
    return NextResponse.json({ ok: false, error: "عنوان و متن لازم است" }, { status: 400 });
  }
  await ensureDb();
  const notice = await db.notice.create({ data: { title, body: text, kind } });
  return NextResponse.json({ ok: true, notice });
}

export async function DELETE(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "id لازم است" }, { status: 400 });
  }
  await ensureDb();
  await db.noticeRead.deleteMany({ where: { noticeId: id } }).catch(() => undefined);
  await db.notice.delete({ where: { id } }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
