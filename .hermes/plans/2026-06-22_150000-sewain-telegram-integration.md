# Sewain ↔ Telegram Bot — Integration Plan

> **Goal:** Integrate Sewain dashboard (client-only Next.js app) with property-manager-bot (Eve agent on Vercel) so Sewain can send Telegram notifications to tenants via the bot, and both systems share data.

**Architecture:**
```
Sewain (browser, localStorage)    property-manager-bot (Vercel)
       │                                  │
       │── POST /api/send ─────────────►  │  Send Telegram message
       │── POST /api/health ───────────►  │  Health check (test connection)
       │── POST /api/sync/tenant ──────►  │  Sync tenant data
       │── POST /api/sync/invoice ─────►  │  Sync invoice data
       │── POST /api/sync/ticket ──────►  │  Sync ticket data
       │                                  │
       │  Config stored in localStorage    │  DB mirrored from Sewain
       │  (botUrl, apiKey)                 │  (/tmp SQLite on Vercel)
```

**Channel labels:** "WhatsApp" → keep as "WhatsApp" for phone, add "Telegram" as a separate channel option. The integration adds Telegram as an *additional* channel — doesn't replace WhatsApp.

---

## Task 1: Add send endpoint to property-manager-bot

**Objective:** Create `/api/send` and `/api/health` endpoints on the bot that Sewain can call.

**Files:**
- Create: `~/projects/property-manager-bot/routes/send.ts`
- Create: `~/projects/property-manager-bot/routes/health.ts`
- Create: `~/projects/property-manager-bot/routes/sync-tenant.ts`
- Create: `~/projects/property-manager-bot/routes/sync-invoice.ts`
- Create: `~/projects/property-manager-bot/routes/sync-ticket.ts`
- Create: `~/projects/property-manager-bot/server.ts`

### Step 1: Create server entry point

`server.ts` — Exposes HTTP handler that Eve's Nitro server can pick up:

```ts
// ~/projects/property-manager-bot/server/routes/api/send.ts
import { defineEventHandler, readBody, createError } from "h3";

const API_KEY = process.env.SEWAIN_API_KEY || "sewain-integration-key";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // Auth check
  const authHeader = event.headers.get("x-api-key");
  if (authHeader !== API_KEY) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  
  const { chat_id, text, parse_mode } = body;
  if (!chat_id || !text) {
    throw createError({ statusCode: 400, message: "chat_id and text required" });
  }
  
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: Number(chat_id), text, parse_mode: parse_mode || "Markdown" }),
  });
  
  const data = await res.json();
  if (!data.ok) {
    throw createError({ statusCode: 500, message: data.description });
  }
  
  return { ok: true, result: data.result };
});
```

Health endpoint:
```ts
// ~/projects/property-manager-bot/server/routes/api/health.ts
import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
  return { ok: true, service: "property-manager-bot", timestamp: Date.now() };
});
```

Sync endpoints accept data and upsert into the local SQLite DB.

### Step 1b: Add API_KEY env var to Vercel

Set `SEWAIN_API_KEY` in Vercel env.

---

## Task 2: Update Sewain Settings → Integrasi tab

**Objective:** Add Telegram integration config to the existing Integrasi tab. Replace WhatsApp stub with a real config section.

**Files:**
- Modify: `~/projects/sewain/components/sewain-app.tsx` — SettingsPage + tenant form

### Step 2a: Add Telegram config state

Add to `SewainContent`:
```tsx
const [sewainApiKey, setSewainApiKey] = useState("");
const [botUrl, setBotUrl] = useState("https://property-manager-bot.vercel.app");
```

### Step 2b: Update SettingsPage Integrasi tab

In `SettingsPage` component, replace the current Integrasi tab with:

```tsx
{tab === "Integrasi" && <div className="integration-section">
  {/* Telegram Bot */}
  <div className="integration-card">
    <div className="integration-card-head">
      <MessageSquareText />
      <div>
        <strong>Telegram Bot — @theDaedalus_bot</strong>
        <p className="subtext">Kirim notifikasi ke penyewa via Telegram</p>
      </div>
      <span className="badge success">Aktif</span>
    </div>
    <div className="form-grid integration-fields">
      <Field 
        label="Bot API URL" 
        value="https://property-manager-bot.vercel.app" 
      />
      <Field 
        label="API Key" 
        type="password"
        value="••••••••" 
      />
    </div>
    <div className="actions">
      <button className="button" onClick={testConnection}>
        Uji Koneksi
      </button>
    </div>
  </div>
  
  {/* WhatsApp — keep as stub */}
  <div className="activity">
    <MessageSquareText />
    <span>
      <strong>WhatsApp · Mode simulasi</strong>
      <span className="cell-sub">Pesan dicatat tanpa dikirim ke nomor asli</span>
    </span>
    <button className="button">Tes</button>
  </div>
  
  {/* Payment gateway — keep as stub */}
  <div className="activity">
    <CreditCard />
    <span>
      <strong>Payment gateway · Mode simulasi</strong>
      <span className="cell-sub">Tautan pembayaran menggunakan data lokal</span>
    </span>
    <button className="button">Tes</button>
  </div>
</div>}
```

### Step 2c: Add Telegram ID to tenant form

Add a field in `TenantDialog`:
```tsx
<div className="form-field">
  <label htmlFor="tenant-telegram">Telegram ID</label>
  <input id="tenant-telegram" type="text" placeholder="Nomor Telegram (chat_id)" />
</div>
```

### Step 2d: Add "Kirim pesan Telegram" to tenant detail

In the tenant detail view, add a "Kirim pesan via Telegram" button that:
1. Opens a small modal/dialog
2. User types the message
3. Calls the bot's `/api/send` endpoint

---

## Task 3: Sync endpoints on bot side

**Objective:** Create endpoints for Sewain to push data updates to the bot's DB.

**Files:**
- Create: `~/projects/property-manager-bot/server/routes/api/sync/tenant.ts`
- Create: `~/projects/property-manager-bot/server/routes/api/sync/invoice.ts`
- Create: `~/projects/property-manager-bot/server/routes/api/sync/ticket.ts`

Each endpoint:
1. Verifies API key
2. Upserts data into the local SQLite DB
3. Returns `{ ok: true }`

---

## Task 4: Update bot schedules to use synced data

**Objective:** Ensure the bot's rent reminders and maintenance followup schedules work with data synced from Sewain instead of just seed data.

**Files:**
- Modify: `~/projects/property-manager-bot/agent/schedules/rent_reminders.ts`
- Modify: `~/projects/property-manager-bot/agent/schedules/maintenance_followup.ts`

No code changes needed — schedules already query the DB, just need data to be there.

---

## Task 5: Label & UX adjustments in Sewain

**Objective:** Minor label changes to support Telegram alongside WhatsApp.

1. **Column label**: `telepon: "Telepon"` (currently "WhatsApp") — or keep "WhatsApp" since the field IS for WhatsApp, add separate Telegram field
2. **Message template channel**: Show "WhatsApp" or "Telegram" option (currently hardcoded "WhatsApp")
3. **Channel form**: Add "Telegram" option in message schema's `saluran` field

---

## Verification

1. **Build test**: `pnpm build` on both projects
2. **Health check**: `curl https://property-manager-bot.vercel.app/api/health`
3. **Send test**: Call `/api/send` with valid API key, verify Telegram message is sent
4. **Sewain UI**: Navigate to Settings → Integrasi, see Telegram config
5. **Tenant form**: Add Telegram ID, save, see it in localStorage

---

## Risks & Notes

- **Bot DB is ephemeral** on Vercel (/tmp SQLite). Synced data survives only as long as the cold-start cache. For production, switch to Turso.
- **API key stored in localStorage** is client-side visible. Acceptable for a local-first tool used by the owner only.
- **Eve server routing**: Eve uses H3 under the hood, so custom API routes can coexist with Eve's agent routes. May need to verify the path mapping.
- **Column label change** from "WhatsApp" to "Telepon" might confuse users who are used to the WhatsApp label. Better to keep as is and add Telegram as a separate field.
