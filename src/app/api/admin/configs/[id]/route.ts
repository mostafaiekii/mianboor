import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

/** فعال/غیرفعال کردن کانفیگ */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { active } = await req.json();
    const updated = await db.vpnConfig.update({
      where: { id },
      data: { active: Boolean(active) },
    });
    return NextResponse.json({ ok: true, config: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "کانفیگ پیدا نشد" }, { status: 404 });
  }
}

/** حذف کانفیگ */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await db.vpnConfig.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "کانفیگ پیدا نشد" }, { status: 404 });
  }
}
