# Claude Code CLI — Site Services V2 Sprint (Deadline: Monday)

Copy everything below the line and paste as your first prompt in Claude Code CLI.

---

## READ BEFORE DOING ANYTHING

You are finishing the Al Laith Site Services web app. The app is ALREADY BUILT — all 13 engines + Admin Settings are active, deployed to Vercel, Supabase connected. Your job is to add the V2 features that are NOT yet implemented. Deadline is Monday.

## Step 0: Read These Files First (MANDATORY)

Read each of these before writing a single line of code:

1. `.claude/skills/site-services-webapp/SKILL.md` — 44 DOs, 22 DON'Ts (your LAW)
2. `.claude/CLAUDE.md` — project brief, architecture, engine registry
3. `IMPLEMENTATION-CHECKLIST.md` — what's done (Phases 0-9), what's not (Phases 10-17)
4. `PROJECT-TODO.md` — prioritized remaining work
5. `VERSION-HISTORY.md` — build history

Reference documents (generated PDFs must match these EXACTLY):
6. `../Site Services Project/references/quotes/AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf`
7. `../Site Services Project/references/delivery-notes/J60571-PGA-DELIVERY-NOTE.pdf`
8. `../Site Services Project/references/return-notes/J60571-PGA-GROUP-RETURN-NOTE.pdf`
9. `../Site Services Project/references/invoices/J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf`
10. `../Site Services Project/references/purchase-orders/PR5873472-Container-Rental.xlsx`
11. `../Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx` (763 asset rows)

Assets already in project:
12. `public/assets/al-laith-logo.png` — Al Laith lion logo (2500x1408, navy on black bg — needs transparent version)

## CURRENT STATE OF THE APP (Verified Audit — 2026-03-14)

### What EXISTS and WORKS:
- 14 engine directories (13 engines + settings) — ALL active in engine-registry
- 180 TypeScript source files, 309 tests passing, 0 build errors
- Supabase connected — 17 tables, 9 enums, 50+ RLS policies, 4 triggers
- Auth: login page (email/password + Google OAuth button + demo mode), AuthProvider, AuthGuard, role hierarchy
- Fleet Dashboard: 21 files — frozen grid, status colors, time range selector, doc panel, email composer, CRUD, category collapse, logistics stripes
- Projects: 13 files — list/detail with 4 tabs (Documents/Assets/Timeline/Financials)
- Quotes: 21 files — create/edit with 3 tabs, multi-currency, draft management, asset picker, PDF preview
- Delivery Notes: 10 files — list/detail, dual verification, status workflow
- Return Notes: 10 files — condition tracking, inspections
- Purchase Orders, Maintenance, Water Delivery, Workshop Stock, Catalog, Presentations, MSRA, Process: 6-8 files each — list/detail with sample data
- Settings: 4 files — Users/Rate Card/Clients/System tabs
- Home Dashboard: KPI cards, active projects, recent activity, quick actions, engine status grid
- Shared UI: Button, Modal, SlideOutPanel, InlineEdit, Toast, ErrorBoundary, LoadingState, EmptyState
- Drive client stubs (types, errors, constants, hooks — no real API calls yet)
- PWA manifest + offline page (service worker not registered)

### What DOES NOT EXIST (your job):
- NO signup page (`/signup`) — no signup approval flow
- NO admin seed user (`calo.lategan@allaith.com`)
- NO `src/shared/company-info.ts` — no centralized company metadata
- NO `src/shared/signatures/` — no signature system
- NO `src/shared/document-templates/` — no PDF template generators
- NO `src/shared/document-workflow/` — no auto DN/RN on quote finalisation
- NO VAT toggle in quote engine
- NO auto-save draft on quote navigation
- NO fleet availability checking in "Add Fleet Asset" modal
- NO client/project autocomplete in quote form
- NO description column toggle on fleet dashboard
- NO plant number active status highlighting on fleet dashboard
- NO Season Stock 763-row seed data (current seed has sample data only)
- NO Home Dashboard tabs (Revenue / Utilization) — only Status view exists
- NO `signup_requests` table, NO `quote_drafts` table, NO `signatures` table
- NO `revenue_cache` materialized view

## ARCHITECTURE RULES (NON-NEGOTIABLE)

1. **Crash-proof modularity** — `rm -rf src/engines/fleet-dashboard/` → `npm run build` succeeds → app loads
2. **Engine registry** — sidebar + home read from `src/shared/engine-registry.ts`
3. **Dynamic imports only** — catch-all `[...engine]/page.tsx` with `import(/* webpackIgnore: true */ path)`
4. **No cross-engine imports** — engines import from `shared/` only
5. **IT-team readable code** — JSDoc on every export, inline WHY comments, section dividers, file headers, max ~40 line functions
6. **Drive = document database** — Supabase stores metadata, Drive stores files (stub the Drive calls for now)

## IMPLEMENTATION PLAN — 10 PARALLEL AGENTS

Plan each agent FIRST (write `.claude/agent-plans/agent-{N}.md`), then spawn all in parallel. Each agent owns specific files — NO TWO AGENTS WRITE THE SAME FILE.

### Agent 1: Auth & Signup System
**Creates:**
- `src/app/signup/page.tsx` — email/password registration form
- `supabase/migrations/006_auth_signup.sql` — `signup_requests` table (id, email, name, role_requested, status enum pending/approved/denied, created_at, reviewed_by, reviewed_at) + add `status` column to `users` table + RLS
- `supabase/seed-admin.sql` — INSERT admin user `calo.lategan@allaith.com` with Supabase Auth hashed password (use `crypt('1234', gen_salt('bf'))`)
- Update `src/engines/settings/` — add Users tab with signup approval list (approve/deny buttons)
- Update `src/shared/auth/auth-provider.tsx` — check user.status === 'active' before granting access, redirect PENDING users to "awaiting approval" page

**Acceptance:** Sign up → status PENDING → admin approves in Settings → user can login. Demo mode still works when Supabase unconfigured.

### Agent 2: Season Stock Data Load
**Creates:**
- `supabase/seed-season-stock.sql` — parse `../Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx`, generate INSERT statements for ALL 763 rows with correct categories, plant numbers, descriptions
- Update `supabase/seed.sql` to include season stock seed

**Acceptance:** Fleet Dashboard shows 763 assets in correct categories, all cells white/AVAILABLE.

### Agent 3: Company Info & Branding
**Creates:**
- `src/shared/company-info.ts` — single source of truth:
```typescript
export const COMPANY = {
  name: 'AL LAITH PROJECTS SERVICES L.L.C',
  address: 'Head Office - Dubai P.O Box: 27349, Saih Shuaib 3, DIC, Dubai - UAE',
  poBox: 'P.O Box 191059',  // alternate on quotes
  phone: '+971 4443 6360',
  fax: '+971 42448680',
  email: { general: 'info@allaith.com', rentals: 'rentals@allaith.com' },
  website: 'www.allaith.com',
  vat: '100309977500003',
  bank: {
    name: 'AL LAITH PROJECTS SERVICES L.L.C',
    bank: 'Emirates NBD - AED',
    account: '1011017472901',
    branch: 'Al Faheedi',
    swift: 'EBILAEAD',
    iban: 'AE90026000101101747291'
  }
} as const;
```
- `src/shared/company-info.ts` also exports: `STANDARD_TERMS`, `STANDARD_NOTES`, `INSURANCE_NOTICE`, `PRICING_AVAILABILITY_TEXT` — all copied EXACTLY from the reference Quote PDF
- `public/assets/al-laith-logo-transparent.png` — create transparent version (remove black background from existing logo using sharp or canvas)
- `public/assets/company-stamp.svg` — recreate the circular stamp as SVG: "AL LAITH PROJECTS SERVICES L.L.C" around top arc, Arabic text around bottom arc, "P.O. Box 27349 DUBAI - U.A.E." center

**Acceptance:** All document templates import from company-info.ts. Logo renders on white background cleanly.

### Agent 4: Document Template — Quote PDF
**Creates:**
- `src/shared/document-templates/quote-pdf.tsx` — React component matching reference EXACTLY
- `src/app/api/documents/generate-quote/route.ts` — API route using @react-pdf/renderer to generate PDF

**Layout (must match `AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf` pixel-for-pixel):**
- Header: "AL LAITH PROJECTS SERVICES LLC" top-left, lion logo top-right
- Company info: PO Box 191059, Saih Shuaib 3 DIC, Dubai UAE, Tel/Fax/Email/Web
- "QUOTATION" centered title
- Customer block (left): Customer Name, Contact, Telephone, Email
- Quote block (right): Quote Ref (RP-XXXX), Quote Date, Al Laith Contact, Email
- Event: Event Name, Location, Begin on Site, Event Date, Begin Dismantle
- Table 1: "EQUIPMENT, SERVICE, TRANSPORT & LOGISTICS" — Item #, Item, Qty, On Hire, Off Hire, Duration, Total
- Table 2: "ADDITIONAL REQUIREMENTS" — same columns
- Totals: Total excl. VAT, VAT Amount, Grand Total incl. VAT
- General Notes section (standard boilerplate — copy EXACTLY from reference)
- Order Confirmation & Payment Terms
- Pricing & Availability
- Included & Excluded Items
- General Terms & Conditions
- Page 2: Customer signature area, Al Laith Representative signature area
- Footer: date bottom-left, page number bottom-right

**Install:** `npm install @react-pdf/renderer --legacy-peer-deps`

**Acceptance:** Generated PDF side-by-side with reference — layout, fonts, spacing match.

### Agent 5: Document Templates — DN, RN, Invoice, PO
**Creates:**
- `src/shared/document-templates/dn-pdf.tsx` — Delivery Note matching reference
- `src/shared/document-templates/rn-pdf.tsx` — Return Note matching reference
- `src/shared/document-templates/invoice-pdf.tsx` — Tax Invoice matching reference
- `src/shared/document-templates/po-pdf.tsx` — Purchase Order matching reference
- `src/app/api/documents/generate-dn/route.ts`
- `src/app/api/documents/generate-rn/route.ts`
- `src/app/api/documents/generate-invoice/route.ts`
- `src/app/api/documents/generate-po/route.ts`

**Each template imports from `shared/company-info.ts`.** Read the reference PDFs in `../Site Services Project/references/` for exact layout.

**Key details per template:**
- **DN:** "DELIVERY NOTE" title, DN No. (ALPS/SSDO/XXXX/YYYY), table (Sr No, Description, Stock No., Qty), red bold insurance notice, T&C, signature line, company stamp
- **RN:** Same as DN but "RETURN NOTE", references original DN number/date
- **Invoice:** "TAX INVOICE", VAT No, line items with hire period subtitles, VAT %, Grand Total in words, bank details box, dual signatures + stamp
- **PO:** "PURCHASE ORDER", supplier/consignee boxes, Grand Total + words, authorization limits table, approval chain

**Acceptance:** Each generated PDF matches its reference document.

### Agent 6: Fleet Dashboard Enhancements
**Modifies (ONLY these files):**
- `src/engines/fleet-dashboard/components/calendar-grid.tsx`
- `src/engines/fleet-dashboard/lib/utils.ts`
- `src/engines/fleet-dashboard/hooks/use-fleet-data.ts` (if needed)

**Features:**
1. **Description column toggle** — chevron button on description column header. Click → column width transitions to 0px (CSS transition 200ms). Click again → expand back. State in localStorage key `fleet-desc-collapsed`.
2. **Plant number active status highlighting** — for each row, check if TODAY falls within any booking. If yes → color the plant number cell (sticky left column) with that booking's status color. If no booking today → white. Add helper `getTodayStatusForAsset(bookings, plantNumber, today)` to `utils.ts`.

**Acceptance:** Toggle description → column collapses smoothly. Assets with bookings today → plant number cell shows correct color.

### Agent 7: Quote Engine Enhancements
**Modifies (ONLY these files):**
- `src/engines/quote/components/quote-form.tsx`
- `src/engines/quote/components/asset-picker.tsx`
- `src/engines/quote/components/quote-line-items.tsx`
- `src/engines/quote/hooks/` (new or modified hooks)

**Features:**
1. **VAT toggle** — on/off switch in quote form. ON: configurable VAT % (default 5%) applied to subtotal. OFF: Grand Total = Subtotal. Per-line-item VAT exempt checkbox. Store `vat_enabled` + `vat_percentage` in quote record.
2. **Auto-save draft** — `beforeunload` event + route change detection → save quote form state to `quote_drafts` table (JSONB). On return → "Resume draft?" prompt. Explicit "Save as Draft" button.
3. **Fleet availability sync** — asset-picker.tsx must query `bookings` table for the quote's date range. BOOKED assets → greyed + "Unavailable (Booked DD/MM - DD/MM)". SERVICE assets → available unless overlap. Category filter dropdown. Default filter: AVAILABLE first.
4. **Client autocomplete** — Client Name field becomes search-as-you-type (300ms debounce) against `clients` table. "Add New Client" option opens inline form. Selected client auto-fills contact info.

**Creates:**
- `supabase/migrations/007_quote_enhancements.sql` — `quote_drafts` table + add `vat_enabled`, `vat_percentage` columns to `quotes` table

**Acceptance:** VAT on → total increases. Navigate away → draft auto-saved. Return → draft prompt. Booked assets greyed out. Client autocomplete works.

### Agent 8: Auto DN/RN on Quote Finalisation
**Creates:**
- `src/shared/document-workflow/auto-generate-documents.ts` — function that takes a finalised quote and:
  1. Creates DN record (date = booking start_date - logistics_in_days, default 1 day)
  2. Creates RN record (date = booking end_date + logistics_out_days, default 1 day)
  3. Both status = 'Draft', linked to quote's booking_id + project_id
  4. Triggers notification to Yard Supervisor role

**Modifies:**
- `src/engines/quote/` — finalisation handler calls `autoGenerateDocuments(quote)`
- `src/engines/delivery-notes/` — shows auto-generated DNs alongside manual ones
- `src/engines/return-notes/` — shows auto-generated RNs alongside manual ones

**Acceptance:** Finalise quote → DN + RN appear in respective engines with correct dates.

### Agent 9: Home Dashboard Tabs (Revenue + Utilization)
**Modifies:**
- `src/app/page.tsx` — wrap current content in tab component
- `src/app/components/dashboard-client.tsx` — add tab state

**Creates:**
- `src/app/components/dashboard-tabs.tsx` — tab navigation: Status | Revenue | Utilization
- `src/app/components/revenue-tab.tsx` — reads `bookings` + `quotes` tables:
  - Overall revenue (sum of finalised quote totals)
  - Revenue per month (bar chart — use recharts or simple div bars)
  - Revenue per year comparison
  - Highest paying client + most frequent client
  - Revenue by category
  - Top 10 quotes by value
- `src/app/components/utilization-tab.tsx` — reads `bookings` + `assets` tables:
  - Overall utilization = (total booked days / total available days) × 100
  - Today utilization = (assets with active booking today / total assets) × 100
  - This year vs previous year
  - Per-category breakdown
  - Expandable per-plant-number table (Advanced button)
  - Available days = calendar days − SERVICE days

**Acceptance:** Three tabs switch correctly. Revenue numbers consistent with seed data. Utilization math verified.

### Agent 10: Sample Data + Schema + Testing
**Creates:**
- `supabase/seed-reference-data.sql` — realistic records extracted from reference PDFs:
  - Clients: AMPLIFY EVENTS MANAGEMENT, PGA GROUP, ALPS EVENTS, AL LAITH EVENTS
  - Projects: PGA DUBAI INVITATIONAL 2026, F1 AFTER PARTY YAS MARINA, AMPLIFY GOLF BUGGY HIRE
  - Sample quotes, DNs, RNs with real amounts from references
- `supabase/migrations/008_v2_schema.sql` — `signup_requests` table, `signatures` table, `quote_drafts` table, add columns to `users` and `quotes`, `revenue_cache` materialized view

**Then runs:**
- `npm run build` — must pass with 0 errors
- `npm run test` — all 309+ tests must pass + new tests for V2 features
- Deletion test: delete `src/engines/fleet-dashboard/` → build → restore. Delete `src/engines/quote/` → build → restore.
- `npm run lint` if configured
- Check: no emojis, no "engine" in nav labels, no hardcoded colors outside tokens

**Acceptance:** Full green build + tests + deletion test.

## EXECUTION ORDER

1. **First (parallel):** Agents 2, 3, 10 (data + branding + schema — foundational, no dependencies)
2. **Then (parallel):** Agents 1, 4, 5, 6, 7 (auth + templates + fleet + quote — all independent)
3. **Then (parallel):** Agents 8, 9 (document workflow + dashboard tabs — depend on Agent 7 for quote finalisation)
4. **Last:** Agent 10 runs testing phase (after all others complete)

## CODE QUALITY RULES (ALL AGENTS)

Every agent MUST:

```
1. Read SKILL.md first — 44 DOs, 22 DON'Ts are law
2. JSDoc on every export:
   /**
    * Generates a Quote PDF matching the Al Laith reference template.
    * @param quote - Finalised quote record from Supabase
    * @returns PDF blob ready for upload to Google Drive
    * @affects Documents table (new record), Drive (file upload)
    * @reads quotes, clients, bookings, assets tables
    */
3. File headers (every new file):
   /**
    * Quote PDF Template Generator
    * Engine: shared/document-templates
    * Generates pixel-perfect Quote PDFs matching Al Laith reference.
    * Connected to: Quote Engine (finalisation), Drive client (upload)
    */
4. Section dividers in files > 80 lines:
   // ═══════════════════════════════════════════════════════════════
   // QUOTE HEADER SECTION
   // ═══════════════════════════════════════════════════════════════
5. Max ~40 line functions — extract helpers with descriptive names
6. Inline WHY comments on business logic:
   // VAT default 5% per UAE Federal Tax Authority standard rate
   // BOOKED assets hard-blocked per DO #40 — prevent double-booking
7. No cross-engine imports — only from shared/
8. Error boundaries on every engine route
9. Deletion test must pass after your work
```

## COMPANY INFORMATION (copy EXACTLY into company-info.ts)

```
AL LAITH PROJECTS SERVICES L.L.C
Head Office - Dubai P.O Box: 27349, Saih Shuaib 3, DIC, Dubai - UAE
Phone: +971 4443 6360
Fax: +971 42448680
Email: info@allaith.com (general) / rentals@allaith.com (quotes)
Website: www.allaith.com
VAT No: 100309977500003

Bank Details (for invoices):
Account Name: AL LAITH PROJECTS SERVICES L.L.C
Bank: Emirates NBD - AED
A/C No: 1011017472901
Branch: Al Faheedi
Swift Code: EBILAEAD
IBAN: AE90026000101101747291
```

## DOCUMENT NUMBERING

| Document | Format | Example |
|----------|--------|---------|
| Quote | `RP-XXXX` | RP-0596 |
| Delivery Note | `ALPS/SSDO/XXXX/YYYY` | ALPS/SSDO/0118/2026 |
| Return Note | `ALPS/SSRN/XXXX/YYYY` | ALPS/SSRN/0042/2026 |
| Invoice | `ALPS/SSRPINV/XXXXX/YYYY` | ALPS/SSRPINV/00010/2026 |
| Purchase Order | `ALPS/PO-NI/EV/XXXX/YYYY` | ALPS/PO-NI/EV/0001/2026 |

## IMPORTANT CONSTRAINTS

- **DO NOT break existing functionality** — all 13 engines must continue working
- **DO NOT restructure the app** — add to existing architecture, don't reorganize it
- **DO NOT create routes that bypass the catch-all pattern** — no `src/app/(dashboard)/fleet/page.tsx` etc.
- **DO NOT use pnpm** — use `npm`. Use `--legacy-peer-deps` when installing packages.
- **Google OAuth + Drive API are deferred until AFTER Monday demo** — keep stubs, don't implement real API calls. Auth credentials will be provided Monday once results are shown to management.
- **Passwords MUST be hashed** — never plaintext in seed SQL or code
- **Generated PDFs must match references** — zero creative license on layout/fonts/text

## AFTER ALL AGENTS COMPLETE

Run these verification steps:
1. `npm run build` — 0 errors, 0 warnings
2. `npm run test` — all tests pass
3. Delete `src/engines/fleet-dashboard/` → `npm run build` → succeeds → restore
4. Delete `src/engines/quote/` → `npm run build` → succeeds → restore
5. Start dev server → visit every page → no blank screens or errors
6. Update `IMPLEMENTATION-CHECKLIST.md` — check off completed V2 items
7. Update `VERSION-HISTORY.md` — add v9.0 entry
8. Update `.claude/CLAUDE.md` — update "Current Phase" and "Next priorities"

## START NOW

1. Read all 12 files listed in Step 0
2. Write 10 agent plan files (`.claude/agent-plans/agent-{N}.md`)
3. Spawn agents in the execution order above
4. After all complete: run verification steps
5. Deploy to Vercel
