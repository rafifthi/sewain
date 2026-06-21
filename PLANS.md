# Sewain — Property Management · Project Plan & Status

> Status: **Working prototype** (frontend-first) · Reverse-engineered from the codebase + product direction · Last updated: 2026-06-19
> Describes what is **built today**, the **intended product behavior**, then the roadmap. Supersedes the original aspirational plan.

---

## 1. Vision

A central operations hub for Indonesian property owners to run rentals end-to-end —
across **kos, kontrakan, ruko, apartemen, and custom** types — covering properties & units,
tenants, leases & deposits, **automated rent invoicing + WhatsApp reminders + gateway payments**,
**utilities (PLN token resale with margin)**, contracts, maintenance, and documents, with
tenant self-service over a **WhatsApp bot**.

**One-line:** *"From booking to move-out — invoices, payments, and contracts run themselves."*

**Module focus principle:** every module earns its place against a single purpose. Build only what supports that purpose; nice-to-have is acceptable, decoration that competes with the task is not.

---

## 2. Current status at a glance

| Aspect | Reality today |
|--------|---------------|
| **Maturity** | Working, navigable **prototype**; most modules have real UI with functional dialogs. |
| **Data layer (today)** | **Frontend-first.** Modules read `lib/sample-data.ts`; edits persist to **`localStorage`**, not a DB. |
| **Data layer (target, MVP)** | **SQLite via libSQL/Turso** (hosted, serverless-safe), accessed with **Drizzle ORM**. Stays on **Vercel**. The Supabase Postgres migration becomes a **reference schema** (Postgres is the post-MVP/SaaS target). |
| **Auth** | **Supabase only** — email/password, persistent server-side session (no account/credentials in `localStorage`). The *only* thing Supabase does in the MVP (see §3). |
| **Automation** | None yet. Invoice generation, reminders, and gateway payments are the core gap to build. |

> **Deployment caveat:** substantial work is **uncommitted on `main`** / on unmerged branches, so Vercel (committed `main`) lags local. See §11.

---

## 3. Tech stack & architecture

- **Next.js 15** (App Router) + **React 19**, TypeScript.
- **shadcn/ui** on **Radix** + **Tailwind v4** (large bespoke layer in `app/globals.css`). *(Original plan said Ant Design; actual is shadcn.)*
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — **Auth only**.
- **SQLite via libSQL / Turso** for all domain data in the MVP — hosted, serverless-safe (a plain file does **not** persist on Vercel). Access with **Drizzle ORM + `@libsql/client`** through Next.js server actions / route handlers.

**Hosting:** stays on **Vercel**. Turso is the database; Drizzle is the query/migration layer; `@libsql/client` is the driver. Local dev can point Drizzle at a file or an embedded Turso replica.

**Current flow:** UI → `lib/sample-data.ts` (read) + `localStorage` (write); derived via `metrics.ts` / `deposit.ts`.
**Target (MVP):** UI → Next.js server actions / route handlers → **Drizzle → Turso (libSQL)**; Supabase used purely to authenticate and identify the user. Org-scoping is enforced **in app code** (no RLS) — fine for the single-org MVP.

**Auth requirement (point 1):** authentication must use **Supabase sessions that persist across browser sessions** — a returning user lands logged in, never forced to sign up again. **Do not store accounts or credentials in `localStorage`** (the old local user registry and the local-admin fallback are deprecated for this reason). On first sign-up, create the `organization` + `membership` row so the user has a workspace.

**Principles:** multi-tenant-ready (`organization_id` + RLS, deny-by-default); integrations config-first (`mode = stub|live`); generic property model (type-driven); money as integer rupiah (`bigint`); all due-date logic in **Asia/Jakarta**.

---

## 4. Domain model

Defined as TypeScript (`lib/types.ts`) and a **Postgres reference migration**. For the MVP, port these tables to a **SQLite schema** (same shape, SQLite types; `bigint`→`integer`, `jsonb`→`text`/JSON, enums→`text` + check). Postgres + RLS is the post-MVP/SaaS path.

```
organization 1─* membership *─1 user
organization 1─* property (type) 1─* unit_group 1─* unit
organization 1─* tenant
unit 1─* booking ──► lease            (booking reserves a unit before move-in)   ← TO ADD
lease *─* tenant (tenantIds[]) ; active lease ⇒ unit occupied
lease 1─* invoice 1─* invoice_line ; invoice 1─* payment
lease 1─* deposit_transaction         (collected | deduction | refund | forfeit)  ← app-layer, TO ADD as table
lease 1─* contract                    (rendered from a contract_template)         ← TO ADD
unit 1─* utility_meter 1─* utility_reading → utility invoice_line
organization 1─* utility_order        (PLN token resale: base + platform_fee = sell)
organization 1─* vendor ; unit/tenant 1─* ticket
organization 1─* document             (linked to tenant/lease/property/unit)
organization 1─* integration_setting (wa | payment | ppob, stub|live)
organization 1─* message_template     (per-event WhatsApp templates)
organization 1─* notification_log     (every send: idempotent + audit)            ← TO ADD as table
```

**To add for the target flows:** `bookings`, `deposit_transactions`, `contract_templates` + `contracts`, `notification_log`, and a billing-schedule config (generation day). `message_templates` exists in the model but needs an editor + variable engine.

---

## 5. Core lifecycle flow (points 5, 9, 10)

The product is organized around one tenancy lifecycle. Each stage has explicit state and owner actions:

```
 BOOK ─────► CONTRACT ─────► MOVE-IN ─────► LIVING ─────► MOVE-OUT ─────► SETTLE
 unit         generate        deposit        monthly        inspection      deposit
 reserved     from template   collected      auto-invoice   + final bill    deductions
 (hold)       + signed        (uang          + WA reminder                  → refund /
              → contract       jaminan)       + gateway pay                   forfeit
                                                                              → unit vacant
```

1. **Book** — reserve a vacant unit for a prospective tenant (hold; optional booking fee/DP). Unit shows `booked`. *(Needs a `bookings` entity/state — not built.)*
2. **Contract** — generate the lease contract from a **template** (§9), capture signatures/upload, link to the lease.
3. **Move-in** — activate the lease (unit → `occupied`); **collect the deposit** at the start of the period (held against future damage).
4. **Living** — system **auto-generates monthly invoices** on the configured day and drives **WhatsApp reminders + gateway payment** (§7).
5. **Move-out** — inspection records damages (tie to tickets/condition report); produce the final bill.
6. **Settle deposit** — apply **deductions** (damage, unpaid rent) against the held deposit → **refund** the remainder or **forfeit**; lease ends, unit returns to `vacant`. *(Deposit ledger + settlement UI built in the money module; needs the DB table + move-in/out + booking states to be end-to-end.)*

---

## 6. Module-by-module (purpose + status)

Legend: ✅ built · ◑ partial/stub · ⬜ not started.

| Module | Purpose | Status & notes |
|--------|---------|----------------|
| **Auth** | Owner/staff sign-in. | ◑ Supabase wired; must be **persistent (no localStorage accounts)** + create org/membership on signup. |
| **Dashboard** | Operational snapshot. | ✅ KPIs (occupancy, collected, overdue, tickets) from sample data. |
| **Properties** | **View & manage properties; see unit status** — which units are available, occupied, and **who occupies each**. | ✅ List + detail + unit management; *localStorage*. Keep focus on portfolio + occupancy. |
| **Tenants** | **Master data** for tenants who **have rented, are renting, or will rent**. View **payment history, personal data, and documents** per tenant. | ✅ List + detail (history, edit); *localStorage*. Add per-tenant documents + future/booked state. |
| **Leases & deposits** | Tie tenants↔unit; hold & settle the **deposit** (collected at start, used for damage). | ✅ *(money module)* Lease hub, deposit ledger, move-out settlement; *localStorage*. Needs **Create-lease/booking** flow + DB table. |
| **Payments / invoicing** | **Automated** monthly invoices + reminders + **gateway** collection. | ◑ Worklist + record payment built; **auto-generation, scheduled reminders, real payment links not built** (§7). |
| **Utilities — PLN token (MVP)** | Resell PLN tokens: set **platform fee** + **which nominals to show**; tenant pays via **gateway**. | ✅ Config (fee rule + nominals) + order dialog; *localStorage*; biller stubbed. *(Uncommitted on main — see §11.)* Metered billing is secondary. |
| **Contracts** | **Set contract templates; view generated contracts.** | ⬜ Not built — new module (§9). |
| **Message templates** | **Author per-event WhatsApp templates** with variables. | ⬜ Not built — new module (§10). `message_templates` modeled only. |
| **Maintenance / tickets** | Triage and resolve issues; feed move-out damage. | ✅ Inbox, create, vendor assign; session-only. Link to deposit deductions. |
| **Documents** | Store contracts/KTP/personal docs, linked to entities. | ✅ Folders/upload/preview (session only); move to Supabase Storage. |
| **Settings · Integrations** | Configure WA / payment / PPOB providers (`stub|live`). | ✅ Cards + test (simulated). The home for going live. |
| **Settings · Users / Org** | Members & roles. | ◑ Invite UI only; needs `memberships` backend. |
| **WA bot (tenant self-service)** | Tenant **pays bills** and **buys PLN tokens** via WhatsApp. | ⬜ Not built — new (§7, §8). |

> **Trim to purpose (point 12):** audit Settings sub-pages (billing rules, chatbot, notifications) and any module elements that don't serve the purpose above; drop or fold what's decorative.

---

## 7. Payments, reminders & WA-bot collection (points 4, 6, 7)

**Automated invoicing**
- A **scheduled job** generates invoices from active leases **monthly on a configurable day** (per-org default; per-lease `due_day` already exists). Lines = rent (+ utilities/fees).
- Implementation: Supabase **pg_cron / scheduled Edge Function**.

**Automated WhatsApp reminders**
- On **invoice creation**, on the **due date**, and when **overdue** — the system sends a WhatsApp message carrying the **payment-gateway link** (point 6).
- Implementation: `NotificationProvider` (live WA BSP) + `message_templates` + `notification_log` (idempotent); cadence driven by the scheduler.

**Gateway payments**
- On send, create a gateway invoice → store `payment_url`; a **webhook reconciles** paid status. Manual mark-paid stays for cash/transfer. Partial payments supported.
- Implementation: `PaymentProvider` (Xendit) server-side; webhook Edge Function with signature + idempotency.

**WA-bot bill payment (point 7)**
- Inbound WhatsApp: identify the tenant by **phone → tenant → outstanding invoices**, reply with the bill(s) + a gateway **payment link**, confirm on webhook.
- Implementation: `wa-inbound` Edge Function + lightweight conversation state.

---

## 8. Utilities — PLN token resale, MVP (point 8)

- **Scope = PLN electricity token** for MVP (extensible later to PDAM/pulsa).
- Module config: **platform fee** (flat or %) and the **set of token nominals** shown to tenants. `sell = base + platform_fee` (the platform's margin).
- **Payment via gateway**; token delivered via WhatsApp. Channels: web + **WA bot**.
- Built today: config (fee + nominals) + order dialog + transactions (localStorage); **biller is stubbed** and **uncommitted on main**.

---

## 9. Contracts module (point 9)

- **Templates:** author reusable contract templates with variables (tenant, unit, rent, deposit, term, due day…).
- **Generate:** render a contract from a template for a lease (at the *Contract* stage of §5) → PDF, stored in Documents, linked to the lease.
- **View:** list generated contracts, their status (draft / signed), and download.
- *Open:* e-signature vs upload-signed-scan; PDF rendering approach (see §12).

---

## 10. Message templates module (point 11)

- Editor for **per-event WhatsApp templates**: `rent_reminder`, `due_today`, `overdue`, `payment_confirmed`, `deposit_refunded`, `ticket_update`, `token_ready`, `contract_ready`.
- **Variable substitution** (`{{tenant_name}}`, `{{amount}}`, `{{due_date}}`, `{{payment_url}}`…) shared by the scheduler and WA bot.
- Backed by `message_templates`; every render logged to `notification_log`.

---

## 11. Repository & deployment status *(read before deploying)*

- **Branches:** `main` (baseline), `leases-deposit-ledger` (PR #1 — money module), `supabase-auth` (PR #2 — auth).
- **Uncommitted on `main`:** the full **PLN token page**, enhanced tickets/properties/documents/settings, `lib/utility-token-config.ts` — **not in any commit**, so Vercel doesn't have them (why PPOB "works locally, not in prod").
- **Actions:** commit/PR the working tree; merge PR #1/#2; set `NEXT_PUBLIC_SUPABASE_*` in Vercel; verify the deployed feature set.

---

## 12. Missing details to support these flows (point 13 — technical & flow gaps)

**Flow gaps**
1. **Booking entity is missing.** §5 starts at "book", but there's no booking state/hold, booking fee/DP, or expiry. Define `bookings` (unit hold → converts to lease). Today units only have an informal `booked` attribute.
2. **Move-in / move-out are not modeled** distinct from lease start/end. Need move-in/out dates, a **condition/inspection record**, and a way to source **damage deductions** (link move-out → tickets or an inspection checklist → deposit deduction).
3. **Deposit is app-layer only.** Promote `deposit_transactions` to a table and connect collection (move-in) and settlement (move-out) to the lifecycle so refund/forfeit is auditable.
4. **Invoice generation day** needs a config home (org-level default + per-lease override) and a clear rule for proration on mid-month move-in/out.
5. **Reminder cadence** (on-create / due / overdue) needs exact timing, retry, and de-duplication rules; overdue may also need **late-fee** policy.

**Technical dependencies (mostly backend, not yet built)**
6. **Persistent auth:** Supabase sessions + org/membership on signup; remove localStorage account storage. *(point 1)*
7. **SQLite persistence layer:** **Turso (libSQL) + Drizzle** schema + data-access (server actions/route handlers); **app-level org-scoping** (no RLS). Set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` in Vercel. Prerequisite for everything below.
8. **Scheduler:** no pg_cron with SQLite — use **Vercel Cron** (or an external cron) hitting an API route to generate invoices + dispatch reminders (idempotent, Asia/Jakarta).
9. **Payment gateway:** Xendit `PaymentProvider` + signed, idempotent **webhook** (API route) for reconciliation; never expose keys client-side.
10. **WhatsApp BSP:** live `NotificationProvider` (Fonnte/Wablas/Qontak) for outbound; **`wa-inbound` API route + conversation state** for the bill-pay / token bot.
11. **PPOB biller:** real provider for PLN token issuance; atomic order state machine with refund/retry on fulfilment failure.
12. **Contract rendering:** template → PDF pipeline + storage; decide e-sign vs upload-signed.
13. **Document/file storage:** SQLite stores rows, not blobs — pick a file store (Supabase Storage, S3-compatible, or Turso + object store) for documents/contracts/ticket photos.
14. **Persistence migration:** replace `sample-data.ts` + `localStorage` with SQLite-backed data access across all modules.
15. **Tenant identity for the bot:** WA number is the key to match `phone → tenant → invoices`; needs unique/normalized phone handling and a fallback when unmatched.

---

## 13. Roadmap

| Phase | Theme | Work |
|-------|-------|------|
| **Now** | Consolidate | Commit/merge in-flight + uncommitted work; persistent Supabase auth (no localStorage); provision **Turso** + add Drizzle; align local ↔ deployed. |
| **P1** | Persistence | Stand up **SQLite** schema + data access; replace `sample-data.ts`/`localStorage` per module; add `bookings`, `deposit_transactions`, `contracts`, `notification_log`, billing-schedule config; app-level org-scoping. |
| **P2** | Lifecycle | Booking → contract → move-in → move-out → deposit settle, end-to-end (§5). |
| **P3** | Billing automation | Scheduled invoice generation; WA reminders (create/due/overdue); gateway payment links + webhook reconcile. |
| **P4** | Tenant self-service | WA bot: pay bills + buy PLN token via gateway; token delivery. |
| **P5** | Contracts & templates | Contract templates + generation; message-template editor + variable engine. |
| **P6** | Go-live & polish | Flip integrations `stub → live`; late fees, roles, audit log, reporting; Supabase Storage for documents. |
| **Future** | SaaS | Multi-org onboarding, subscription billing, tenant/vendor portals. |

---

## 14. Open questions

1. **Booking fee/DP:** does booking collect money up front, and is it credited to the first invoice or the deposit?
2. **Proration** for mid-month move-in/out — in scope for the billing automation?
3. **Late fees** on overdue invoices — fixed, %, or none?
4. **Contracts:** e-signature vs upload-signed-scan; bilingual (ID/EN) template?
5. **WA BSP** choice (Fonnte / Wablas / Qontak) and **PPOB aggregator** for PLN tokens.
6. **Locale:** Bahasa Indonesia default, English, or bilingual?

**Resolved:** Data = **SQLite via Turso (libSQL) + Drizzle**, staying on **Vercel** (Postgres later); **Supabase = auth only**. · PPOB MVP = **PLN token**, gateway payment, configurable fee + nominals. · Auth = **Supabase, persistent (no localStorage)**. · Reminders carry a **gateway payment link**. · Deposit collected at move-in, settled at move-out. · Stack = **shadcn/Radix/Tailwind**.

---

## 15. Risks & mitigations

- **Local ↔ deployed drift** (uncommitted work) → commit/merge discipline. *(Active — §11.)*
- **localStorage is not a backend** → stand up the **Turso (libSQL) + Drizzle** layer before relying on persisted data (a plain file won't persist on Vercel).
- **WA number bans / webhook reliability / PPOB fulfilment failures / form spam / timezone bugs / PII (KTP)** → reputable BSP + template rules, idempotent signed webhooks, atomic order states with refund/retry, rate-limits, Asia/Jakarta everywhere, private Storage with restricted access.
