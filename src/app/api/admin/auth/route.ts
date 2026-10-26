import { NextResponse } from "next/server";
import { checkPassword, adminToken } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!checkPassword(password ?? "")) {
      return NextResponse.json(
        { ok: false, error: "رمز مدیر اشتباه است" },
        { status: 401 }
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("mb_admin", adminToken(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // ۸ ساعت
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "درخواست نامعتبر" },
      { status: 400 }
    );
  }
}
