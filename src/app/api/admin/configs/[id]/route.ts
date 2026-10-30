import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminReq } from "@/lib/admin-auth";

/** فعال/غیرفعال کردن کانفیگ (و تغییر پرچم premium) */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { active, premium } = await req.json();
    const data: { active?: boolean; premium?: boolean } = {};
    if (active !== undefined) data.active = Boolean(active);
    if (premium !== undefined) data.premium = Boolean(premium);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "چیزی برای تغییر نیست" }, { status: 400 });
    }
    const updated = await db.vpnConfig.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, config: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "کانفیگ پیدا نشد" }, { status: 404 });
  }
}

/** حذف کانفیگ */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminReq(req))) {
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
