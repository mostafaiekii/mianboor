import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "[REDACTED-SECURITY]";

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
 * اپ اندروید کوکی ندارد؛ با هدر x-admin-key (مقدارش همان ADMIN_PASSWORD) احراز می‌شود.
 * این helper هم کوکی وب و هم هدر اپ را می‌پذیرد.
 */
export function adminKeyValid(req: Request): boolean {
  const key = req.headers.get("x-admin-key") ?? "";
  return key.length > 0 && key === ADMIN_PASSWORD;
}

export async function isAdminReq(req: Request): Promise<boolean> {
  return (await isAdmin()) || adminKeyValid(req);
}

export function clientToken(): string {
  return process.env.CLIENT_TOKEN || "[REDACTED-SECURITY]";
}
