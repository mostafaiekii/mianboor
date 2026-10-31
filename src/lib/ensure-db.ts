import { db } from "@/lib/db";

/**
 * خودترمیمی اسکیمای دیتابیس (idempotent)
 *
 * جدول‌ها/ستون‌های جدید را با DDL خام می‌سازد تا استقرار روی Vercel بدون
 * هیچ مرحله‌ی دستی (prisma db push) کار کند. برای هر پروسه یک بار اجرا
 * می‌شود و نتیجه کش می‌شود.
 *
 * جهت سازگاری با محیط dev محلی (sqlite) و production (postgres)،
 * دیالکت بر اساس DATABASE_URL تشخیص داده می‌شود.
 */

const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");

const POSTGRES_DDL = [
  `CREATE TABLE IF NOT EXISTS "VpnConfig" (
     "id" TEXT NOT NULL,
     "name" TEXT NOT NULL,
     "link" TEXT NOT NULL,
     "country" TEXT NOT NULL DEFAULT 'نامشخص',
     "active" BOOLEAN NOT NULL DEFAULT true,
     "premium" BOOLEAN NOT NULL DEFAULT false,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "VpnConfig_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE TABLE IF NOT EXISTS "Device" (
     "id" TEXT NOT NULL,
     "premiumUntil" TIMESTAMP(3),
     "label" TEXT NOT NULL DEFAULT '',
     "appVersion" TEXT NOT NULL DEFAULT '',
     "refCode" TEXT NOT NULL DEFAULT '',
     "referredBy" TEXT NOT NULL DEFAULT '',
     "refGiftPending" INTEGER NOT NULL DEFAULT 0,
     "refCount" INTEGER NOT NULL DEFAULT 0,
     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE TABLE IF NOT EXISTS "Order" (
     "id" TEXT NOT NULL,
     "deviceId" TEXT NOT NULL,
     "plan" TEXT NOT NULL,
     "price" INTEGER NOT NULL,
     "via" TEXT NOT NULL,
     "status" TEXT NOT NULL DEFAULT 'pending',
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE TABLE IF NOT EXISTS "AppSetting" (
     "key" TEXT NOT NULL,
     "value" TEXT NOT NULL,
     CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
   )`,
  `CREATE TABLE IF NOT EXISTS "Notice" (
     "id" TEXT NOT NULL,
     "title" TEXT NOT NULL,
     "body" TEXT NOT NULL,
     "kind" TEXT NOT NULL DEFAULT 'inbox',
     "ntype" TEXT NOT NULL DEFAULT 'info',
     "audience" TEXT NOT NULL DEFAULT 'all',
     "channels" TEXT NOT NULL DEFAULT '["inbox"]',
     "active" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
   )`,
  `CREATE TABLE IF NOT EXISTS "NoticeRead" (
     "noticeId" TEXT NOT NULL,
     "deviceId" TEXT NOT NULL,
     "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("noticeId","deviceId")
   )`,
  // ستون‌هایی که ممکن است در نسخه‌های قدیمی دیتابیس نباشند
  `ALTER TABLE "VpnConfig" ADD COLUMN IF NOT EXISTS "premium" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "VpnConfig" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'نامشخص'`,
  // رفرال — دعوت دوستان و روزهای هدیه
  `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "refCode" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "referredBy" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "refGiftPending" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "refCount" INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS "Device_refCode_idx" ON "Device" ("refCode")`,
  // اعلان‌ها — نوع، مخاطب و کانال‌های ارسال
  `ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "ntype" TEXT NOT NULL DEFAULT 'info'`,
  `ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'all'`,
  `ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "channels" TEXT NOT NULL DEFAULT '["inbox"]'`,
  `CREATE INDEX IF NOT EXISTS "Order_deviceId_idx" ON "Order" ("deviceId")`,
];

const SQLITE_DDL = [
  `CREATE TABLE IF NOT EXISTS "VpnConfig" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "name" TEXT NOT NULL,
     "link" TEXT NOT NULL,
     "country" TEXT NOT NULL DEFAULT 'نامشخص',
     "active" BOOLEAN NOT NULL DEFAULT true,
     "premium" BOOLEAN NOT NULL DEFAULT false,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS "Device" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "premiumUntil" DATETIME,
     "label" TEXT NOT NULL DEFAULT '',
     "appVersion" TEXT NOT NULL DEFAULT '',
     "refCode" TEXT NOT NULL DEFAULT '',
     "referredBy" TEXT NOT NULL DEFAULT '',
     "refGiftPending" INTEGER NOT NULL DEFAULT 0,
     "refCount" INTEGER NOT NULL DEFAULT 0,
     "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS "Order" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "deviceId" TEXT NOT NULL,
     "plan" TEXT NOT NULL,
     "price" INTEGER NOT NULL,
     "via" TEXT NOT NULL,
     "status" TEXT NOT NULL DEFAULT 'pending',
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS "AppSetting" (
     "key" TEXT NOT NULL PRIMARY KEY,
     "value" TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "Notice" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "title" TEXT NOT NULL,
     "body" TEXT NOT NULL,
     "kind" TEXT NOT NULL DEFAULT 'inbox',
     "ntype" TEXT NOT NULL DEFAULT 'info',
     "audience" TEXT NOT NULL DEFAULT 'all',
     "channels" TEXT NOT NULL DEFAULT '["inbox"]',
     "active" BOOLEAN NOT NULL DEFAULT true,
     "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS "NoticeRead" (
     "noticeId" TEXT NOT NULL,
     "deviceId" TEXT NOT NULL,
     "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY ("noticeId","deviceId")
   )`,
];

let ready: Promise<void> | null = null;

/** یک بار در طول عمر پروسه اجرا می‌شود؛ خطای «جدول وجود دارد» نادیده گرفته می‌شود. */
export function ensureDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const ddl = isSqlite ? SQLITE_DDL : POSTGRES_DDL;
      for (const stmt of ddl) {
        try {
          await db.$executeRawUnsafe(stmt);
        } catch (e) {
          const msg = String(e);
          // فقط خطاهای «از قبل موجود» بی‌خطرند؛ بقیه را لاگ می‌کنیم ولی مسیر را نمی‌بندیم
          if (!/already exists|duplicate/i.test(msg)) {
            console.error("[ensure-db]", msg.slice(0, 300));
          }
        }
      }
    })();
  }
  return ready;
}
