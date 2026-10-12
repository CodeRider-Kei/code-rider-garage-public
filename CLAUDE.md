# CLAUDE.md

## 1. Project overview

This project is a mobile-first web application for motorcycle owners to record and manage motorcycle maintenance history.

- Project name: `bike-maintenance`
- Repository: Private GitHub repository
- Initial target: Japanese motorcycle owners
- Primary goal: Release a small MVP quickly, recruit initial test users, and validate actual demand
- Monetization: A one-time "support the app" Stripe Checkout payment shipped 2026-08-18 (see 5.4); subscriptions/paid feature gating are still not implemented — consider those only after usage and demand are confirmed
- Current status (as of 2026-08-16): The MVP defined in section 5 is complete and the app is publicly live as a beta (β) under the Code Rider brand (operator: デジタルライド, blog: https://code-rider.com). Implementation has already gone beyond the original MVP scope — see "5.1 Implemented beyond MVP" below. New features are not started without an explicit request.

## 2. Product principles

- Prioritize release speed and user validation over feature completeness
- Do not add features that are not required for the current milestone
- Keep the interface simple and optimized for smartphones
- Protect user data by default
- Prefer maintainable, conventional implementations over unnecessary abstraction
- Do not implement payments, subscriptions, image uploads, notifications, CSV export, or social features unless explicitly requested for the current task. Treat "MVP" in this document as the completed baseline, not as "everything currently allowed." As of 2026-08-18 a one-time Stripe payment ("support the app") is implemented (5.4) because it was explicitly requested; subscriptions/recurring billing and feature gating behind payment are explicitly **not** requested yet and must not be added speculatively.

## 3. Technology stack

- Next.js with App Router
- TypeScript
- Tailwind CSS with shadcn/ui components (`components/ui/`)
- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security
- Recharts (cost analysis charts)
- Supabase CLI (`supabase/migrations/`, linked project for `supabase db push` / `supabase db diff`)
- Stripe (`stripe` Node SDK, one-time Checkout only — see 5.4)
- Sentry (`@sentry/nextjs`, error/performance monitoring — see 5.5)
- Netlify (migrated from Vercel — see 5.8)
- pnpm

The project was created from the `with-supabase` Next.js starter template. Preserve and reuse the existing Supabase authentication structure where practical.

## 4. Environment variables

The following variables are stored in `.env.local` for local development and must also be configured in Netlify for deployment.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

`SUPABASE_SECRET_KEY` is the Supabase admin (service role) key. It is server-only, must never begin with `NEXT_PUBLIC_`, and is currently used exclusively by `lib/supabase/admin.ts` (guarded by the `server-only` package so it cannot be imported from a Client Component) to call `auth.admin.deleteUser()` during account deletion (`app/account/actions.ts`) and, as of 2026-08-18, by the Stripe webhook handler (`app/api/stripe/webhook/route.ts`, see 5.4), and as of 2026-08-24 by the login lockout Server Action (`app/auth/login/actions.ts`, see 5.12). Do not widen its usage without a specific reason — most operations should go through the regular RLS-protected client instead.

`STRIPE_SECRET_KEY` is server-only, must never begin with `NEXT_PUBLIC_`, and is used exclusively by `lib/stripe/server.ts` (also guarded by `server-only`) inside `app/support/actions.ts`. Prefer a Restricted Key (`rk_...`) scoped to Checkout Sessions creation only, not a full secret key (`sk_...`). `STRIPE_WEBHOOK_SECRET` is server-only and used exclusively by `app/api/stripe/webhook/route.ts` to verify Stripe's signature. Never log either, never echo them back to the user in chat, and never hardcode a key value in source — they only ever come from the environment. See 5.4.

`NEXT_PUBLIC_SENTRY_DSN` is not secret (Sentry DSNs are designed to be public, like any client-side telemetry key) but `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` (the last one is server-only and used only at build time for source map upload) are all optional — leaving any of them unset disables Sentry entirely rather than erroring. See 5.5.

Rules:

- Never commit `.env.local`
- Never expose a Supabase Secret key, legacy `service_role` key, or Stripe secret/restricted key
- Never place privileged keys in variables beginning with `NEXT_PUBLIC_`

## 5. MVP scope

### Authentication

- Sign up
- Sign in
- Sign out
- Use the authentication implementation provided by the Supabase starter where possible

### Motorcycle management

Authenticated users can:

- Register a motorcycle
- View their registered motorcycles
- Edit their motorcycle information
- Delete a motorcycle

Motorcycle fields (MVP baseline):

- Display name
- Manufacturer
- Model
- Current mileage

These have since been extended — see "5.1 Implemented beyond MVP" below.

### Maintenance record management

Authenticated users can:

- Register a maintenance record for one of their motorcycles
- View maintenance records
- Edit a maintenance record
- Delete a maintenance record

Maintenance record fields:

- Maintenance date
- Category
- Mileage
- Cost
- Note

Suggested initial categories:

- Engine oil
- Oil filter
- Tires
- Chain
- Brake pads
- Battery
- Inspection
- Other

Do not over-engineer the category system. A text field or simple fixed list is acceptable for the MVP.

### 5.1 Implemented beyond MVP (as of 2026-08-16)

The features below were built after the original MVP milestones were satisfied. This list exists so future work doesn't accidentally re-propose something that already exists, and so this document stays a reliable map of the app — keep it updated when scope changes (see section 14).

- **Motorcycle fields extended**: `displacement_cc` (排気量), `bike_type` (`lib/motorcycle.ts` `BIKE_TYPES`), `icon_color`, `mileage_recorded_on` (the date the current mileage was last confirmed, distinct from `updated_at`).
- **Maintenance cycle settings** (`maintenance_cycle_settings` table, `/motorcycles/[id]/cycle-settings/new`, `/cycle-settings/[id]/edit`): per-motorcycle, per-item distance/period intervals (e.g. "エンジンオイル交換, every 3,000km or 6 months") that drive automatic schedule calculation.
- **Maintenance schedules** (`maintenance_schedules` table, `lib/maintenance-schedule.ts`, `/schedules/[id]/edit`): a due-date/due-mileage record per item. Rows linked to a cycle setting (`cycle_setting_id` not null) are recalculated automatically whenever a matching maintenance record is saved, via the Postgres functions `create_maintenance_record_with_schedule` / `update_maintenance_record_with_schedule` (atomic: record insert/update + mileage bump + schedule upsert in one transaction, `SECURITY INVOKER` so RLS still applies). Manual schedules (`cycle_setting_id` null) can also be created directly.
- **Due status + maintenance calendar**: `overdue` / `due_soon` (30 days, or within 10% of the distance interval) / `ok`, shown as badges and as a month-grid calendar per motorcycle (`components/maintenance-calendar.tsx`, `lib/calendar.ts`). All date comparisons are pinned to `Asia/Tokyo` regardless of server/browser timezone (`getTodayDateString` in `lib/maintenance-schedule.ts`) — keep using that helper rather than `new Date()` directly for due-date logic.
- **Cost analysis** (`lib/cost-analysis.ts`, `components/cost-analysis.tsx`): last-12-months bar chart and category-breakdown pie chart, computed per motorcycle from a single minimal-column query (no client-side full-row fetch). As of 2026-08-17 the component is source-agnostic (see 5.3) rather than maintenance-only.
- **Quick mileage update** (`lib/motorcycle-mileage.ts`, `components/quick-mileage-update-button.tsx`): updates a motorcycle's current mileage directly (not tied to a maintenance record), with confirmation required if the new value is lower than the current one. The code intentionally centralizes this as "the common entry point" for mileage changes, anticipating a future fuel-log/odometer-entry feature reusing the same path.
- **Account deletion** (`/account`, `app/account/actions.ts`): self-service account + cascading data deletion via the Supabase admin client, plus password change.
- **Privacy policy and terms of service** (`/privacy`, `/terms`): published, referencing `lib/site-config.ts` for operator/brand/contact details.

### 5.2 Cost tracking beyond maintenance (as of 2026-08-16, revised same day)

Requested next: expand cost-of-ownership tracking beyond wrench maintenance. The end goal stated by the user is a top-level cost-ratio breakdown across **整備 (maintenance) / カスタム (custom) / 保険 (insurance) / ローン (loan)** — so each of these is being built as its own table/screen rather than folded into `maintenance_records`, even where that means more duplicated CRUD scaffolding. Implemented so far:

- **Custom part costs** (`custom_parts` table, `lib/custom-part.ts`, `/motorcycles/[id]/custom-parts/new`, `/custom-parts/[id]/edit`): a table fully separate from `maintenance_records`, not a category on it. This is a reversal of the first implementation attempt, which added a "カスタム" category plus optional `part_name`/`brand`/`shop_name` columns directly to `maintenance_records` — that was scrapped (before the migrations were ever applied to production) because a shared category field forces an artificial either/or choice for wear-item upgrades (e.g. replacing a chain with an aftermarket one: is it "チェーン" or "カスタム"?). Full table separation doesn't eliminate that judgment call, but it moves it to "which screen do I open," which the record form nudges with a hint: same-spec/like-for-like replacement → maintenance record, aftermarket/upgrade → custom part. As of 2026-08-17 custom part cost **is** folded into the shared cost analysis (see 5.3) — this superseded the original "not folded in yet" scope cut.
- **Insurance policies** (`insurance_policies` table, `lib/insurance.ts`, `/motorcycles/[id]/insurance/new`, `/insurance/[id]/edit`): a separate table, not a `maintenance_records` category, because a policy is a period (`period_start`–`period_end`) rather than a mileage-linked event. Renewal due status reuses `getDueStatus` from `lib/maintenance-schedule.ts` against `period_end` (same `DUE_STATUS_LABEL`/`DUE_STATUS_BADGE_CLASS`, now exported from that file so both the maintenance schedule card and the insurance card share one badge style). As of 2026-08-17 insurance premium cost **is** folded into the shared cost analysis (see 5.3); it is still not folded into the maintenance calendar.
- **Fuel log** (`fuel_records` table, `lib/fuel-record.ts`, `/motorcycles/[id]/fuel/new`, `/fuel/[id]/edit`): implemented 2026-08-21, see 5.9. This was the planned next phase (custom + insurance first, fuel after) referenced in earlier revisions of this section.
- **Loan/financing cost** (`loans` table, `lib/loan.ts`, `lib/loan-calculation.ts`, `/motorcycles/[id]/loans/new`, `/loans/[id]/edit`): implemented 2026-08-21, see 5.10.
- Not yet scoped, noted only: vehicle tax (自動車税), which for motorcycles is a fixed table keyed on `displacement_cc` with essentially no year dependency, so auto-calculation from the existing `displacement_cc` field looks feasible if/when this is built.

### 5.3 Motorcycle detail split, insurance redesign, mileage confirmation, free-tier limit (as of 2026-08-17)

Driven by user feedback that the single motorcycle detail page had grown too long, and a few related small requests bundled into the same session:

- **Motorcycle detail page split into sub-pages**: `/motorcycles/[id]` is now a slim overview (info card, up to 3 nearest-due maintenance items via `MaintenanceScheduleCard`, up to 3 insurance policies whose `period_end` is due/overdue via `InsurancePolicyCard`, and a 2x2 menu of card-links with item counts) rather than one long scrolling page. Both near-due sections share the same `NEAR_DUE_ITEM_LIMIT` cap and are hidden entirely when empty; each links to its full list page ("〜ページですべて見る") when more items exist than the cap shows. The previous content moved to dedicated list pages: `/motorcycles/[id]/maintenance` (cycle settings, calendar, mileage-only schedules, records+filters — everything that was already reachable via `/motorcycles/[id]/maintenance/new`), `/motorcycles/[id]/custom-parts` (list; coexists with `/motorcycles/[id]/custom-parts/new`), `/motorcycles/[id]/insurance` (list; coexists with `/motorcycles/[id]/insurance/new`), and `/motorcycles/[id]/analysis` (cost analysis + mileage chart, see below). Each page independently re-checks ownership and fetches only what it needs, following the same pattern already used by every `.../new` and `.../edit` page — no shared layout/data-fetching was introduced. `components/maintenance-calendar.tsx` takes an explicit `basePath` prop now (was hardcoded to `/motorcycles/${id}`) so its prev/next-month and date links work correctly under `/motorcycles/[id]/maintenance`.
- **Bike icon preview**: `components/motorcycle-form.tsx` now holds `bike_type`/`icon_color` as controlled state and renders a live `MotorcycleTypeIcon` preview as the user picks a type/color, instead of only seeing the result after saving.
- **Cost analysis now covers all three cost sources**: `components/cost-analysis.tsx` was generalized from a maintenance-only component into a reusable one (`title`, `costLabel`, `emptyMessage`, `hasData`, `monthlyData?`, `categoryData` props; omitting `monthlyData` renders a category-only view with no monthly tab). `lib/cost-analysis.ts`'s `aggregateMonthlyCost` now takes a generic `{ date, cost }[]` (was hardcoded to `maintenance_date`). `/motorcycles/[id]/analysis` renders four tabs: 全体 (a "整備"/"カスタム"/"保険" breakdown built by feeding synthetic source-labeled rows through the existing `aggregateCategoryCost`), 整備 (unchanged: monthly + `MAINTENANCE_CATEGORIES` breakdown), カスタム (monthly by `purchase_date` + `CUSTOM_PART_CATEGORIES` breakdown), and 保険 (category-only view using `INSURANCE_TYPE_LABEL` as the "category", no monthly tab since a policy premium isn't a per-event cost). This supersedes the "not folded into cost analysis yet" notes in 5.2.
- **Mileage-over-time chart** (`lib/mileage-analysis.ts`, `components/mileage-history-chart.tsx`, shown below the tabs on `/motorcycles/[id]/analysis`): there is no dedicated mileage log table, so this is built from whatever dated mileage readings already exist — `maintenance_records.mileage` (when entered) plus the motorcycle's current `(mileage_recorded_on, current_mileage)` as an implicit final point — bucketed into a monthly bar chart of the distance covered between consecutive readings (delta clamped to ≥0). Explicitly an approximation ("目安"), not an accurate log; documented as such in the UI. `getLast12MonthKeys` was extracted from `lib/cost-analysis.ts` (now exported) so both files share the same 12-month window logic.
- **Insurance form redesign**: `policy_number` was removed entirely (input, type field, DB column, and its length CHECK) per user request — collecting a policy number felt like an unnecessary privacy/security liability for a field that wasn't load-bearing for the app's own logic. In its place, `payment_frequency` (`'monthly' | 'yearly'`, `INSURANCE_PAYMENT_FREQUENCIES`/`INSURANCE_PAYMENT_FREQUENCY_LABEL` in `lib/insurance.ts`) was added; `premium_cost` is now documented/labeled as "the amount for whichever frequency was selected" (monthly amount if 月払い, annual amount if 年払い). No frequency-aware conversion (e.g. monthly-equivalent normalization) is implemented yet — only the data model changed. Because `insurance_policies` was already applied to production by the time this was built (see 6.2), this shipped as a new migration (`20260817090000_insurance_policies_redesign.sql`) rather than editing the original create-table migration.
- **Mileage default + "lower than current" confirmation on maintenance records and custom parts**: the mileage `Input` on both the maintenance record form and the custom part form now defaults to the motorcycle's current mileage for **new** entries (edit forms still default to the record's own stored value). If the submitted mileage is lower than the motorcycle's current mileage, the Server Action returns `needsConfirmation: true` instead of blocking outright (past-dated entries are a legitimate use case) — the form then shows a "register anyway" checkbox (`name="force"`) that must be checked to resubmit. This reuses the exact same UX pattern already shipped for quick mileage update (`lib/motorcycle-mileage.ts` `applyMileageUpdate`), factored out into `lib/mileage-confirmation.ts` (`checkMileageAgainstCurrent`) so all four call sites (maintenance record create/update, custom part create/update) share one implementation. Quick mileage update itself was not changed — it already worked this way.
- **Free-tier limit: 1 motorcycle per user** (`FREE_MOTORCYCLE_LIMIT` in `lib/motorcycle.ts`, currently `1`): registration is capped app-side only — checked in `createMotorcycle` (`app/motorcycles/new/actions.ts`) and pre-checked on `/motorcycles/new` (shows a message instead of the form once at the limit), with the dashboard's "＋ バイクを登録" button hidden once the limit is reached. This is deliberately **not** enforced at the DB layer (no CHECK/trigger) — it's an app-level product rule whose value may change in the future, so it's kept as a single constant that's easy to adjust. It is a soft product limit, not a security boundary — it protects no user's data, so app-level enforcement was judged sufficient. If it ever needs to be strict, move it into an RLS `with check` or trigger. User-facing copy simply states the current limit (N motorcycles).

### 5.4 Stripe: one-time "support the app" payment (as of 2026-08-18, revised same day)

**Only a one-time "support the app" payment is implemented.** There is no subscription, Customer Portal, or `stripe_subscriptions` table — do not build any of these unless a task explicitly asks for it. `FREE_MOTORCYCLE_LIMIT` (5.3) has zero connection to this feature.

Setup note: this session had no working path to the Stripe Claude Code plugin or Stripe's MCP server (no `claude` CLI in this environment, and Stripe wasn't present in this host's plugin/connector catalogs). The documented fallback (`npx skills add https://docs.stripe.com`) worked and installed Stripe's official best-practice skills under `.agents/skills/` (`stripe-best-practices` and others) — consult `.agents/skills/stripe-best-practices/references/{payments,billing,security}.md` before changing anything Stripe-related, and re-run the same `npx skills add` command if those files are ever missing.

- **`lib/stripe/server.ts`**: `getStripeClient()`, mirroring `lib/supabase/admin.ts`'s shape exactly — `server-only`-guarded, instantiates a fresh `Stripe` client per call (no global `stripe.apiKey = ...`), reads `STRIPE_SECRET_KEY`, pins `apiVersion: "2026-07-29.dahlia"` (the SDK's own `LatestApiVersion` at the time this was written — bump this string, not a global config call, when upgrading the SDK).
- **`app/support/actions.ts`**: `createSupportCheckoutSession(amountYen)` — the only Stripe Checkout entry point in the app. Validates `amountYen` against a hardcoded preset (`300 | 500 | 1000`, no free-text amount) before calling `stripe.checkout.sessions.create({ mode: "payment", ... })`. Sets `client_reference_id` to the authenticated user's id and `metadata: { type: "support" }` so the webhook (below) can attribute the payment. Follows Stripe's dynamic-payment-methods best practice: never pass `payment_method_types`. `success_url`/`cancel_url` are built from `SITE_URL` (`lib/site-url.ts`, fixed at build time — never from request headers, see 5.13). Also passes `managed_payments: { enabled: false }` — this account has Stripe's Managed Payments (merchant-of-record) product on by default, which rejects `line_items` whose inline `price_data.product_data` has no `tax_code`; rather than guessing a tax classification for a one-off support/tip payment (a legal judgment call, not something to invent — see `.agents/skills/stripe-best-practices/references/tax.md`), this session opts out of Managed Payments instead. Revisit this if the app later sells anything genuinely classifiable as a taxable product.
- **UI**: `/support` (`app/support/page.tsx`) — a standalone page, not a card buried in `/account`, reachable from the same user-menu dropdown as ダッシュボード/アカウント設定/ログアウト (`components/user-menu.tsx`). Three preset-amount buttons, each a separate `<form action={createSupportCheckoutSession.bind(null, amount)}>`. Redirects to Stripe-hosted Checkout; on success Stripe redirects back to `/support?success=1`, on a rejected amount or missing session URL back to `/support?error=1`.
- **`support_payments` table + webhook, now implemented**: the original build deliberately shipped with no DB table and no webhook ("nothing to fulfill"). The user then asked to know who supported how much, which is exactly the trigger this document called out for adding a webhook — see 6.2 for the table shape and `app/api/stripe/webhook/route.ts` for the handler. The handler verifies the Stripe signature (`STRIPE_WEBHOOK_SECRET`), handles `checkout.session.completed` / `checkout.session.async_payment_succeeded` gated on `payment_status !== "unpaid"`, checks `metadata.type === "support"` (so a future non-support Checkout Session, e.g. a subscription, isn't misrecorded here), and upserts into `support_payments` keyed on `stripe_checkout_session_id` (idempotent against Stripe's at-least-once webhook delivery). Needs the raw request body + Node crypto for signature verification, so it sets `export const runtime = "nodejs"` explicitly (Route Handlers default to Node anyway, but this makes it explicit). Uses `createAdminClient()` from `lib/supabase/admin.ts` since the request carries no Supabase session — this is the second documented use of the admin client after account deletion (see "Admin (service role) client" under section 7).
- **Proxy exclusion (`lib/supabase/proxy.ts`)**: `/api/stripe/webhook` is explicitly exempted from the unauthenticated-redirect check at the top of `updateSession`, before any Supabase call. Stripe's webhook POSTs carry no session cookie, so without this exemption every webhook delivery would get redirected to `/auth/login` and silently fail — keep this exemption if the webhook path ever changes.
- **Keys**: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (see section 4). The user provisions and rotates both themselves (test keys from `https://dashboard.stripe.com/test/apikeys`, webhook signing secret from the Dashboard's webhook endpoint config or `stripe listen`, live versions before real launch) — neither was ever seen or handled by Claude Code, only referenced by variable name.

### 5.5 Sentry error monitoring (as of 2026-08-18)

Requested explicitly to catch production errors (payments are now involved via 5.4) before a "real" release, on Sentry's free Developer plan (5k events/month, 1 user, 30-day retention as of when this was checked — verify current limits at sentry.io/pricing before assuming they still hold).

- **Files**: `instrumentation.ts` (Next.js's standard hook — `register()` loads `sentry.server.config.ts` or `sentry.edge.config.ts` depending on `NEXT_RUNTIME`; exports `onRequestError = Sentry.captureRequestError` to catch server-side rendering/Server Action errors), `instrumentation-client.ts` (browser-side `Sentry.init`), `sentry.server.config.ts` / `sentry.edge.config.ts` (Node/Edge runtime `Sentry.init` — `proxy.ts` runs on Edge, hence the split), `next.config.ts` (wraps with `withSentryConfig` for the build-time plugin, e.g. source map upload).
- **Free-tier-conscious by design**: every `Sentry.init()` call sets `enabled: NODE_ENV === "production" && !!NEXT_PUBLIC_SENTRY_DSN` — local `pnpm dev` (and this repo's own build/CI, which has no Sentry project) never sends events, so dev noise doesn't eat into the monthly event quota. `tracesSampleRate: 0.2` keeps performance-monitoring volume modest too; revisit if the free tier's separate tracing allotment turns out tighter than the error-event one.
- **Fully optional/no-op until configured**: `next.config.ts` only calls `withSentryConfig` when `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_ORG` + `SENTRY_PROJECT` are all set; otherwise it exports the plain `nextConfig` unchanged. This means the app (including this repo's own local build) works identically whether or not Sentry is configured — there's no placeholder org/project slug hardcoded anywhere, and nothing breaks for a contributor without Sentry access. The user creates the Sentry project and supplies these three values (plus optionally `SENTRY_AUTH_TOKEN` for source map upload) themselves; none of them were seen by Claude Code.
- **`@sentry/cli`'s postinstall script** needed `pnpm approve-builds @sentry/cli` to run (pnpm blocks build scripts by default) — if a fresh `pnpm install` ever silently skips it again (e.g. after a lockfile change), source map upload will silently no-op rather than error; re-run that command if source maps stop showing up in Sentry.
- **Not enabled**: Session Replay, Sentry Logs, User Feedback — these have their own (smaller) free-tier quotas and weren't part of the ask; this is deliberately just error + light performance monitoring. Revisit only if requested.

### 5.6 `cacheComponents` removed from `next.config.ts` (as of 2026-08-18)

The starter/scaffold had `cacheComponents: true` (Next.js 16's Partial Prerendering + `use cache` flag) set from the beginning. With it on, `pnpm dev` logged a recurring internal error on every page load — `Route "…": Could not validate \`instant\` … this is a bug in Next.js` / `Invariant: Cannot access "moduleLoading" without a work store` — reproduced even on untouched static routes like `/privacy`, so it wasn't caused by any app code; `pnpm build` was unaffected either way. Since this codebase never used `"use cache"`, `cacheLife`, or `cacheTag` (confirmed by grep before removing the flag), turning it off was a safe, zero-behavior-change fix for the dev-console noise — `next.config.ts` now exports an empty `NextConfig`. The trade-off: Partial Prerendering (static shell + streamed dynamic content) and React `<Activity>`-based navigation state preservation are both off now. If a future task wants either back, re-enabling `cacheComponents` is one line — re-test whether this Next.js version still hits the same crash first. This also means `export const runtime` route segment config (rejected outright while `cacheComponents` was on) works normally again — `app/api/stripe/webhook/route.ts` sets `runtime = "nodejs"` explicitly now (5.4).

### 5.7 Insurance affiliate ad (as of 2026-08-19)

Requested by the operator to place their own A8.net affiliate link (motorcycle insurance) on the insurance list page (`/motorcycles/[id]/insurance`), below the policy cards — chosen over the insurance record/cost *input* form because interrupting active data entry with an unrelated ad was judged more likely to hurt completion than help, whereas someone already reviewing their insurance policies/renewal dates is a natural moment to see comparison-shopping ads.

- **`components/insurance-affiliate-ad.tsx`**: renders the operator-supplied A8.net tag (an `<a>` banner + a 1x1 tracking pixel `<img>`) as-is, with an explicit "広告" (ad) label above it. The label is required by Japan's 2023 stealth-marketing regulation (景品表示法のステマ規制) — an affiliate link must be clearly distinguishable from the app's own content. `target="_blank" rel="nofollow noopener"` was added (the operator's raw tag omitted `target`); `noopener` without `noreferrer` was used deliberately so the tab-opener exploit is closed without stripping the referrer that A8.net's tracking may rely on. Both `<img>` elements need `eslint-disable-next-line @next/next/no-img-element` since they're third-party tracking beacons, not optimizable local images — `next/image` doesn't apply here.
- **Privacy policy** (`app/privacy/page.tsx`, section 3): added a paragraph disclosing that A8.net serves ads on some screens and may collect viewing/click data for measurement, since this is a genuine third-party data flow the existing Supabase/Vercel-only wording didn't cover.
- Only this one placement is implemented — no ads elsewhere in the app. If ads are added to another screen, apply the same "広告" label pattern.

### 5.8 Migrated hosting from Vercel to Netlify (as of 2026-08-21)

Vercel's [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) classify the Hobby (free) plan as non-commercial-only, and explicitly list "any method of requesting or processing payment" (including donations) and "the inclusion of advertisements" as commercial usage. With 5.4 (Stripe support payments) and 5.7 (A8.net affiliate ad) added, the app falls under that definition, so the hosting was moved before continuing to operate it. Netlify's free plan explicitly permits commercial use within its usage quota, which fits the app's current scale better than a paid Vercel plan; switching early, while the deployment is still simple, kept the migration low-risk.

- **`app/layout.tsx`**: `metadataBase` resolution was switched from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` to Netlify's `URL`/`DEPLOY_PRIME_URL` env vars (both platform-provided, no new env var needed).
- **No other code changes were required.** Everything else in the app (Server Actions, the Stripe webhook's `runtime = "nodejs"`, Supabase SSR client, Sentry) is host-agnostic; Netlify's Next.js Runtime v5 (`@netlify/plugin-nextjs`, auto-attached) supports the App Router, Server Actions, and Route Handlers with zero additional config.
- **Netlify-specific env var**: `SECRETS_SCAN_OMIT_PATHS=.netlify/.next/cache/**` was added. Netlify's build-time secrets scanner flags server-only secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) when they appear inside Turbopack's persistent build cache (`.netlify/.next/cache/turbopack/**`) — a false positive, since that cache is an internal build artifact never shipped to the client. Omitting the *path* (not the keys via `SECRETS_SCAN_OMIT_KEYS`) was used deliberately so scanning still catches a real future leak of those same secrets into actually-shipped code.
- **Site visibility**: Netlify sites default to (or can end up on) "Team protection" / private visitor access, which blocks anonymous visitors entirely. This must be set to **Public** under Project configuration → General → Visitor access → Project visibility, or the app is unreachable for real users.
- **Environment variable scoping**: Netlify variables have a Scopes concept (Builds / Functions / Runtime / Post processing) that Vercel doesn't have. On the Free plan, "Specific scopes" is gated behind a paid upgrade, so every variable is effectively "All scopes" regardless — no per-variable scope decisions are actually possible on this plan.
- **User-side dashboard changes made as part of this migration** (not in this repo): Supabase Auth's Site URL/Redirect URLs updated to the Netlify domain; the Stripe webhook endpoint recreated pointing at the Netlify domain with a new `STRIPE_WEBHOOK_SECRET`; all env vars from `.env.local`/Vercel copied into Netlify's dashboard. Sentry required no changes (DSN/org/project are host-agnostic).
- The Vercel project itself is being decommissioned by the user now that Netlify is confirmed working. If the Vercel project no longer exists, any lingering references to `VERCEL_*` env vars or Vercel-specific setup steps elsewhere in this doc/README are stale.

### 5.9 Fuel log (給油ログ) + fuel economy (as of 2026-08-21)

The next phase referenced in 5.2 ("custom + insurance first, fuel after"). Follows the `custom_parts` table almost exactly as a template — same single-migration RLS pattern, same Server Action/form/card/delete-button structure — with the differences noted below.

- **`fuel_records` table** (`lib/fuel-record.ts`, `/motorcycles/[id]/fuel/new`, `/fuel/[id]/edit`): `filled_on` (date, required), `mileage` (integer, optional — same "default to current mileage, confirm if lower" UX as maintenance records/custom parts via `checkMileageAgainstCurrent`), `liters` (`numeric(6,2)`, required, must be `> 0` — this is the app's first decimal column; every read site does `Number(row.liters)` since Supabase can return `numeric` columns as strings), `cost` (integer, optional), `is_full_tank` (boolean, default `true`), `note` (optional).
- **Full-tank flag**: added per explicit user decision — MVP assumes every fill-up is a full tank (typical for a motorcycle's small tank) but the column and a form checkbox (default checked) exist from day one so partial fills can be marked and excluded from fuel-economy math without a future migration.
- **`lib/fuel-economy.ts`**: `calculateFuelEconomy()` computes km/L via the "full-tank method" — pairs each fuel record with the immediately preceding one (sorted by date, then mileage) and divides the mileage delta by the current record's `liters`, but only when both records have `mileage` set, both are `is_full_tank`, and the delta is positive. Kept as its own file rather than folded into `lib/mileage-analysis.ts` because the output shape (one point per fill-up, not a monthly bucket) and the full-tank pairing rule are fuel-specific.
- **Cost analysis integration**: fuel is a 5th tab (全体/整備/カスタム/保険/給油) in `/motorcycles/[id]/analysis`, and is included in the 全体 tab's source breakdown and grand total (per explicit user decision — gas is treated as a 4th top-level cost bucket alongside maintenance/custom/insurance, not kept separate). Since a fuel record has no category concept, the 給油 tab's category pie chart uses the 満タン/部分給油 split instead of a fabricated single-slice category — reusing data already captured rather than inventing an axis. A `FuelEconomyChart` (`components/fuel-economy-chart.tsx`) renders below the cost breakdown in that tab. Fuel records with a `mileage` value are also folded into the existing mileage-history chart's reading list (`app/motorcycles/[id]/analysis/page.tsx`), improving its accuracy as a side effect.
- **Overview page menu** (`app/motorcycles/[id]/page.tsx`): adding a 5th entry to the previous 2×2 grid (整備/カスタム/保険/分析) would have left an orphaned tile in a 3rd row. Instead, 分析 — which is conceptually a cross-source rollup, not a data-entry destination like the other four — was pulled out of the grid into its own full-width tile below a 2×2 grid of the remaining four. `totalCost` (shown on the 分析 tile and used on the dashboard) now sums all four sources. Tile order was 整備/カスタム/保険/給油 initially, then reordered same-day to 給油/整備/カスタム/保険 (給油 first/top-left) per explicit user feedback that fill-ups are the most frequent action of the four. **Superseded 2026-08-21 when ローン was added (see 5.10)** — the grid reverted to a plain 2×2×3 (2-column, 3-row) layout including 分析 as an equal-sized 6th tile, since 6 divides evenly and the "pulled out" special case was no longer needed.
- **Not implemented**: mileage is optional per explicit user decision (matches maintenance records/custom parts, prioritizing low-friction entry over guaranteeing every fill-up can be fuel-economy-eligible).

### 5.10 Loan/financing cost (ローン) (as of 2026-08-21)

The 4th cost bucket referenced in 5.2 (整備/カスタム/保険/ローン), implemented right after fuel. Unlike every other cost-tracking table, a loan is not a repeating event log — it's a single contract (principal, term, rate) that `lib/loan-calculation.ts` turns into a live balance/interest calculator, closer in spirit to how `getDueStatus` derives a badge from stored dates than to `aggregateMonthlyCost`-style event aggregation.

- **`loans` table** (`lib/loan.ts`, `/motorcycles/[id]/loans/new`, `/loans/[id]/edit`): `lender_name` (required, ≤50 chars, doubles as the category label for the cost-analysis pie chart when a user has multiple loans), `principal` (integer, required, > 0), `term_months` (integer, required, > 0), `start_date` (date, required), `annual_interest_rate` (`numeric(5,2)`, nullable) and `monthly_payment` (integer, nullable) — **exactly one of these two must be set**, enforced by the `loans_rate_xor_payment` CHECK constraint (`(annual_interest_rate is not null) <> (monthly_payment is not null)`) and mirrored in the Server Action. `note` optional. Supports multiple loans per motorcycle (1-to-many, same as `insurance_policies`) for cases like financing the bike and a separate custom-parts loan.
- **No payment log — a pure calculator**: the app does not record individual repayments. `lib/loan-calculation.ts` assumes on-schedule 元利均等返済 (equal-payment amortization) and derives everything from the four stored fields plus "today": `monthsElapsed()` (new date-diff helper — none existed in the codebase before this, see below), `monthlyPaymentForRate()` (the standard amortization formula), `solveMonthlyRate()` (the inverse isn't solvable algebraically, so it's found via bisection search over monthly rate 0–100%, confirmed against known test cases — a ¥300,000/5%/36-month loan returns ¥8,991.27/month, and solving back from that payment recovers 5.0000%), `buildAmortizationSchedule()` (month-by-month interest/principal/balance, with the final month's principal portion forced to the exact remaining balance so it always reaches ¥0 without float drift), and `summarizeLoan()` (combines all of the above into monthly payment, current balance, total interest, and **`remainingInterest`** — the sum of all not-yet-incurred interest, i.e. what paying off the balance in full today would save — this was the user's explicit ask).
- **Cost analysis integration**: loan is a 6th tab (全体/整備/カスタム/保険/給油/ローン) in `/motorcycles/[id]/analysis`, and is included in the 全体 tab's source breakdown and grand total, per explicit user request ("分析には他カテゴリ同様に項目の一つとして追加したい"). Since every other category's "全体" total is a sum of costs that have already happened, a loan's contribution uses `elapsedMonthlyPaymentEntries()` — monthly-payment-sized entries for each month already elapsed since `start_date`, **excluding future scheduled months** — rather than the full lifetime cost of the loan. This keeps the semantics consistent ("money spent so far") across all six categories instead of mixing in a future obligation. The dedicated ローン tab's category pie chart breaks down by `lender_name` (meaningful once a user has 2+ loans), same reasoning as 給油's 満タン/部分給油 split.
- **Overview page menu / dashboard**: `loans` joins the 2×2×3 grid (see 5.9's superseded note above) with a `Landmark` icon (`hsl(var(--chart-5))`, the first use of the 5th chart color). `totalCost` on the overview page and the dashboard's cost-breakdown donut both add the loan's "paid so far" amount (`elapsedMonthlyPaymentEntries()` summed, not a plain `monthlyPayment × monthsElapsed` — see 賞与払い below for why that matters) as a 5th slice.
- **No existing month-diff helper**: before this, nothing in `lib/` computed the difference in calendar months between two `YYYY-MM-DD` dates (confirmed by grep) — `getTodayDateString`/`getDueStatus` in `lib/maintenance-schedule.ts` only do day-granularity diffs, and `lib/calendar.ts`'s `shiftMonth` adds/subtracts months but doesn't diff them. `monthsElapsed()` in `lib/loan-calculation.ts` is the first, and is calendar-month-only (ignores day-of-month), which is an intentional simplification appropriate for a monthly-installment product.
- **賞与払い(bonus/semi-annual payment) support, added same day**: requested after the user asked whether variable rates or bonus payments were supported. `bonus_payment_amount` / `bonus_month_1` / `bonus_month_2` on `loans` — fixed at exactly 2 bonus occurrences per year (the near-universal Japanese loan convention), but the two months are user-selectable (not hardcoded to a specific pair), and a loan can also have none at all. All three columns are null together or non-null together (`loans_bonus_fields_consistent` CHECK, mirroring the `_xor_` pattern used for rate/payment). `getBonusMonthFlags(startDate, termMonths, bonusMonth1, bonusMonth2)` turns the two calendar months into a per-schedule-month boolean array; every other function in `lib/loan-calculation.ts` (`monthlyPaymentForRate`, `solveMonthlyRate`, `buildAmortizationSchedule`, `elapsedMonthlyPaymentEntries`) takes optional `bonusPayment`/`bonusMonthFlags` params defaulting to `0`/`[]`, so the no-bonus path is unchanged — verified by re-running the original ¥300,000/5%/36-month regression case (still exactly ¥8,991.27/month) after this change. `monthlyPaymentForRate` extends to a closed-form solution (principal's future value minus the future value of the bonus payment stream, divided by the annuity factor — no nested bisection needed) rather than a numerical solve, and was verified against a second example (¥1,200,000/3%/24mo/¥100,000 bonus in months 6 & 12 → ¥35,014.65/month regular payment, final balance exactly ¥0, and solving the rate back from that payment recovers 3.0000%). `loan-form.tsx` shows the 2 bonus-month/amount fields only when a "賞与払いを利用する" checkbox is checked (unchecked by default for new loans), matching the same "don't render fields you don't intend to submit" pattern as the rate/payment toggle.
- **Not implemented**: no partial/extra payment tracking, no mid-term rate change support (see below), no early-payoff action (the "interest saved" figure is informational only), no amortization schedule table shown to the user (only the derived summary figures).
- **Known limitation raised by the user**: editing a loan's rate mid-term does *not* correctly model a real rate change — `summarizeLoan` always recomputes the *entire* schedule from `start_date` under whatever rate is currently stored, so editing the rate retroactively changes the past, not just the future. The documented workaround (no code needed) is to treat a real-world rate change/refinance as closing the old loan and opening a new one with `principal` = the old loan's `remainingBalance` at the time of the change, a new `start_date`, and the new rate — this also mirrors how refinancing actually works at a bank.

### 5.12 Login lockout after repeated failed password attempts (as of 2026-08-24)

Requested by the operator: lock an account out for a period after too many wrong-password attempts, and notify the registered email with a password-reset link. Previously `components/login-form.tsx` called `supabase.auth.signInWithPassword()` directly from the browser with no attempt tracking at all.

- **Login moved from a direct client-side Supabase call to a Server Action** (`app/auth/login/actions.ts`, `signInWithLockout(email, password)`) — this is a deliberate architecture change, not just an addition. Counting failed attempts client-side would be trivially bypassable (an attacker just resets local state), so the count has to live server-side. `components/login-form.tsx` now calls this Server Action instead of `supabase.auth.signInWithPassword()` directly; the actual `signInWithPassword` call happens inside the action using the regular cookie-based `lib/supabase/server.ts` client, so a successful login still writes the session to cookies exactly as before — the browser's `createBrowserClient` (also cookie-backed via `@supabase/ssr`) picks it up on the next call with no extra sync step needed. The client-side MFA `getAuthenticatorAssuranceLevel()` redirect logic (added earlier, UX-only — enforcement is in `lib/supabase/proxy.ts` and RLS, see 5.11/6.7) is unchanged.
- **`login_lockouts` table** (6.6): keyed by normalized (trimmed, lowercased) email, not by `auth.users.id` — lockout tracking has to work before authentication succeeds, so there's no user session to key off of. 5 consecutive "Invalid login credentials" failures (same string match `login-form.tsx` already used) locks the email for 15 minutes (`MAX_FAILED_ATTEMPTS` / `LOCKOUT_DURATION_MS` in `app/auth/login/actions.ts`); non-credential errors (network, etc.) are not counted. While locked, the action returns immediately without even attempting `signInWithPassword`.
- **Password-reset email on lockout, throttled**: reuses the exact same `supabase.auth.resetPasswordForEmail()` call already used by `components/forgot-password-form.tsx` (no new email infrastructure) — sent once when a lockout is triggered, then at most once per hour (`RESET_EMAIL_THROTTLE_MS`) even if the account keeps getting locked again, to prevent an attacker from using repeated failed logins as an email bomb against the account owner. Because Supabase's `resetPasswordForEmail` doesn't reveal whether an email is registered, calling it unconditionally for any attempted email (registered or not) doesn't introduce an account-enumeration issue.
- **Design consideration — lockout as an availability risk**: any email-keyed lockout can, in principle, be triggered against a legitimate user by someone else. Impact is bounded by design: the lock is short (15 minutes) and the reset email is throttled. Brute-force protection beyond this relies on Supabase Auth's own rate limits.
- **Future hardening (not yet implemented)**: CAPTCHA on login (Supabase Auth supports Cloudflare Turnstile / hCaptcha natively), an admin unlock UI (currently a `login_lockouts` row is cleared via the Supabase dashboard), and lockout on repeated wrong MFA codes (this feature covers password login only).

### 5.11 Two-factor authentication (TOTP MFA) (as of 2026-08-21)

Opt-in per user, via Supabase Auth's built-in TOTP MFA (`supabase.auth.mfa.*`) — no new database table (Supabase Auth manages factor state internally).

- **Enforced at two layers — proxy (UX) and RLS (security boundary)**: `lib/supabase/proxy.ts` calls `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` for every authenticated request; if `nextLevel === "aal2"` and `currentLevel !== "aal2"` (user has enrolled a factor but hasn't completed the challenge this session), every page except `/auth/*` redirects to `/auth/mfa-verify`. `components/login-form.tsx` also branches on AAL after `signInWithPassword` (UX only, avoids a redirect round-trip). As of 2026-10-12 the same rule is also enforced in the database (`supabase/migrations/20261012100000_enforce_mfa_aal2_rls.sql`, see 6.7): every app table has a `RESTRICTIVE` policy that rejects an aal1 session for a user with a verified factor, so calling the REST API directly with an aal1 token no longer bypasses MFA. This superseded the original 2026-08-21 decision to keep enforcement proxy-only.
- **Enrollment UI**: `components/mfa-settings.tsx`, rendered as a new card on `/account` between password change and account deletion. Lists verified factors (`listFactors().data.totp`), lets the user add one (`mfa.enroll({factorType: "totp"})` → shows QR code + manual-entry secret → `mfa.challengeAndVerify()` to confirm), and unenroll any factor (`mfa.unenroll()` — Supabase itself refuses this unless the session is already at aal2, so no extra step-up check was needed here). Abandoning enrollment mid-flow calls `unenroll()` on the just-created unverified factor so it doesn't linger.
- **Challenge screen**: `app/auth/mfa-verify/page.tsx` + `components/mfa-verify-form.tsx`, styled like the existing auth pages. Follows this codebase's established pattern for auth screens — a `"use client"` component calling `lib/supabase/client.ts` directly, not a Server Action (matches `login-form.tsx`/`forgot-password-form.tsx`, unlike every other form in the app).
- **No recovery codes**: Supabase Auth doesn't support them natively ("Recovery codes are not supported" per their own docs) — their recommended mitigation is enrolling a second/backup factor (up to 10 per user), which the enrollment UI already supports for free since it's just "enroll" called again. The account settings copy nudges users toward this. A fully locked-out user (no working factor left) has no self-service recovery path; the fallback is the operator removing the stuck factor via the Supabase admin MFA API — **only after confirming the request comes from the account owner** (e.g. the request is sent from the account's registered email address), since an unverified "please remove my MFA" request is a classic social-engineering route around MFA.
- **Not implemented**: mandatory/forced MFA (deliberately opt-in to keep onboarding friction low), phone/SMS-based factors (TOTP only — SMS needs a paid provider integration).

### 5.13 Security fixes before making the repository public (as of 2026-10-12)

A pre-publication review (the repo is to be made public as a job-hunting portfolio) found two issues, both fixed:

- **Host-header injection in outbound URLs**: `app/auth/login/actions.ts` (lockout password-reset email `redirectTo`) and `app/support/actions.ts` (Stripe `success_url`/`cancel_url`) built the app origin from the request's `x-forwarded-host`/`host` headers, which a client can spoof. For the reset email this could point the victim's reset link at an attacker domain (account takeover), gated only by Supabase's Redirect URLs allowlist. Both now use `SITE_URL` from `lib/site-url.ts`, which `next.config.ts` inlines at build time via `env.SITE_URL` (Netlify `URL` → `DEPLOY_PRIME_URL` → `http://localhost:3000`, the same resolution `app/layout.tsx`'s `metadataBase` already used — layout now imports the shared constant too). Build-time inlining was chosen because Netlify's `URL` is guaranteed at build time but not documented as reliably available inside Functions at runtime. Side effect: on Deploy Previews these URLs point at the production domain (`URL` wins), which is acceptable. Do not reintroduce header-derived origins for any URL sent outside the app.
- **Open redirect in `/auth/confirm`**: the `next` query param was passed straight to `redirect()`. It is now resolved with `new URL(next, base)` and only kept if it stays same-origin (rejects `https://…`, `//…`, `/\…`, and tab/newline-smuggled variants). The error redirect's message is now `encodeURIComponent`-ed as well.

Use UUID primary keys and timestamps with time zone.

> `supabase/migrations/` is the authoritative source for the current schema — apply migrations in filename order (`supabase db push`, or run them in the Supabase SQL Editor oldest-first). The blocks below show the original MVP baseline (`motorcycles`, `maintenance_records`); section 6.1 summarizes what has been added since, without duplicating full DDL here. When you add or change a table, add a new migration file and update section 6.1 in the same change rather than rewriting the DDL below.

### `motorcycles`

```sql
create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  manufacturer text,
  model text,
  current_mileage integer not null default 0 check (current_mileage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `maintenance_records`

```sql
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  maintenance_date date not null,
  category text not null,
  mileage integer check (mileage >= 0),
  cost integer check (cost >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended indexes:

```sql
create index motorcycles_user_id_idx
on public.motorcycles(user_id);

create index maintenance_records_user_id_idx
on public.maintenance_records(user_id);

create index maintenance_records_motorcycle_id_date_idx
on public.maintenance_records(motorcycle_id, maintenance_date desc);
```

### 6.1 Schema additions since the MVP baseline (as of 2026-08-16)

- `motorcycles` gained `displacement_cc integer`, `bike_type text` (CHECK against a fixed allowlist, kept in sync with `lib/motorcycle.ts` `BIKE_TYPES`), `icon_color text` (CHECK against a fixed allowlist), and `mileage_recorded_on date`.
- `maintenance_records` gained `cycle_setting_id uuid references maintenance_cycle_settings(id)`, `item_name text`, `distance_interval_km integer`, `period_interval_months integer` — these are only populated when the record was created from a cycle setting, and are a snapshot (changing the cycle setting later does not retroactively change past records).
- New table `maintenance_cycle_settings`: `id, user_id, motorcycle_id, item_name, category, distance_interval_km, period_interval_months, created_at, updated_at`. Unique on `(motorcycle_id, item_name)`. At least one of the two intervals is required (CHECK).
- New table `maintenance_schedules`: `id, user_id, motorcycle_id, cycle_setting_id (unique, nullable, ON DELETE CASCADE), item_name, category, next_due_date, next_due_mileage, distance_interval_km, note, created_at, updated_at`. At least one of `next_due_date` / `next_due_mileage` is required; `next_due_mileage` requires `distance_interval_km` to also be set (CHECK constraints enforce both). The unique constraint on `cycle_setting_id` guarantees at most one auto-schedule row per cycle setting; manual schedules keep `cycle_setting_id` null and are unconstrained.
- Postgres functions `create_maintenance_record_with_schedule` and `update_maintenance_record_with_schedule` (`supabase/migrations/20260815220000_...`): `SECURITY INVOKER`, re-check ownership inside the function even though RLS already enforces it, and atomically (a) insert/update the maintenance record, (b) advance the motorcycle's `current_mileage`/`mileage_recorded_on` only if the new mileage is greater or equal (never regresses it), and (c) upsert the linked `maintenance_schedules` row via `ON CONFLICT (cycle_setting_id)`. Extend these functions (rather than doing the three steps as separate client-side calls) if you add another field that must stay consistent across the three tables.

### 6.2 Custom parts + insurance (as of 2026-08-16, revised same day)

- New table `custom_parts`: `id, user_id, motorcycle_id, part_name, category, brand, shop_name, purchase_date, mileage, cost, note, created_at, updated_at`. `category` is a plain `text not null` column (same approach as `maintenance_records.category`, no DB-level CHECK); the fixed option list lives in `lib/custom-part.ts` (`CUSTOM_PART_CATEGORIES` — common motorcycle customization categories such as マフラー/外装・カウル/サスペンション etc., independent from `MAINTENANCE_CATEGORIES`) and is enforced in the form (`NativeSelect`) and Server Actions. RLS + Server Action double ownership check, same pattern as `insurance_policies` below (plain insert/update/delete, no RPC — unlike maintenance records it doesn't need to stay transactionally consistent with `maintenance_schedules`/current mileage). `maintenance_records` does **not** have `part_name`/`brand`/`shop_name` columns and never shipped with them — an earlier draft added those columns plus a "カスタム" category, and the corresponding migrations (`20260816090000_...`, `20260816091000_...`) were deleted before being applied to production once that design was reconsidered (see 5.2). If any generated code or old notes reference `CUSTOM_PART_CATEGORY` or those column names on `maintenance_records`, they're stale.
- New table `insurance_policies`: `id, user_id, motorcycle_id, insurance_type ('compulsory'|'voluntary'), insurer_name, premium_cost, period_start, period_end, note, created_at, updated_at`, plus `payment_frequency ('monthly'|'yearly')` added 2026-08-17 (`supabase/migrations/20260817090000_insurance_policies_redesign.sql`, see 5.3). CHECK `period_end > period_start`. Deliberately **not** linked to `maintenance_schedules` or `maintenance_cycle_settings` — it has its own due-status display (`components/insurance-policy-card.tsx`) computed directly from `period_end`. `policy_number` was part of the original 2026-08-16 design but was removed on 2026-08-17 (column dropped, not just unused) — if any generated code or old notes reference it, they're stale.

### 6.3 Support payments (as of 2026-08-18)

New table `support_payments`: `id, user_id, amount, currency (default 'jpy'), stripe_checkout_session_id (unique), created_at`. No `updated_at` — rows are write-once (a payment record isn't edited after the fact). `stripe_checkout_session_id` is unique so the webhook handler (5.4) can upsert idempotently against Stripe's at-least-once webhook delivery without creating duplicate rows for the same Checkout Session. RLS: only a `select` policy exists (`user_id = auth.uid()`) — there is deliberately no `insert`/`update`/`delete` policy for `authenticated`, so a user can view their own support history but can never write to this table themselves; all writes come from the webhook's `createAdminClient()` call, which bypasses RLS. See `supabase/migrations/20260818090000_create_support_payments.sql`.

### 6.4 Fuel records (as of 2026-08-21)

New table `fuel_records`: `id, user_id, motorcycle_id, filled_on, mileage, liters, cost, is_full_tank, note, created_at, updated_at`. Follows the exact same shape/RLS pattern as `custom_parts` (6.2) — single migration, four ownership-checked policies, `set_updated_at` trigger. `liters` is `numeric(6,2)`, the app's first non-integer numeric column; check constraint `liters > 0`. `mileage`/`cost` are nullable (same optional-field convention as every other cost record); `is_full_tank` is `not null default true`. See `supabase/migrations/20260821100000_create_fuel_records.sql` and 5.9.

### 6.5 Loans (as of 2026-08-21)

New table `loans`: `id, user_id, motorcycle_id, lender_name, principal, annual_interest_rate, monthly_payment, term_months, start_date, bonus_payment_amount, bonus_month_1, bonus_month_2, note, created_at, updated_at`. Same shape/RLS pattern as `custom_parts`/`fuel_records` (single migration, four ownership-checked policies, `set_updated_at` trigger), but with two constraints no other table in this app has: `loans_rate_xor_payment` enforces that exactly one of `annual_interest_rate` (`numeric(5,2)`) / `monthly_payment` (integer) is non-null — the other is always computed at read time by `lib/loan-calculation.ts`, never stored — and `loans_bonus_fields_consistent` enforces that `bonus_payment_amount` (integer) / `bonus_month_1` / `bonus_month_2` (both `smallint`, 1–12) are either all three null (no bonus/賞与払い) or all three non-null with the two months distinct. This table holds contract terms only; there is no payment-log table (see 5.10 for why). The `bonus_*` columns were added directly to this migration (not a follow-up ALTER) since it was still unapplied to production at the time — see 6.2's note on the equivalent situation for `insurance_policies` for when an ALTER would be required instead. See `supabase/migrations/20260821110000_create_loans.sql` and 5.10.

### 6.6 Login lockout (as of 2026-08-24)

New table `login_lockouts`: `id, email (unique), failed_attempts, locked_until, last_failed_at, last_reset_email_sent_at, created_at, updated_at`. Unlike every other table in this app, it is **not** keyed by `user_id`/`motorcycle_id` and has **no RLS policies at all** (RLS is enabled but zero policies are defined) — it tracks failed logins by email before authentication succeeds, so there is no `auth.uid()` to check against, and neither `anon` nor `authenticated` has any legitimate reason to read or write it directly. All access goes through `createAdminClient()` (RLS-bypassing) inside `app/auth/login/actions.ts`, the only caller. See `supabase/migrations/20260824100000_create_login_lockouts.sql` and 5.12.

### 6.7 MFA (aal2) enforcement in RLS (as of 2026-10-12)

New schema `private` (not exposed through PostgREST) with one function, `private.mfa_aal_satisfied()` — `SECURITY DEFINER`, `search_path = ''`, returns true if the caller's JWT `aal` is `aal2` **or** the caller (`auth.uid()`) has no `verified` row in `auth.mfa_factors`. Every app table (`motorcycles`, `maintenance_records`, `maintenance_cycle_settings`, `maintenance_schedules`, `insurance_policies`, `custom_parts`, `support_payments`, `fuel_records`, `loans`) gets a `RESTRICTIVE ... FOR ALL TO authenticated` policy named "Require aal2 when MFA is enrolled" that requires `(select private.mfa_aal_satisfied())`; restrictive policies are ANDed with the existing permissive ownership policies, which were left untouched. `SECURITY DEFINER` was used instead of Supabase's documented inline `auth.mfa_factors` subquery because `authenticated`'s privileges on `auth.mfa_factors` aren't documented — if they were missing, every query would fail with `permission denied`. The function only inspects the caller's own factors, so it leaks nothing about other users. `login_lockouts` is excluded (no policies, inaccessible to `authenticated` anyway). **Any future table that holds user data must get the same restrictive policy.** See `supabase/migrations/20261012100000_enforce_mfa_aal2_rls.sql` and 5.11.

## 7. Security requirements

RLS must be enabled on every application table.

```sql
alter table public.motorcycles enable row level security;
alter table public.maintenance_records enable row level security;
```

Users must only be able to read and modify their own data.

### Motorcycle policies

```sql
create policy "Users can select own motorcycles"
on public.motorcycles
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own motorcycles"
on public.motorcycles
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own motorcycles"
on public.motorcycles
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own motorcycles"
on public.motorcycles
for delete to authenticated
using ((select auth.uid()) = user_id);
```

### Maintenance record policies

```sql
create policy "Users can select own maintenance records"
on public.maintenance_records
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own maintenance records"
on public.maintenance_records
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.motorcycles
    where motorcycles.id = motorcycle_id
      and motorcycles.user_id = (select auth.uid())
  )
);

create policy "Users can update own maintenance records"
on public.maintenance_records
for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.motorcycles
    where motorcycles.id = motorcycle_id
      and motorcycles.user_id = (select auth.uid())
  )
);

create policy "Users can delete own maintenance records"
on public.maintenance_records
for delete to authenticated
using ((select auth.uid()) = user_id);
```

### Maintenance cycle settings & schedules policies

`maintenance_cycle_settings` and `maintenance_schedules` (added 2026-08-15, see section 6.1) have RLS enabled with the same shape of policy as above for all four operations: `select`/`update`/`delete` check `(select auth.uid()) = user_id`, and `insert` additionally checks that `motorcycle_id` belongs to a motorcycle owned by the same user. See `supabase/migrations/20260815105000_*`, `20260815110000_*`, `20260815120000_*`, and `20260815130000_*` for the exact statements. `insurance_policies` and `custom_parts` (added 2026-08-16, see section 6.2) follow the identical pattern — see `supabase/migrations/20260816120000_*`, `20260816121000_*`, and `20260816130000_*`. `fuel_records` (added 2026-08-21, see section 6.4) follows it too — see `supabase/migrations/20260821100000_create_fuel_records.sql`. `loans` (added 2026-08-21, see section 6.5) follows it too — see `supabase/migrations/20260821110000_create_loans.sql`. Keep this pattern (ownership check on both `user_id` and the referenced `motorcycle_id`) for any future table that hangs off a motorcycle.

As of 2026-10-12 every one of these tables also has a restrictive "Require aal2 when MFA is enrolled" policy (see 6.7) — add the same policy to any new user-data table.

### Admin (service role) client

`lib/supabase/admin.ts` creates a client with `SUPABASE_SECRET_KEY` and bypasses RLS entirely. It is wrapped with the `server-only` package so it cannot be imported into a Client Component. It has three callers: `deleteAccount()` in `app/account/actions.ts`, the Stripe webhook handler `app/api/stripe/webhook/route.ts` (writes to `support_payments`, 6.3/5.4), and `signInWithLockout()` in `app/auth/login/actions.ts` (reads/writes `login_lockouts`, 6.6/5.12, added 2026-08-24) — the latter two are legitimate because the request carries no Supabase session to authenticate as, unlike every other write path in this app. Do not use the admin client as a shortcut around RLS for regular reads/writes — if a new feature seems to need it, that is a signal to re-check whether an RLS policy, a `SECURITY INVOKER` Postgres function (as used for schedules, section 6.1), or (for a route with no user session) the same "webhook writes, everyone else only reads via RLS" pattern used for `support_payments` would work instead.

Additional security rules:

- Do not trust a client-supplied `user_id`
- Derive the current user from Supabase Auth on the server
- Validate all form input
- Prevent users from assigning records to motorcycles owned by another user
- Do not log access tokens, email addresses, environment variables, or sensitive user data
- Avoid collecting unnecessary personal information

The project owner can access stored data through the Supabase dashboard. Future public release must include a privacy policy explaining collected data, purpose, administrator access, retention, and deletion procedures.

## 8. Routes

Original suggested (MVP) route structure:

```text
/
/auth/sign-up
/auth/login
/dashboard
/motorcycles/new
/motorcycles/[id]
/motorcycles/[id]/edit
/motorcycles/[id]/maintenance/new
/maintenance/[id]/edit
```

Actual routes as of 2026-08-18 (kept in sync with `app/`; update this list when routes are added, removed, or renamed):

```text
/
/auth/sign-up, /auth/login, /auth/forgot-password, /auth/update-password,
  /auth/sign-up-success, /auth/error, /auth/confirm (route handler),
  /auth/mfa-verify (二段階認証チャレンジ画面、see 5.11)
/dashboard
/account
/support                                one-time "support the app" Stripe Checkout (see 5.4)
/api/stripe/webhook (route handler, POST only — Stripe signature-verified, no page)
/privacy
/terms
/motorcycles/new
/motorcycles/[id]                       overview: info card, near-due summary, menu (see 5.3)
/motorcycles/[id]/edit
/motorcycles/[id]/maintenance           cycle settings, calendar, schedules, records list (see 5.3)
/motorcycles/[id]/maintenance/new
/motorcycles/[id]/cycle-settings/new
/motorcycles/[id]/schedules/new
/motorcycles/[id]/insurance             list (see 5.3)
/motorcycles/[id]/insurance/new
/motorcycles/[id]/custom-parts          list (see 5.3)
/motorcycles/[id]/custom-parts/new
/motorcycles/[id]/fuel                  list (see 5.9)
/motorcycles/[id]/fuel/new
/motorcycles/[id]/loans                 list (see 5.10)
/motorcycles/[id]/loans/new
/motorcycles/[id]/analysis              cost analysis (6 tabs) + mileage chart + fuel economy chart (see 5.3, 5.9, 5.10)
/motorcycles/[id]/mileage (Server Action only, no page — invoked from the motorcycle detail/dashboard views)
/maintenance/[id]
/maintenance/[id]/edit
/cycle-settings/[id]/edit
/schedules/[id]/edit
/insurance/[id]/edit
/custom-parts/[id]/edit
/fuel/[id]/edit
/loans/[id]/edit
```

Route names may be adapted to the existing starter, but keep navigation simple.

## 9. UI requirements

- Japanese UI
- Mobile-first layout
- Accessible labels and validation messages
- Large touch targets
- Clear loading, empty, success, and error states
- Confirm destructive operations such as deletion
- Display currency in Japanese yen
- Display dates in a clear Japanese format
- Do not spend excessive time on visual polish before core workflows work

The dashboard should initially show:

- Registered motorcycle cards
- Current mileage
- Most recent maintenance record, if available
- Button to register a motorcycle

Implemented beyond this baseline: each dashboard card also shows the motorcycle's total cost and a quick mileage update action; the "＋ バイクを登録" button is hidden once the user has reached `FREE_MOTORCYCLE_LIMIT` (see 5.3). As of 2026-08-18 the dashboard card's total is the sum across all cost sources (整備/カスタム/保険, not maintenance-only; 給油 and ローン joined the mix 2026-08-21 per 5.9/5.10), rendered as a small donut chart (`components/cost-breakdown-donut.tsx`, a lightweight Recharts `Pie` with no tooltip/legend — decorative only, the actual percentages are a text line next to it) plus the total/percentage text. The card layout is `flex-col sm:flex-row`: on mobile the cost block sits below the bike info (chart and text side by side); on `sm:` and wider it moves to the right side of the card as its own column, since that space was sitting empty on desktop. `app/dashboard/page.tsx` embeds `maintenance_records`/`custom_parts`/`insurance_policies`/`fuel_records`/`loans` cost columns in the single motorcycles query — still no N+1. As of 2026-08-17 the motorcycle detail page (`/motorcycles/[id]`) is a slim overview — info card, up to 3 nearest-due maintenance items, up to 3 near-due insurance policies, and a menu linking to sub-pages where cost analysis, the calendar, cycle settings, and per-item schedule cards now live (see 5.3 for the full breakdown). As of 2026-08-18 the overview page's info card no longer shows a cost total line at all (it was redundant with the 分析 tile's "合計 ¥…" subtitle, which itself was updated the same day to sum all cost sources rather than maintenance-only, matching the dashboard). As of 2026-08-21 the overview menu went through two revisions the same day: first a 2×2 grid of 整備/カスタム/保険/給油 with 分析 pulled out into its own full-width tile below (see 5.9), then — once ローン brought the entry-tile count to 5 — a plain 2-column, 3-row grid of all 6 tiles (給油/整備/カスタム/保険/ローン/分析) with no special-cased tile, since 6 divides evenly (see 5.10). Cost analysis and the calendar are still scoped per motorcycle only — there is no cross-motorcycle rollup beyond each dashboard card's own total/breakdown.

## 10. Development milestones

### Milestone 1: Connection and authentication — done

- Confirm Supabase environment variables
- Confirm sign-up and sign-in locally
- Confirm the user appears in Supabase Authentication

### Milestone 2: Motorcycle CRUD — done

- Create schema and RLS policies
- Register one motorcycle
- List the current user's motorcycles
- Edit and delete a motorcycle
- Verify another account cannot access the data

### Milestone 3: Maintenance record CRUD — done

- Add maintenance records to a motorcycle
- Display records in descending date order
- Edit and delete records
- Verify ownership protection

### Milestone 4: Release preparation — done

- Run lint and production build
- Configure Vercel environment variables (hosting later moved to Netlify, see 5.8)
- Deploy from the GitHub `main` branch
- Perform mobile browser smoke testing
- Add minimum privacy policy and terms before inviting external testers (`/privacy`, `/terms` are live)

### Milestone 5: Maintenance scheduling & cost analysis — done (2026-08-15)

Not part of the original plan, but shipped after Milestone 4: maintenance cycle settings, automatic schedule calculation, the maintenance calendar, due-status badges, cost analysis charts, quick mileage update, and account deletion. See section 5.1 for details. Recorded here so future sessions don't mistake this for unfinished MVP work.

### Milestone 6 and beyond: not yet scoped

No further milestone has been formally scoped or approved for implementation yet. Candidate features include reminder notifications, cross-motorcycle dashboard totals, photo attachments, and data export — none of it should be started without an explicit go-ahead. When a next milestone is agreed, add it here with the same level of detail as the ones above.

## 11. Validation rules

- Motorcycle name is required
- Current mileage must be zero or greater
- Maintenance date is required
- Category is required
- Maintenance mileage, when entered, must be zero or greater
- Cost, when entered, must be zero or greater
- Trim text fields
- Show user-friendly Japanese validation messages
- Insurance: insurer name, insurance type, and payment frequency (from `INSURANCE_PAYMENT_FREQUENCIES`) are required; premium, when entered, must be zero or greater; period end must be a later date than period start. No policy number field (removed 2026-08-17, see 5.3)
- Custom parts: part name, category (from `CUSTOM_PART_CATEGORIES`), and purchase/install date are required; brand and shop name are optional (≤50 chars each); mileage and cost, when entered, must be zero or greater
- Maintenance record / custom part / fuel record mileage: when entered and lower than the motorcycle's current mileage, requires an explicit "register anyway" confirmation (`force`) rather than being rejected outright (see 5.3, 5.9)
- Fuel records: filled date is required; liters is required and must be greater than zero (decimal allowed); mileage and cost, when entered, must be zero or greater; is_full_tank defaults to true (see 5.9)
- Loans: lender name, borrowed amount (principal), term (months), and start date are required; exactly one of annual interest rate (≥0) or monthly payment must be provided, never both or neither; when monthly payment is provided it must be at least (principal − bonus payments already accounted for) ÷ term, or amortization is mathematically impossible (see 5.10)
- Loan bonus payment (賞与払い, optional): either all three of bonus payment amount / bonus month 1 / bonus month 2 are provided, or none are — never a partial set; the two bonus months must be different values in 1–12; bonus payment amount must be a positive integer (see 5.10)
- Registering a motorcycle is rejected once the user already has `FREE_MOTORCYCLE_LIMIT` motorcycles (see 5.3)

## 12. Testing requirements

At minimum, verify:

- Unauthenticated users cannot access protected pages
- User A cannot view, edit, or delete User B's motorcycles
- User A cannot add a maintenance record to User B's motorcycle
- User A cannot view, edit, or delete User B's maintenance cycle settings or maintenance schedules, and cannot link a maintenance record to another user's cycle setting
- Invalid mileage and cost values are rejected
- Deleting a motorcycle also deletes its maintenance records, cycle settings, and schedules (cascade)
- Deleting a cycle setting also deletes its linked auto-schedule, but not the maintenance records already created from it
- Saving a maintenance record linked to a cycle setting correctly recalculates (or clears) the corresponding schedule, and never moves a motorcycle's current mileage backwards
- User A cannot view, edit, or delete User B's insurance policies
- User A cannot view, edit, or delete User B's custom parts
- User A cannot view, edit, or delete User B's fuel records
- User A cannot view, edit, or delete User B's loans
- Deleting a motorcycle also deletes its insurance policies, custom parts, fuel records, and loans (cascade)
- Fuel economy (km/L) is only computed from consecutive full-tank fuel records with mileage entered, never regresses on a negative/zero distance delta, and is unaffected by partial (`is_full_tank = false`) records
- Loan amortization math: a loan cannot have both `annual_interest_rate` and `monthly_payment` set, or neither (DB CHECK + Server Action validation); the derived monthly payment/rate are consistent with each other (solving for one from the other and back should round-trip); the amortization schedule's balance reaches exactly 0 at the final month regardless of interest rate (including 0%); `remainingInterest`/`remainingBalance` never go negative once a loan's term has fully elapsed
- Loan bonus payment (賞与払い) math: a loan cannot have a partial set of the three bonus fields (DB CHECK + Server Action validation); the no-bonus code path is unaffected by the bonus-aware generalization (regression: a ¥300,000/5%/36-month loan with no bonus still computes ¥8,991.27/month); a bonus month that falls before the loan's start month within the same calendar year is still correctly counted in a later year of the term (i.e. `getBonusMonthFlags` wraps across year boundaries); a short-term loan where only one of the two bonus months actually falls within the term is handled correctly (not double-counted, not missing)
- A user who already has `FREE_MOTORCYCLE_LIMIT` motorcycles cannot register another (app-level check only, not RLS — see 5.3)
- User A cannot view User B's support payment history (`support_payments` RLS); no `authenticated` role can insert/update/delete `support_payments` directly (writes only via the webhook's admin client)
- `/api/stripe/webhook` rejects requests with a missing or invalid Stripe signature (400) and does not write to `support_payments` for them
- MFA in RLS: a user with a verified TOTP factor and an aal1 session (password only, challenge not completed) gets zero rows from — and cannot insert/update/delete in — every app table, even when calling the Supabase REST API directly; the same user at aal2 has normal access; a user with no verified factor is unaffected at aal1; an unverified (abandoned) enrollment does not count as enrolled (see 6.7)
- Login lockout: 5 consecutive wrong-password attempts for the same email lock it out, and a correct password is rejected (without even reaching Supabase Auth) while the lock is active; the lock clears automatically after 15 minutes and a correct password then succeeds normally; a password-reset email is sent when the lockout first triggers but not resent again within the same hour even if the account is locked out repeatedly; failed attempts against one email never affect another email's lockout state; no `authenticated` or `anon` role can read or write `login_lockouts` directly (writes only via the Server Action's admin client)
- Local production build succeeds

Before completing a task, run:

```bash
pnpm lint
pnpm build
```

Fix relevant errors before reporting completion. Do not suppress errors merely to make the build pass.

## 13. Git workflow

- Repository visibility: Private
- Production branch: `main`
- Use small, meaningful commits
- Never commit secrets
- Review `git diff` before committing

Suggested commit messages:

```text
feat: add motorcycle registration
feat: add maintenance record management
fix: enforce motorcycle ownership validation
chore: configure Supabase client
```

## 14. Instructions for Claude Code

When implementing a task:

1. Inspect the existing repository before editing.
2. Briefly state the implementation plan.
3. Reuse the starter's existing patterns and dependencies.
4. Make the smallest coherent change that satisfies the current milestone.
5. Do not add unrelated features or dependencies.
6. Preserve type safety. Avoid `any` unless absolutely necessary and explained.
7. Keep privileged operations server-side.
8. Apply Supabase RLS and ownership checks rather than relying only on UI filtering.
9. Run lint and build after implementation.
10. Summarize changed files, database changes, commands run, and remaining risks.
11. If a database migration is required, create a reproducible SQL migration rather than only describing dashboard clicks.
12. Do not claim that security is complete without testing access from two separate accounts.
13. Keep this file and `README.md` in sync with what is actually implemented. When a task adds/removes a route, table, column, environment variable, RPC function, or user-facing feature — or completes/changes a milestone — update the relevant section of `CLAUDE.md` (and `README.md`'s feature list / directory overview / env var table if applicable) as part of the same change, not as a separate follow-up. Prefer small, targeted edits with a dated note (as done throughout this file) over rewriting whole sections, so the edit history stays reviewable. Mention the doc updates in the completion summary (see item 10).

## 15. Current success criterion

The original success criterion has been achieved:

> An authenticated user can register one motorcycle from a smartphone-sized screen, view it after reloading, and another authenticated account cannot access it.

As of 2026-08-16, the app is live in beta and covers everything through Milestone 5 (section 10). No new success criterion has been defined yet for the next phase of work — when one is agreed with the project owner, replace this section with it rather than appending, so this section always states the single current target.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
