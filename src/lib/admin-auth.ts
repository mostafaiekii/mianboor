import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "[REDACTED-SECURITY]";

/**
 * کلید همگام‌سازی ادمین — داخل APK (BuildConfig.ADMIN_KEY) باندل می‌شود تا
 * انتشار کانفیگ و مدیریت کاربران بدون تنظیم دستی کار کند.
 * برای باطل‌کردن کلید باندل‌شده، روی Vercel متغیر ADMIN_SYNC_KEY را مقداردهی کنید
 * و GitHub secret هم MIANOOR_ADMIN_KEY را همان مقدار قرار دهید.
 */
const ADMIN_SYNC_KEY = process.env.ADMIN_SYNC_KEY || "[REDACTED-SECURITY]";

export function adminToken(): string {
  return crypto
    .createHmac("sha256", ADMIN_PASSWORD)
    .update("mianboor-admin-v1")
    .digest("hex");
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("mb_admin")?.value === adminToken();
}

/**
 * اپ اندروید کوکی ندارد؛ با هدر x-admin-key احراز می‌شود.
 * کلید معتبر: ADMIN_SYNC_KEY (باندل‌شده در اپ) یا ADMIN_PASSWORD (وب).
 */
export function adminKeyValid(req: Request): boolean {
  const key = req.headers.get("x-admin-key") ?? "";
  return key.length > 0 && (key === ADMIN_SYNC_KEY || key === ADMIN_PASSWORD);
}

export async function isAdminReq(req: Request): Promise<boolean> {
  return (await isAdmin()) || adminKeyValid(req);
}

export function clientToken(): string {
  return process.env.CLIENT_TOKEN || "[REDACTED-SECURITY]";
}
