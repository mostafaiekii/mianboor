import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

/**
 * مسیر موقت راه‌اندازی (bootstrap) — فقط برای ساخت اولیه‌ی دیتابیس ابری.
 * بدون کلید مخفی BOOTSTRAP_KEY پاسخ نمی‌دهد و بعد از راه‌اندازی حذف می‌شود.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-bootstrap-key") ?? "";
  const expected = process.env.BOOTSTRAP_KEY ?? "";
  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  let body: { action?: string; neonToken?: string; databaseUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (body.action === "ping") {
    return NextResponse.json({ ok: true, ts: Date.now() });
  }

  // ساخت پروژه‌ی Neon از داخل Vercel (که به api.neon.tech دسترسی دارد)
  if (body.action === "neon-create") {
    try {
      const res = await fetch("https://api.neon.tech/v2/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${body.neonToken ?? ""}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ project: { name: "mianboor" } }),
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ ok: res.ok, status: res.status, data });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: String(e).slice(0, 500) },
        { status: 500 }
      );
    }
  }

  // ساخت جدول‌ها روی دیتابیس ابری (اجرای مستقیم DDL)
  if (body.action === "db-setup") {
    const url = body.databaseUrl ?? process.env.DATABASE_URL ?? "";
    if (!url.startsWith("postgres")) {
      return NextResponse.json({ ok: false, error: "bad url" }, { status: 400 });
    }
    const prisma = new PrismaClient({ datasourceUrl: url });
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "VpnConfig" (
           "id" TEXT NOT NULL,
           "name" TEXT NOT NULL,
           "link" TEXT NOT NULL,
           "country" TEXT NOT NULL DEFAULT 'نامشخص',
           "active" BOOLEAN NOT NULL DEFAULT true,
           "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
           CONSTRAINT "VpnConfig_pkey" PRIMARY KEY ("id")
         )`
      );
      const rows = await prisma.vpnConfig.count();
      return NextResponse.json({ ok: true, rows });
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: String(e).slice(0, 500) },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
