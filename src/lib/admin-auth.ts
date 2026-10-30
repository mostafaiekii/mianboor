import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * همهٔ مقادیر محرمانه فقط از Environment Variables خوانده می‌شوند و
 * هیچ پیش‌فرضی در سورس یا مستندات منتشر نمی‌شود.
 * روی هاست (مثلاً Vercel) این متغیرها را مقداردهی کنید:
 *   ADMIN_PASSWORD  — رمز ورود وب
 *   ADMIN_SYNC_KEY  — کلید همگام‌سازی کلاینت‌ها (x-admin-key)
 *   CLIENT_TOKEN    — توکن کلاینت‌ها برای دریافت کانفیگ‌ها
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_SYNC_KEY = process.env.ADMIN_SYNC_KEY ?? "";

export function adminToken(): string {
  return crypto
    .createHmac("sha256", ADMIN_PASSWORD)
    .update("mianboor-admin-v1")
    .digest("hex");
}

export function checkPassword(password: string): boolean {
  return ADMIN_PASSWORD.length > 0 && password === ADMIN_PASSWORD;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("mb_admin")?.value === adminToken();
}

/**
 * کلاینت‌ها (بدون کوکی) با هدر x-admin-key احراز می‌شوند.
 */
export function adminKeyValid(req: Request): boolean {
  const key = req.headers.get("x-admin-key") ?? "";
  return key.length > 0 && ((ADMIN_SYNC_KEY.length > 0 && key === ADMIN_SYNC_KEY) || (ADMIN_PASSWORD.length > 0 && key === ADMIN_PASSWORD));
}

export async function isAdminReq(req: Request): Promise<boolean> {
  return (await isAdmin()) || adminKeyValid(req);
}

export function clientToken(): string {
  return process.env.CLIENT_TOKEN ?? "";
}
