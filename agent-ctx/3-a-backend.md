# Task 3-a — Backend Additions (Mianboor v2.0.0 follow-up)

Agent: backend-a (parallel package A)
Scope owned: prisma/schema.prisma, src/lib/**, src/app/api/**
Status: ✅ COMPLETE — lint clean, tsc clean, prisma client generated

## 1. Schema change (prisma/schema.prisma)

Added model `TgProxy` exactly as specified:

```prisma
model TgProxy {
  id        String   @id @default(cuid())
  title     String
  server    String
  port      Int
  kind      String   @default("mtproto") // "mtproto" | "socks"
  secret    String?
  country   String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

`npx prisma generate` ran successfully → `db.tgProxy` available via `src/lib/db.ts`.

## 2. src/lib changes

- **src/lib/ensure-db.ts** — appended `TgProxy` `CREATE TABLE IF NOT EXISTS` DDL to BOTH
  `POSTGRES_DDL` and `SQLITE_DDL` arrays (project's self-healing deployment convention, so
  production Neon/Vercel creates the table with zero manual steps).
- **src/lib/tg-proxies.ts** (NEW) — shared `TgProxyItem` type + `TG_PROXY_FALLBACK`
  constant with the exact 3-item fallback list (tp1 fi / tp2 nl / tp3 tr) used by both routes.
- **src/lib/ai-chat.ts** — pre-existing tsc errors fixed (2 type casts at the SDK fallback
  call site, lines 64–67; zero runtime change). File is in my ownership; errors were there
  before my work.

## 3. Routes

### NEW — GET /api/client/telegram/proxies
`src/app/api/client/telegram/proxies/route.ts`
- Auth: identical to api/client/configs — `token` query param checked against `clientToken()` → 401 `{ok:false,error:"توکن نامعتبر"}`; optional `device=MB-…` upserts `lastSeenAt`.
- Success: `{ ok:true, proxies:[{id,title,server,port,kind,secret,country}] }` — only `active:true`, newest first, `Cache-Control: no-store`.
- DB failure: **HTTP 200** `{ ok:false, demo:true, proxies: TG_PROXY_FALLBACK }`.
- Note: in local dev the sqlite URL + postgres-typed client throws, so this route naturally serves the demo fallback locally — by design.

### NEW — /api/admin/tgproxies
`src/app/api/admin/tgproxies/route.ts` (guard: `isAdminReq` — cookie or x-admin-key, same as other admin routes)
- `GET` → `{ ok:true, proxies:[...] }` (all rows, newest first); DB failure → HTTP 200 `{ ok:false, demo:true, proxies: TG_PROXY_FALLBACK }`.
- `POST {title,server,port,kind?,secret?,country?}` → validates title/server non-empty, port 1–65535, kind normalized to `mtproto|socks` (default mtproto); empty secret/country → null. Returns `{ ok:true, proxy }`; 400 on bad body.
- `DELETE ?id=…` → `{ ok:true }`; 400 if id missing; 404 `{ok:false,error:"پروکسی پیدا نشد"}` if not found.

### CHANGED — /api/admin/configs (POST) — gift-country
- Destructures additional optional `countries` array. Country resolution per created config,
  **stored verbatim, no auto-detection/overwrite**:
  `countries[i]` (if non-empty string) → shared `country` (if non-empty string) → `"نامشخص"`.
- Admin sending `country:"gift"` (or per-line) now lands verbatim in `VpnConfig.country`.

### CHANGED — /api/admin/configs/[id] (PATCH)
- Now accepts `country` alongside `active`/`premium`: `data.country = String(country).trim() || "نامشخص"`. `"gift"` is stored verbatim.

## 4. Production DB sync — ❌ NOT RUN (URL not found)

Checked `.env` / `.env.local` / `.env.production` / `.env.production.local`:
- Only `.env` exists: `DATABASE_URL=file:/home/z/my-project/db/custom.db` (local SQLite, no postgresql://).
- No `.env.local`, no `.env.production`. `grep -r "postgresql://" .env*` → no match.
- Therefore `DATABASE_URL=<url> npx prisma db push` was **not executed** — no postgres URL available in this sandbox.
- Mitigation: the TgProxy DDL added to `ensure-db.ts` covers production table creation automatically on first request (project convention). Side note (pre-existing, unchanged): `prisma validate` locally errors because schema provider is postgresql while local .env is file: — same before my work.

## 5. Verification

- `bun run lint` → **PASS** (zero output, zero errors/warnings).
- `bunx tsc --noEmit` → **PASS** (clean after ai-chat.ts fix).
- `npx prisma generate` → success; schema parses with TgProxy.
- dev.log: **file does not exist** and no `next dev` process is running in this sandbox, so no compile-log confirmation possible; verified via tsc instead. Did not start/stop anything per instructions.
- No files touched outside ownership (android/, src/components/, page.tsx, mini-services/, .github/ untouched; no git commands; no test code in project).
