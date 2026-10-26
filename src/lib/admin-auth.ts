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

export function clientToken(): string {
  return process.env.CLIENT_TOKEN || "[REDACTED-SECURITY]";
}
