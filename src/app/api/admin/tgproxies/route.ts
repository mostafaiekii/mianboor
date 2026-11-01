import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDb } from "@/lib/ensure-db";
import { isAdminReq } from "@/lib/admin-auth";
import { TG_PROXY_FALLBACK } from "@/lib/tg-proxies";
import { parseTgProxyLink } from "@/lib/tg-link";

/**
 * پروکسی‌های تلگرام — پنل مدیریت (نسخهٔ ۲):
 *
 * GET    /api/admin/tgproxies                ← همهٔ پروکسی‌ها
 * POST   /api/admin/tgproxies { link }                       ← لینک کامل tg://proxy یا t.me/proxy|socks
 * POST   /api/admin/tgproxies { title, server, port, kind?, secret?, country? }
 * DELETE /api/admin/tgproxies?id=…
 */

export async function GET(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  try {
    await ensureDb();
    const proxies = await db.tgProxy.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, proxies });
  } catch {
    // دیتابیس در دسترس نیست — لیست نمایشی تا پنل خالی نماند
    return NextResponse.json({ ok: false, demo: true, proxies: TG_PROXY_FALLBACK });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  let body: {
    title?: string;
    link?: string;
    server?: string;
    port?: number | string;
    kind?: string;
    secret?: string | null;
    country?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "بدنه نامعتبر" }, { status: 400 });
  }
  await ensureDb();

  /* مسیر ۱ — لینک کامل پروکسی تلگرام (tg://proxy؟… یا t.me/proxy|socks؟…) */
  let server = "";
  let port = 0;
  let kind: "mtproto" | "socks" = "mtproto";
  let secret: string | null = null;

  if (body.link) {
    const parsed = parseTgProxyLink(String(body.link));
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "لینک پروکسی نامعتبر است" }, { status: 400 });
    }
    server = parsed.server;
    port = parsed.port;
    kind = parsed.kind;
    secret = parsed.secret;
  } else {
    /* مسیر ۲ — فیلدهای مجزا (سازگاری با نسخه‌های قبل) */
    server = String(body.server ?? "").trim();
    port = Math.floor(Number(body.port) || 0);
    kind = String(body.kind ?? "mtproto").trim().toLowerCase() === "socks" ? "socks" : "mtproto";
    secret = String(body.secret ?? "").trim() || null;
  }

  const title = String(body.title ?? "").trim() || "پروکسی تلگرام";
  const country = String(body.country ?? "").trim() || null;

  if (!server) {
    return NextResponse.json({ ok: false, error: "سرور لازم است" }, { status: 400 });
  }
  if (port < 1 || port > 65535) {
    return NextResponse.json({ ok: false, error: "پورت نامعتبر" }, { status: 400 });
  }

  try {
    const created = await db.tgProxy.create({
      data: { title, server, port, kind, secret, country },
    });
    return NextResponse.json({ ok: true, proxy: created });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminReq(req))) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "id لازم است" }, { status: 400 });
  }
  await ensureDb();
  try {
    await db.tgProxy.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "پروکسی پیدا نشد" }, { status: 404 });
  }
}
