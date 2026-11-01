# Task 3-c — Web Demo Mirror (8 changes, Mianboor Persian demo)

Agent: web-demo-c (parallel package C)
Scope owned: `src/app/page.tsx`, `src/components/demo/**`
Status: ✅ COMPLETE — `bun run lint` PASS (zero output), `bunx tsc --noEmit` PASS

## Change 1 — Origin-IP bar removed (home) + pipeline cleaned
- `components/demo/user-screens.tsx` · HomeScreen: deleted the origin-IP bar (old :318–332); removed
  `origin` prop + gear `onOpenSettings` prop from destructure/type; connect flash now consumes only
  `flashOrigin` (`COUNTRIES[flashOrigin?.country ?? "ir"]`) — «از ایران به …» flash unchanged.
- `src/app/page.tsx`: removed `DEST` const, `destResolved` state, its 2s timeout in the flash effect
  (kept `showFlash` logic + 4500ms hide), and the `origin={...}`/`onOpenSettings={...}` props at the
  HomeScreen call site. `ORIGIN` kept only for `flashOrigin={ORIGIN}`. `i18n.yourIp` key left in place
  (harmless, part of `typeof en` shape).

## Change 2 — App name slightly lower
- `page.tsx` phone status/header row: `pt-4` → `pt-6` (+8px top offset; header at ~:1102).

## Change 3 — Bottom nav = 4 items
- `page.tsx`: added lucide `Settings` import; 4th `NavBtn icon={Settings} label={t.settings}`
  («تنظیمات») added AFTER اکانت, `active={screen === "settings"}`, opens settings screen.
  5-second admin hold on اکانت untouched (`startHold/endHold/accountClick/HOLD_MS`).
- `user-screens.tsx`: removed the gear button from home header (old :188–195) + unused `Settings`
  import. Also updated the onboarding step copy and marketing copy that referenced
  «چرخ‌دنده بالای خانه» → «تب «تنظیمات» در نوار پایین» so the guide stays truthful.

## Change 4 — Settings order + SNI explainer
- `components/demo/settings-screen.tsx` fully reordered to exactly:
  1 زبان → 2 تم (5 swatches) → 3 محافظت اتصال (Kill Switch/Failover/اتصال مجدد) →
  4 حالت ضد فیلترینگ + explainer «با تکه‌تکه کردن دستور TLS، بازرسی و فیلترینگ SNI را دور می‌زند —
  روی سرورهای TLS/Reality اثر واقعی دارد.» (i18n `stealthSni`) → 5 DNS → 6 پینگ زنده →
  7 PhoneExtrasCard → 8 حمایت/پشتیبانی → 9 حریم خصوصی → 10 درباره → 11 آزمایشگاه دمو →
  (demo extra) شبیه‌سازی نصب مجدد kept last.

## Change 5 — DNS live-apply feedback
- `settings-screen.tsx`: new props `vpnOn`, `onDnsLive`; `pickDns()` — connected → `onDnsLive()`;
  disconnected → subtle hint «در اتصال بعدی اعمال می‌شود» (`dnsApplyNext`) under the 4-way grid,
  auto-hides after 6s. Active-DNS chip on card header: «فعال: Cloudflare DoH» … (`dnsActive` +
  computed label; custom shows the typed IP).
- `page.tsx`: `tunnelRestart` state + `applyDnsLive()` — toast «DNS جدید اعمال شد — تونل یک لحظه
  ری‌استارت می‌شود» + 1s `restarting` flag (timer ref cleaned up on unmount + in `reset()`).
- `user-screens.tsx` HomeScreen: new `restarting` prop — connect ring switches to the existing
  `spin-ring` style and the timer line shows spinner + «در حال ری‌استارت تونل…» for that 1s.

## Change 6 — Golden gift flag + gift config
- `flag.tsx`: `COUNTRIES.gift = "هدیه"`; `BODIES.gift` = circular gold-gradient SVG
  (#FFD54A→#C8A215 linear gradient, darker #8A6D08 border ring) with gift-box glyph
  (light box + gold ribbon cross + lid + bow loops/knot).
- `page.tsx` SEED: `{ id:13, name:"کانفیگ هدیه ویژه", country:"gift", protocol:"VLESS",
  host:"gift.mianboor.app", ping:52, premium:false, enabled:true }` — visible in the Free tab
  (green ping zone; Smart-Connect best remains NL@28).
- `user-screens.tsx` ServersScreen row: gift rows show sub-line «کانفیگ هدیه — لوکیشن نامشخص»
  (`giftCfg`) instead of protocol + `title` tooltip on the row.
- `admin-screens.tsx` AddConfigSheet country selector: golden-flag chip with caption
  «هدیه (نامشخص)» (aria/title same), stores `country:"gift"`; name fallback for gift =
  «کانفیگ هدیه».

## Change 7 — Telegram proxies (user sheet + admin card)
- `types.ts`: new `TgProxy` interface + `TG_PROXY_FALLBACK` with the EXACT 3-item fallback list
  (tp1 طلایی/fi/64 · tp2 اروپا/nl/98 · tp3 ترکیه/tr/143) — shared by user + admin demos.
- `user-screens.tsx` HomeScreen: compact pill «پروکسی تلگرام» (Send icon) placed below the
  download/upload stats grid, start-aligned (sits under the download column; logical direction so
  it's correct in both LTR/RTL). Opens a bottom sheet matching existing sheet styles
  (`sheet-in`, rounded-t-3xl, X close, list `max-h-96 overflow-y-auto scroll-hide`).
  Fetch: relative `GET /api/client/telegram/proxies` with header `x-demo-user: demo-user`,
  fully guarded (never throws; ok:false / demo:true / bad body / network fail → fallback).
  Rows: flag + title + `server:port` (ltr mono) + ping with existing `pingTone` zones
  (≤110 glow / ≤200 gold / >200 danger) + «سریع‌ترین» badge on lowest ping. Tap → 1.2s
  spinner + «در حال اتصال…» → success toast «سریع‌ترین پروکسی به تلگرام اضافه شد — تلگرام را باز
  کنید» (via new `onToast` prop wired to the page toast) → row becomes «متصل ✓». Footer note:
  «این پروکسی فقط داخل تلگرام کار می‌کند؛ بقیه اپ‌ها از اینترنت عادی می‌روند.»
- `admin-screens.tsx`: new `TgProxiesCard` rendered inside the Configs tab (below config list).
  GET `/api/admin/tgproxies` (same header) on mount → success list or fallback + «حالت دمو» badge.
  Add form (title/server/port/kind mtproto|socks/secret) → `POST /api/admin/tgproxies`
  (JSON body) → success toast, or local append + toast «حالت دمو» when API unavailable.
  Delete (Trash2) → `DELETE /api/admin/tgproxies?id=…` → success or local remove + «حالت دمو».
  List clamped to `max-h-96 overflow-y-auto`.
  - **API-down behavior (verified against 3-a's record):** backend guard `isAdminReq` returns 401
    in the demo → `r.ok === false` → fallback list shown, badge «حالت دمو», add/delete apply
    locally with the «حالت دمو» toast. Client route (no token) → 401 `{ok:false}` → same fallback.
    Response shapes `{ok:true, proxies:[...]}` / `{ok:false, demo:true}` parsed accordingly.

## Change 8 — i18n & regression safety
- `i18n.ts` new keys (en + fa): `stealthSni, dnsActive, dnsAppliedLive, tunnelRestarting,
  dnsApplyNext, tgProxy, tgProxiesTitle, tgProxiesSub, tgFastest, tgProxyAdded, tgProxyNote,
  demoMode, giftCfg`.
- No regressions: all existing screens/props intact; `AccountScreen`, `ServersScreen` extras,
  sheets, chaos lab, OTA, notices untouched; lint + tsc clean; removed props fully cleaned from
  both call sites and definitions.

## Verification
- `bun run lint` → PASS (no output).
- `bunx tsc --noEmit` → PASS.
- dev.log: **does not exist** — no `next dev` process in this sandbox (only the telegram-bot
  mini-service `bun run dev` is running). Did not start/stop anything per instructions; compile
  safety verified via tsc + eslint instead.
- Coordination: consumed `/agent-ctx/3-a-backend.md` — route paths, `x-demo-user` header, response
  shapes (`ok`/`demo`/`proxies`), POST/DELETE contracts all match; demo degrades to fallback by
  design when auth/DB is unavailable in the sandbox.
- Untouched: android/, prisma/, src/app/api/**, mini-services/, .github/ · no git commands · no
  version bumps · no test code.
