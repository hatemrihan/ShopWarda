# ShopWarda — Production Fix + Custom Bouquet Builder

**Implementation plan.** Evidence-based: every bug below was verified in the code (file:line) and, where possible, in Vercel production logs on 2026-07-31. Execute the phases in order — Phase 0 restores revenue, everything else builds on it.

---

## Ground rules for the implementer

1. **Read the bundled Next.js 16 docs first** (`node_modules/next/dist/docs/` — required by `AGENTS.md`). Version-critical facts already verified against those docs:
   - `params` is a `Promise` in pages/routes (already handled correctly in this repo).
   - Middleware is `proxy.ts` with an exported `proxy()` (already in place at repo root).
   - `revalidateTag(tag, profile)` takes a second profile argument (`lib/cache.ts` already does this).
   - `after()` from `next/server` is available for post-response side effects (`01-app/03-api-reference/04-functions/after.md`) — use it for email dispatch.
   - Cache Components (`cacheComponents: true`, `'use cache'`, `cacheLife`, `cacheTag`) is **not enabled** in `next.config.ts`. The repo runs the *previous* caching model (`01-app/02-guides/caching-without-cache-components.md`). Do not flip it on casually mid-fix; see Phase 4.
2. **Money units.** Server/DB = integer piasters ("minor", `priceMinor`). Client cart context = EGP pounds (floats). `OrderSummary.tsx:13-24` documents the mixed-unit props. Keep the convention; never mix silently.
3. **Architecture.** Feature-sliced: `features/<domain>/{schemas.ts, types.ts, server/{*.service.ts, *.repository.ts, *.actions.ts}}`, `app/` as thin shells, admin mutations through server actions guarded by `requireAdmin()` (`lib/auth/require-admin.ts`). New code follows this.
4. **This is live production.** Each phase must be independently shippable. The bouquet builder ships behind an admin settings toggle.

---

## Phase 0 — Restore orders + emails (P0: the store is losing orders today)

### 0.1 Root cause, confirmed in Vercel logs

Production error clusters (project `shopwarda`, last 7 days):

- `MongooseServerSelectionError: ... Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted` — across `/api/admin/*`, `/admin/orders`, `/product/[slug]`, `/api/auth/[...nextauth]` etc.
- `MongoNetworkTimeoutError: Socket 'secureConnect' timed out after 34000ms` with labels `SystemOverloadedError` — symptom of an overloaded/free-tier cluster.
- All prefixed with *"An error occurred while loading instrumentation hook"* — `instrumentation.ts` awaits `connectDB()` at cold start, so a single failed connect poisons **every route in that lambda**, not just DB routes.

So: **orders never reach MongoDB because Atlas refuses the connection**, and because order creation fails, **no emails are ever attempted**. The email layer has additional independent bugs (0.3).

### 0.2 Ops actions (no code — the store owner must do these; nothing in Phase 0 works without them)

| # | Where | Action |
|---|-------|--------|
| 1 | MongoDB Atlas → Network Access | Add `0.0.0.0/0` (Vercel egress IPs are dynamic; this is the standard Vercel+Atlas setup — auth still requires user/password) |
| 2 | MongoDB Atlas → cluster | `SystemOverloadedError` + `ReplicaSetNoPrimary` on an `ac-*.mongodb.net` cluster suggests the free M0 tier. Upgrade to Flex/M10 for a production store. |
| 3 | MongoDB Atlas → URI | Confirm `MONGODB_URI` includes the database name path (`...mongodb.net/shopwarda?...`). Without it Mongoose writes to the `test` database. |
| 4 | Resend dashboard | Verify the sending domain (DKIM/SPF for `shopwarda.com` or whatever domain is used). Unverified accounts can only deliver to the account owner's own address. |
| 5 | Vercel → Env (Production) | Set: `MONGODB_URI`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL="Warda <orders@shopwarda.com>"`, `ADMIN_EMAILS` (comma-separated), `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, AWS keys. Redeploy after. |

### 0.3 Code fixes

Each item independent; land as one PR.

1. **Make instrumentation non-fatal** — `instrumentation.ts`: wrap the `connectDB()` warm-up in try/catch + log. A cold-start connect failure must not take down every route (this is what produced the "instrumentation hook" prefix on all production errors).

2. **Harden the Mongoose connection** — `lib/db/mongoose.ts:39`: pass options suited to serverless + fail-fast:
   `serverSelectionTimeoutMS: 8000, maxPoolSize: 10, retryWrites: true, appName: 'shopwarda-web'`. Keep `bufferCommands: false`. Keep the rejected-promise reset (already correct).

3. **Fix the `area` validation trap** — `lib/db/models/order.model.ts:82` requires `area`, but the checkout UI treats it as optional (`CustomerInfoForm.tsx:279-289` — no `*`, no validation; `checkout/page.tsx:161-177` doesn't validate it) and the route passes `area: address.area ?? ''` (`app/api/orders/route.ts:246`). **Mongoose `required: true` rejects `''`** → any customer who leaves "Area / District" blank gets a 500 "Failed to create order". Fix: make `area` non-required in the schema (`type: String, default: ''`) and align `IEgyptAddress.area` (`lib/db/types.ts:156`) to `area?: string`.

4. **Fix the duplicate-order swallow** — `app/api/orders/route.ts:80-98`: idempotency hash = `phone + sorted items` with **no time or attempt component**. A returning customer re-ordering the same items forever gets `{duplicate: true}` with the *old* order number and **no new order is created** — silent order loss. Fix: generate `crypto.randomUUID()` client-side per checkout attempt (`checkout/page.tsx` `handleSubmit`), send as `idempotencyKey`, hash server-side; keep a server fallback (hash + day bucket) when absent. Keep the unique index + 11000 recovery (route.ts:337-350) as-is.

5. **Fix email "success" lies** — `lib/email/email.ts`: Resend v6 `emails.send()` **does not throw on API errors** — it resolves `{ data, error }`. Both senders log `✅ ... sent` and return `success: true` even when Resend rejected the call (:141-152, :185-196). Fix: check `res.error`, return failure, log the error payload.

6. **Remove the silent test-mode redirect** — `lib/email/email.ts:19-22, 109-115`: if `RESEND_FROM_EMAIL` is unset, *every* email is re-routed to `RESEND_TEST_RECIPIENT || 'hatemsurf@gmail.com'`. In production this silently discards customer + admin recipients. Fix: test-mode only when `RESEND_TEST_MODE === 'true'`; if `RESEND_FROM_EMAIL` is missing in production, log loudly and still attempt real recipients (delivery is then gated by Resend domain verification, which ops fixes above).

7. **Send emails after the response** — `app/api/orders/route.ts:319-324` awaits both emails before responding (adds seconds to checkout; a slow Resend call risks function timeout *after* the order exists). Use `after()` from `next/server`: create order → respond → dispatch emails in `after(...)`. Persist dispatch outcome on the order (new optional field `emailStatus: { customer?: string; admin?: string }`) so failures are visible in admin instead of vanishing into logs.

8. **Give guests the payment settings** — `checkout/page.tsx:89` fetches `/api/admin/payment-settings`, which returns **401 for guests** (`app/api/admin/payment-settings/route.ts:12-15`). Result: InstaPay account link + instructions are always blank at checkout, and no payment method is auto-selected. Fix: new public `GET /api/payment-settings` returning only `{codEnabled, instaPayEnabled, instaPay:{accountLink, instructions}}`; point checkout at it. (Admin PUT stays where it is.)

9. **Guard the stock decrement** — `app/api/orders/route.ts:283-289` blindly `$inc`s `variants.$.stock` by `-qty`: (a) races can push stock negative; (b) when the variant-id fallback picked a *different* variant (route.ts:117-121), the decrement targets the wrong/missing subdoc. Fix: decrement the **resolved** `variant._id` with a guarded filter (`$elemMatch: { _id, stock: { $gte: qty } }`) when `trackInventory` is true; on miss, log and continue (order still stands — flowers are made to order).

10. **Move promo `usageCount` increment after order creation** — route.ts:218-222 burns usage even if `Order.create` later throws.

**Acceptance (Phase 0):** on production — place a COD order with Area blank → row in Atlas `orders`, admin email arrives at real admin addresses, customer email arrives when provided; same customer re-orders identical items → a *second* order exists; InstaPay instructions render for a logged-out visitor; `/api/health` returns `db: connected`.

---

## Phase 1 — Security lockdown (P0.5 — currently anyone on the internet can read/delete all orders)

Verified: `proxy.ts` skips all `/api/*`; these routes have **no auth check at all**:

| Route | Exposure | Fix |
|-------|----------|-----|
| `GET /api/orders` | Full customer PII of every order | `requireAdmin()` |
| `PATCH /api/orders` | Anyone can change order status | `requireAdmin()` |
| `DELETE /api/orders` | **Anyone can permanently delete orders** | `requireAdmin()` |
| `POST /api/orders/manual` | Forge orders | `requireAdmin()` |
| `GET /api/admin/exports/orders` | CSV of all orders + PII | `requireAdmin()` |
| `GET /api/admin/exports/subscribers` | All subscriber emails | `requireAdmin()` |
| `GET/POST /api/admin/promo`, `GET/PUT/DELETE /api/admin/promo/[id]` | Promo CRUD | `requireAdmin()` |
| `POST /api/send-email` | **Open relay** that sends order-style emails to arbitrary admins/customers | Delete the route (order flow sends server-side; nothing legitimate needs it) — grep for callers first |
| `POST /api/upload/screenshot` | Unbounded S3 upload | Enforce mime allowlist (`image/*`) + ≤5 MB + Upstash rate limit |
| `GET /api/auth/debug` | Auth config introspection | Delete or gate behind `NODE_ENV !== 'production'` |

Also: add a defense-in-depth branch in `proxy.ts` that rejects `/api/admin/*` without a session cookie (cheap, doesn't replace per-route checks). `POST /api/orders` stays public (guest checkout) but gets an Upstash rate limit (`@upstash/ratelimit` is already a dependency; degrade to no-op when Upstash envs are absent).

**Acceptance:** unauthenticated `curl` to each route above returns 401/404; checkout still works logged-out; admin panel still works logged-in.

---

## Phase 2 — Correctness & consolidation (P1)

1. **Fix the PDP variant matcher (customers can be charged the wrong variant price).** `features/catalog/server/product.repository.ts:33-43` builds `options` from **labels** (`o.label`, `v.label`) but `variants[].optionValues` from **keys** (`ov.optionKey/valueKey` — slugified). `product-view.tsx:60-67` compares them → never matches for any multi-word/capitalized value → silently falls back to default variant. Fix in the DTO: `options: [{ key, label, values: [{ key, label, swatchHex }] }]`, `variants[].optionValues` keep keys; PDP selects by key, displays label. While there: render real `swatchHex` (color swatches are hardcoded `#292827` at `product-view.tsx:314-316`).

2. **Cart identity.** `variantsMatch` (`features/cart/context/cart-context.tsx:35-42`) compares only `{name, color}` — distinct configurations merge. Add `variantId` to the identity, plus `configHash` (needed by the bouquet builder, see 3.6).

3. **Fix cart validation endpoint.** `cart-context.tsx:170` fetches `/api/products` — **which does not exist** — so revalidation always no-ops. Point it at the existing `GET /api/products/stock?id=` per unique product (or add a batch endpoint). Low priority but it currently reads as working code.

4. **One order-creation path.** `features/checkout/server/order.service.ts` (server-cart flow, `config/shipping.ts` fees, counter name `'order'`) is a parallel, **unused** implementation that disagrees with the live `POST /api/orders` (DB-settings fees, counter `'orderNumber'`). Extract the live route's logic into `features/checkout/server/` as the single service (`placeOrder(input)` with a pure `computeOrderPricing()` helper — the bouquet builder will extend it), have the route delegate, and delete the dead flow + `config/shipping.ts` fee functions (keep the governorate list; checkout schemas import `getEnabledGovernorates`). Also delete the stub `app/api/checkout/route.ts`.

5. **Kill dead code** (verified unreferenced): `app/(store)/order-confirmation/`, `app/admin/(panel)/categories/category-page-client.tsx`, `components/admin/category-form-dialog.tsx`, `components/admin/data-table.tsx` (0 bytes), `components/shared/image-gallery.tsx`, the React (non-`build*Html`) exports in `components/email-template.tsx`.

6. **Paginate `GET /api/orders`** (currently returns every order ever; admin page already client-filters — give it `?page/pageSize/status` and switch `orderService.listOrders` in).

7. **Success page recap.** `checkout/success/[orderNumber]/page.tsx` shows only the number. Fetch the order server-side (by `orderNumber`) and render items, totals, and — after Phase 3 — bouquet composition. Guard: page shows nothing sensitive beyond what the guest already knows; add no index meta.

8. **Call `ensureAllIndexes()`** (`lib/db/indexes.ts:66` is defined but never invoked): run it inside the instrumentation warm-up after a successful connect (fire-and-forget with catch), so the unique idempotency/SKU indexes actually exist in production.

---

## Phase 3 — Custom Bouquet Builder (the admin's feature)

> Admin's spec, translated: guests compose a bouquet from the Flora collection (roses, peonies, lilies, …). Per flower the admin controls: **color(s), season, availability, price per stem**. Guest picks flowers + stem counts, then **outer wrapping** (paper, silk, …), and optionally **a card with a message** (boxed text input). Admin also wants it to look right in checkout.

### 3.1 Why not the existing options/variants engine

The generic engine (`IOptionDefinition` × `IVariant`) prices whole variants; per-stem additive pricing (`Σ stems×pricePerStem + wrap + card`) has no home there, and the admin form's `generateVariantMatrix` (`components/admin/product-form.tsx:50-63`) cartesian-explodes and **wipes all prices on any option edit**. Use dedicated collections; the builder is a first-class feature, not a product variant.

### 3.2 Data model (new `features/bouquet/`)

**`bouquet-flowers` collection** — one doc per flower type:

```
name (en), nameAr?, slug (unique), pricePerStemMinor (int),
colors: [{ key, label, swatchHex, imageUrl?, available: bool, sortOrder }],
seasons: ['spring'|'summer'|'autumn'|'winter'] (empty = year-round),
available: bool (master toggle, "متوفرة أو لأ"),
media: IProductMedia[] (reuse type), sortOrder, status: 'draft'|'active'|'archived',
timestamps
```

**`bouquet-wraps` collection** — outer wrapping:

```
name, nameAr?, material: string ('paper' | 'silk' | free text),
priceMinor (int), imageUrl, swatchHex?, available: bool, sortOrder, status, timestamps
```

**Settings** — extend `store-settings.model.ts` with:

```
bouquetBuilder: {
  enabled: bool (feature flag — ship dark, flip on when ready),
  minStems: int (default 5), maxStems: int (default 100),
  basePriceMinor: int (arrangement fee, default 0),
  card: { enabled: bool, priceMinor: int (0 = free), maxLength: int (default 200) }
}
```

**Order snapshot** — extend `IOrderItem` (`lib/db/types.ts:140`) with an optional immutable subdoc (never reference live flower docs from an order):

```
customBouquet?: {
  flowers: [{ flowerId, name, colorKey, colorLabel, qty, perStemMinor, lineMinor }],
  wrap: { wrapId, name, material, priceMinor },
  cardMessage?: string,
  basePriceMinor: int
}
```

Additionally populate `selectedOptions` with human-readable lines (`{label: 'Roses — Red', value: '×5'}, {label: 'Wrap', value: 'Blush silk'}`) so the existing admin table, exports, and email `attributes` path (`app/api/orders/route.ts:422-424`) render the composition with zero extra work.

### 3.3 Server logic

- `features/bouquet/schemas.ts` — Zod for admin CRUD + the guest submission (`{ flowers: [{flowerId, colorKey, qty}], wrapId, cardMessage? }`).
- `features/bouquet/server/bouquet.repository.ts` + `bouquet.service.ts` — CRUD + `getActiveCatalog()` (active flowers with available colors, active wraps, settings) + **`priceBouquet(config)`**: re-reads every price from DB, validates availability, min/max stems, card length → returns the priced snapshot. Pure function of (config, catalog) so it's unit-testable.
- `features/bouquet/server/bouquet.actions.ts` — admin server actions (`requireAdmin()` like `catalog.actions.ts`).
- Public catalog read for the storefront page: server component calls the service directly (no fetch); cache with the current model + `revalidateTag` via new `CACHE_TAGS.BOUQUET` in `lib/cache.ts`, invalidated from admin actions.
- **Checkout integration:** cart items carry `kind: 'bouquet'` + the raw config; `POST /api/orders` (the consolidated service from Phase 2.4) branches per item: catalog items keep today's variant path; bouquet items go through `priceBouquet()` — **server recomputes all prices; the client total is display-only**. Bouquet items skip variant stock decrement.

### 3.4 Admin UI (`/admin/bouquet`, nav: `config/admin-navigation.ts` → Catalog group)

Follow the established hand-rolled dark style of `components/admin/product-form.tsx` (`inputClass`, `InputLabel`, `Section`, `bg-white/[0.03]`, `border-white/[0.06]`, `font-mono` money) — *not* the deviating categories page.

- **Flowers tab:** card/table list (image, name, EGP price-per-stem, colors as swatch dots, season chips, availability toggle inline, sort). Editor: name/nameAr, price per stem (EGP input → `Math.round(x*100)` piasters like `product-form.tsx:389`), **color rows** (label + hex swatch picker + optional image via existing `use-media-upload` `'product-media'` purpose + per-color available toggle), season multi-chips (like the category chip toggles at `product-form.tsx:296-308`), status select, media via `MediaGalleryUpload`.
- **Wrapping tab:** same pattern (name, material, price EGP, image, availability, sort).
- **Settings tab:** min/max stems, base fee, card enabled/price/max chars.
- **Orders:** in `app/admin/(panel)/orders/page.tsx` item rendering and `orders/[orderId]/page.tsx`, render `customBouquet` composition as an indented list and the **card message in a highlighted box** — the florist must see the message to handwrite the card. (The generic `attributes` rendering already covers the table view via `selectedOptions`.)

### 3.5 Storefront UI (`/bouquet` — "Build Your Own Bouquet")

Design language (from the live storefront): white bg, Playfair Display for headings (`font-[family-name:var(--font-playfair)]`), Inter body, **uppercase `tracking-widest` micro-labels**, sharp corners (`rounded-none`), black CTAs with the sage `#D0D48D` accent for the final CTA (as `OrderSummary.tsx:203`), `font-mono tabular-nums` for money, generous whitespace like the PDP (`max-w-[1100px]`).

Single scrolling page with numbered sections (mirrors the admin form's stepper pattern and the PDP's IntersectionObserver section tracking):

1. **01 — Choose your flowers.** Responsive card grid (reuse `product-card.tsx` conventions: `aspect-[3/4]`, hover scale). Each card: photo, name, `EGP x / stem`, color swatches (real `swatchHex`), − / count / + stepper. Out-of-season/unavailable → dimmed card with an uppercase "BACK IN SEASON SOON" ribbon, not hidden (merchandising). Selecting a color with its own image swaps the card photo. Sticky mini-bar shows running stem count vs `minStems` ("3 OF 5 STEMS MINIMUM").
2. **02 — Choose your wrapping.** Radio cards: image, name, material tag, `+EGP x`. Single choice, required.
3. **03 — Add a card.** Toggle "ADD A HANDWRITTEN CARD" (+price if configured) revealing a bordered box: textarea, live character counter (`maxLength`), serif preview of the message ("your message, in our handwriting").
4. **Summary rail** (desktop right column, mobile sticky bottom sheet — same split as checkout): composition lines (`5 × Rose — Red … EGP 250`, mono), wrap line, card line, base fee, total; CTA `ADD TO BAG · EGP {total}` on `#D0D48D`; disabled with reason until minStems + wrap chosen.

Entry points: navbar link, homepage hero slide/section ("FRESH BOUQUETS" hero already exists — `components/sections/hero.tsx`), and a builder tile on the Flora category page.

### 3.6 Cart & checkout display

- `CartItem` (`cart-context.tsx:10-20`) gains `kind?: 'catalog' | 'bouquet'`, `customization?: BouquetConfig`, `configHash: string` (stable stringify → hash; part of identity per Phase 2.2). Name: `"Custom Bouquet (12 stems)"`, image: wrap or first-flower photo.
- Cart drawer + `OrderSummary.tsx` item rows: render composition sublines under the item (small `text-neutral-500` lines) + `✉ Card included` marker. Two different bouquets must appear as two lines (configHash identity).
- Checkout POST body: bouquet items send `{ kind: 'bouquet', config, quantity }` instead of `productId/variantId`.

### 3.7 Emails

Extend `buildOrderEmailHtml` / `buildAdminOrderEmailHtml` (`components/email-template.tsx:237,295`):
- Render full composition lines per bouquet item (already carried via `attributes`/`selectedOptions` — render `attributes`, which the templates currently ignore).
- **Card message as its own boxed block in the admin email** (fulfillment-critical).
- While in there: render `promoCode` (in props, never rendered) and the customer's `deliveryNotes`.

**Acceptance (Phase 3):** admin creates 3 flowers (one out-of-season) + 2 wraps; storefront builder enforces min stems, shows live total; server-priced total matches for tampered client payloads (manual curl with fake prices → server price wins); two differently-configured bouquets appear as separate cart lines; order in admin + both emails show full composition + card message; feature invisible when `bouquetBuilder.enabled=false`.

---

## Phase 4 — Performance, scalability, architecture (iterative)

1. **Caching:** stay on the current model for now; ensure catalog reads used by `/`, `/shop`, `/product/[slug]`, `/categories/*` are tag-cached and invalidated by the existing `lib/cache.ts` helpers (admin actions already call them). Adopting `cacheComponents: true` is a separate, deliberate migration — follow `migrating-to-cache-components.md` in the bundled docs; do not mix it into bug-fix PRs.
2. **Order write integrity:** wrap order create + stock decrements in a Mongoose session/transaction (Atlas replica set supports it); fallback: the Phase 0.3.9 guarded `$inc` + compensation log.
3. **Rate limiting:** Upstash (`@upstash/ratelimit` already installed) on `POST /api/orders`, `/api/contacts`, `/api/promo/validate`, `/api/upload/screenshot`; no-op gracefully without env.
4. **Observability:** Sentry envs exist but no SDK is wired — add `@sentry/nextjs` init in `instrumentation.ts` + `captureException` in order-route catches; keep `lib/logger`. Point an uptime monitor at `/api/health`.
5. **Admin dashboard queries:** audit `features/dashboard/server/dashboard.data.ts` and orders GET for unindexed scans; indexes exist for the main queues once Phase 2.8 lands.
6. **Images:** grids should pass `sizes` to `next/image`; bouquet-builder images go through the existing S3 + `next.config.ts` remote patterns.
7. **Tests (currently `tests/` is empty):** minimum viable safety net — unit: `priceBouquet()`, `computeOrderPricing()`, promo math; integration (mongodb-memory-server): `POST /api/orders` happy path, empty-area, duplicate idempotency key, tampered bouquet price; keep in `tests/unit` + `tests/integration`.
8. **Consistency sweep:** counter names unified (Phase 2.4), `sortOrder` vs `displayOrder` naming (category model vs DTO), the two category admin implementations → keep the full-featured `components/admin/category-form.tsx` path, fold image-only quick-edit into it.

---

## Environment variable checklist (production)

| Var | Required | Note |
|-----|----------|------|
| `MONGODB_URI` | ✅ | Must include `/dbname`; Atlas allowlist must permit Vercel |
| `RESEND_API_KEY` | ✅ | |
| `RESEND_FROM_EMAIL` | ✅ | Verified domain; absence currently triggers silent test-mode (removed in 0.3.6) |
| `ADMIN_EMAILS` | ✅ | Comma-separated; merged with active DB admins (`lib/auth/route.ts`) |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | ✅ | Admin login |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE` | ✅ | Media + InstaPay proofs |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ◻ | Enables rate limiting |
| `NEXT_PUBLIC_SENTRY_DSN` + Sentry vars | ◻ | Phase 4 observability |
| `RESEND_TEST_MODE` | ◻ | Only explicit `'true'` reroutes recipients after 0.3.6 |

Hardcoded fallback to scrub while touching these files: `alkady.s3.us-east-1.amazonaws.com` in `app/api/orders/route.ts:438` (foreign bucket from another project) — build the proof URL from the configured bucket/CloudFront instead.

---

## Suggested PR sequence

1. **PR 1 (Phase 0.3):** connection + instrumentation + order-route fixes + email correctness. *Ships with ops actions done.*
2. **PR 2 (Phase 1):** auth on exposed routes + route deletions + rate limits.
3. **PR 3 (Phase 2):** variant matcher, cart identity, order-path consolidation, dead code, pagination, success recap, index bootstrap.
4. **PR 4 (Phase 3, dark):** models + admin bouquet management behind `enabled` flag.
5. **PR 5 (Phase 3):** storefront builder + cart/checkout/email rendering; flip flag when the admin has seeded flowers + wraps.
6. **PR 6+ (Phase 4):** transactions, Sentry, tests, caching — iterative.
