# Claude Code CLI — Site Services App V2 Mega Implementation

Copy everything below the line and paste it as your first prompt in Claude Code CLI.

---

## CRITICAL: READ THIS ENTIRE PROMPT BEFORE DOING ANYTHING

This is a massive parallel implementation using 25 sub-agents. You MUST complete all planning, context writing, and skill distribution BEFORE spawning any agents.

## Project Context

Site Services web app for Al Laith Projects Services LLC. Production app currently deployed at: https://ss-workshop-stock-app-az9p-git-main-calos-projects-df7b646d.vercel.app/

**Current state:** 76+ source files, 309 tests, 0 build errors. 4 engines built (Fleet Dashboard, Projects, Quotes, Settings). 9 of 15 pages broken due to missing Supabase connection. Live site has sample data only.

**What needs to happen:** Fix all broken pages, implement all features below, make documents match real Al Laith templates exactly, load real data from Season Stock (763 rows), and connect everything end-to-end.

## Step 0: Read ALL Reference Files

Before writing ANY code or spawning ANY agent, read these files:

1. `.claude/skills/site-services-webapp/SKILL.md` — 36 DOs, 18 DON'Ts, all architecture rules
2. `.claude/CLAUDE.md` — project brief, engine registry, coding conventions
3. `IMPLEMENTATION-CHECKLIST.md` — current progress (what's done, what's not)
4. `docs/wireframes/fleet-dashboard-v7.jsx` — approved Fleet Dashboard wireframe
5. `docs/Fleet-Dashboard-DOs-DONTs.md` — UI rules
6. `docs/UI-UX-Research-Findings.md` — frozen headers, glassmorphism, z-index

Reference documents (document templates — generated PDFs must match these EXACTLY):
7. `Site Services Project/references/quotes/AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf` — Quote template
8. `Site Services Project/references/delivery-notes/J60571-PGA-DELIVERY-NOTE.pdf` — DN template
9. `Site Services Project/references/return-notes/J60571-PGA-GROUP-RETURN-NOTE.pdf` — RN template
10. `Site Services Project/references/invoices/J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf` — Invoice template
11. `Site Services Project/references/purchase-orders/PR5873472-Container-Rental.xlsx` — PO template
12. `Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx` — ALL 763 asset rows

Assets already in project:
13. `public/assets/al-laith-logo.png` — extracted Al Laith lion logo (2500x1408, navy on black bg)

## Step 1: PLANNING PHASE (do this BEFORE spawning agents)

Write detailed context, instructions, skills, and scope for each of the 25 sub-agents listed below. Each agent needs:
- Clear scope boundaries (which files it owns)
- Which shared files it may READ but not WRITE
- Which reference documents to read
- Exact acceptance criteria
- File paths for everything it creates
- Integration points with other agents

Save the plan to `.claude/agent-plans/agent-{N}-{name}.md` for each agent.

### Architecture Rules (ALL agents must follow)

1. **Crash-proof modularity** — deletion of any engine folder must not break build
2. **Engine registry pattern** — sidebar + home read from `shared/engine-registry.ts`
3. **Dynamic imports only** — `import(/* webpackIgnore: true */ path)` via engine-loader
4. **No cross-engine imports** — engines import from `shared/` only
5. **IT-team readable code** — JSDoc on every export, inline WHY comments, section dividers, file headers, max ~40 line functions
6. **Drive = document database** — Supabase stores metadata, Drive stores files

## Step 2: THE 25 SUB-AGENTS

### Agent 1: Auth & User Management
**Scope:** Complete authentication system
- Admin seed user: `calo.lategan@allaith.com` / password: `1234` (hashed, never plaintext)
- Sign-up page with email/password registration
- Sign-up creates a PENDING user record → admin gets notification
- Admin approval/denial flow in Admin Settings → Users tab
- Password change functionality (Settings → Profile)
- Protected routes: unauthenticated → redirect to `/login`
- Role loading from `users` table after login
- Google OAuth button (stub — configured when credentials available)
- Session management with Supabase Auth
- **Files:** `src/shared/auth/`, `src/app/login/`, `src/app/signup/`, seed SQL for admin user

### Agent 2: Fleet Dashboard — Season Stock Data Load
**Scope:** Load all 763 rows from Season Stock 2026-2027.xlsx into seed data
- Read `Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx`
- Extract ALL rows (763 after header), ALL categories, ALL plant numbers, ALL descriptions
- Generate `supabase/seed-season-stock.sql` with INSERT statements
- Fleet Dashboard must show ALL 763 items on load, ALL cells EMPTY/AVAILABLE (white)
- No sample bookings — fleet dashboard starts completely clean
- Correct category grouping matching the spreadsheet exactly
- **Files:** `supabase/seed-season-stock.sql`, update `supabase/seed.sql`

### Agent 3: Fleet Dashboard — Description Column Toggle
**Scope:** Add minimize/expand toggle for the description column
- Toggle button (chevron icon) on the description column header
- Click → description column collapses to ~0px width, only plant number visible
- Click again → description column expands back to normal width
- Smooth CSS transition (200ms)
- State persisted in localStorage
- When minimized, plant numbers get more horizontal space
- **Files:** `src/engines/fleet-dashboard/components/calendar-grid.tsx` (modify)

### Agent 4: Fleet Dashboard — Plant Number Active Status Highlighting
**Scope:** Highlight the plant number column cell with today's active status color
- For each asset row, check bookings for TODAY's date
- If today falls within a booking period → color the plant number cell (leftmost sticky column) with that booking's status color
- Same color mapping: QUOTE=magenta, BOOKED=cyan, SERVICE=red, YARD=green, KSA=orange, LOGISTICS=diagonal stripes
- If no booking today → plant number cell stays white/default
- This makes it instantly visible which assets are active TODAY
- **Files:** `src/engines/fleet-dashboard/components/calendar-grid.tsx` (modify), `src/engines/fleet-dashboard/lib/utils.ts` (modify)

### Agent 5: Quote Engine — Fleet Dashboard Sync & Availability
**Scope:** Connect "Add Fleet Item" popup to real fleet dashboard data
- "Add Fleet Asset" modal must pull from ACTUAL fleet data (all 763 items from seed)
- Show real-time availability status from bookings table (not hardcoded)
- When user sets start/end date on quote → check fleet dashboard bookings for conflicts
- BOOKED items during requested period → show as "Unavailable" (greyed, not selectable)
- SERVICE items → available UNLESS service period overlaps requested dates
- AVAILABLE items → always selectable
- Category filter dropdown in the popup (filter by Ablution, Containers, Power, etc.)
- Default filter: show only AVAILABLE items first
- **Files:** `src/engines/quote/components/`, `src/engines/quote/hooks/`

### Agent 6: Quote Engine — VAT Toggle & Auto-Save Draft
**Scope:** VAT on/off toggle and auto-save draft protection
- VAT toggle (on/off switch) in quote form — affects Grand Total calculation
- When ON: add configurable VAT % (default 5%) to subtotal
- When OFF: Grand Total = Subtotal (no VAT line shown)
- Per-line-item VAT override (some items exempt even when VAT is on)
- Auto-save as "Unfinished Draft" if user navigates away without saving
- Explicit "Save as Draft" button alongside "Finalise"
- Draft recovery: on return to quote, prompt "You have an unsaved draft — Resume or Discard?"
- **Files:** `src/engines/quote/components/`, `src/engines/quote/hooks/`

### Agent 7: Quote Engine — Signatures
**Scope:** Digital signature system for quotes and all documents
- Admin can upload signature images per user (Settings → Users → click user → upload signature)
- User can upload their own signature image (Settings → Profile)
- When generating a Quote PDF, the quoter's signature auto-placed in the signature area
- Fallback: if no signature image, show typed name in script font
- Signature area matches the reference quote template (bottom of page, "Customer Signature" area on left, "Al Laith Representative" on right)
- Store signature images in Supabase storage (not Drive — these are internal assets)
- **Files:** `src/shared/signatures/`, `src/engines/quote/`, admin settings modification

### Agent 8: Quote Engine — Client & Project Autocomplete
**Scope:** Smart autocomplete for client name and project/quote title fields
- Client Name field: dropdown with existing clients from `clients` table + "Add New Client" option
- Adding new client inline (name, contact, email, phone, payment terms)
- Quote Title / Project field: dropdown with existing project names from `projects` table + "Add New Project"
- When existing client selected → auto-fill contact info, payment terms, client-specific rates
- Search-as-you-type with debounce (300ms)
- **Files:** `src/engines/quote/components/`, `src/shared/ui/autocomplete.tsx`

### Agent 9: Document Template — Quote PDF Generator
**Scope:** Generate Quote PDFs that EXACTLY match the reference template
- Read `Site Services Project/references/quotes/AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf`
- PDF must be pixel-perfect match of the reference layout:
  - AL LAITH PROJECTS SERVICES LLC header (top-left)
  - Al Laith lion logo (top-right) from `public/assets/al-laith-logo.png`
  - Company info: PO Box 191059, Saih Shuaib 3 DIC, Dubai UAE, Tel +971 4436360, Fax +971 42448680, rentals@allaith.com, www.allaith.com
  - "QUOTATION" title centered
  - Customer info block (left): Customer Name, Contact, Telephone, Email
  - Quote info block (right): Quote Ref, Quote Date, Al Laith Contact, Al Laith Email
  - Event info: Event Name, Location, Begin on Site, Event Date, Begin Dismantle
  - "EQUIPMENT, SERVICE, TRANSPORT & LOGISTICS" table: Item #, Item, Qty, On Hire, Off Hire, Duration, Total
  - "ADDITIONAL REQUIREMENTS" table: Item #, Item, Qty, On Hire, Off Hire, Duration, Total
  - Totals box: Total excl. VAT, VAT Amount, Grand Total incl. VAT (or Zero VAT)
  - General Notes section (standard boilerplate text — copy EXACTLY from reference)
  - Order Confirmation & Payment Terms section
  - Pricing & Availability section
  - Included & Excluded Items section
  - General Terms & Conditions section
  - Page 2: Google Docs link, Customer signature area (Name, Contact, Signature, Stamp)
  - Page numbering: "DD/MM/YYYY" bottom-left, page number bottom-right
- Use reportlab for PDF generation (server-side Next.js API route)
- **Files:** `src/shared/document-templates/quote-template.ts`, `src/app/api/documents/generate-quote/route.ts`

### Agent 10: Document Template — Delivery Note PDF Generator
**Scope:** Generate DN PDFs that EXACTLY match the reference template
- Read `Site Services Project/references/delivery-notes/J60571-PGA-DELIVERY-NOTE.pdf`
- Layout:
  - AL LAITH PROJECTS SERVICES L.L.C header + logo
  - Head Office address: Dubai P.O Box: 27349, Saih Shuaib 3, DIC, Dubai - UAE
  - Phone: +971 4443 6360, Email: info@allaith.com, Website: www.allaith.com
  - "DELIVERY NOTE" title centered
  - Left block: Customer, Address, Attention To, Site
  - Right block: Delivery Note No. (ALPS/SSDO/XXXX/YYYY), DN Date, Customer LPO, Customer LPO Dt., Contact No., Project No.
  - Table: Sr No, Description, Stock No. (plant numbers), Qty
  - "PLEASE NOTE THAT IT IS THE HIRERS RESPONSIBILITY TO INSURE THE EQUIPMENT" (red bold text)
  - Terms & Conditions paragraph
  - Signature line: "Signature:", "Received By: ___", "Position: ___"
  - Company stamp image (circular Arabic/English stamp)
  - Page numbering
- DN is EDITABLE after generation (can modify line items, dates)
- **Files:** `src/shared/document-templates/dn-template.ts`, `src/app/api/documents/generate-dn/route.ts`

### Agent 11: Document Template — Return Note PDF Generator
**Scope:** Generate RN PDFs matching reference template
- Same layout as DN but title is "RETURN NOTE"
- References original DN: Delivery Note No., Delivery Note Date
- Table: Sr No, Description, Stock No., Qty
- Same footer (insurance notice, T&C, signature, stamp)
- RN is EDITABLE after generation
- **Files:** `src/shared/document-templates/rn-template.ts`, `src/app/api/documents/generate-rn/route.ts`

### Agent 12: Document Template — Invoice PDF Generator
**Scope:** Generate Tax Invoice PDFs matching reference template
- Read `Site Services Project/references/invoices/J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf`
- Layout:
  - Header + logo
  - "TAX INVOICE" title, VAT # 100309977500003
  - Left: Customer, Address, VAT, Telephone, Email, Customer LPO, Payment Terms, Due Date
  - Right: Invoice No. (ALPS/SSRPINV/XXXXX/YYYY), Invoice Date, PM/SM Name, Quotation No., Agreement No., Project No., Allaith Contact, Contact No.
  - Table: Sr No, Description, Qty, Rate, Grs. Amt, VAT %, VAT Amt, Total
  - Each line item can have "Hire Period: DD-MMM-YYYY to DD-MMM-YYYY = N Day(s)" subtitle
  - Total row, Grand Total in words (AED Sixty-Five Thousand...)
  - Bank details box: Account Name: AL LAITH PROJECTS SERVICES L.L.C, Bank: Emirates NBD - AED, A/C: 1011017472901, Branch: Al Faheedi, Swift: EBILAEAD, IBAN: AE90026000101101747291
  - Summary of VAT table
  - Notes section
  - Receiver's Name + Signature, Al Laith Representative Name + Signature
  - Company stamp
- **Files:** `src/shared/document-templates/invoice-template.ts`, `src/app/api/documents/generate-invoice/route.ts`

### Agent 13: Document Template — Purchase Order PDF Generator
**Scope:** Generate PO PDFs matching reference template
- Read `Site Services Project/references/purchase-orders/PR5873472-Container-Rental.xlsx`
- Layout:
  - Header + logo + VAT No
  - "PURCHASE ORDER" title with PO number + date
  - Supplier box (left) + Consignee/Delivery box (right)
  - Payment Terms, Supplier Status, ETA/Delivery, Freight, Payment Method
  - Quotation No., Quotation Date
  - Table: Sr No, Description, Job No, QTY, UOM, Rate (AED), GRS.AMT, VAT AMT, Total Amt (AED)
  - Grand Total + words
  - Page 2: Authorization limits table (BU/DM LIMIT/BUM LIMIT), approval note
  - Approval chain: Prepared By, Requested By, Approved By Divisional Manager, Approved By BUM, Approved By CCO, Approved By CEO
- **Files:** `src/shared/document-templates/po-template.ts`, `src/app/api/documents/generate-po/route.ts`

### Agent 14: Document Generation — Auto DN/RN on Quote Finalisation
**Scope:** Automatic document creation workflow
- When a quote is FINALISED:
  - DN auto-generated with date = booking start_date - logistics_in_days (day before going to site)
  - RN auto-generated with date = booking end_date + logistics_out_days (day after return)
  - Both are editable after generation
  - Both linked to the quote's booking and project
  - Status: DN starts as "Draft", RN starts as "Draft"
  - Notification sent to Yard Supervisor when DN created
- Manual DN/RN creation also available (for cases without quotes)
- When creating manually, user selects which booking/project to link
- **Files:** `src/shared/document-workflow/`, modify quote engine finalisation handler

### Agent 15: Home Dashboard — Revenue Metrics Tab
**Scope:** Revenue analytics tab on home dashboard
- New tab navigation at top of home page: Status | Revenue | Utilization
- Revenue tab shows:
  - Overall revenue (sum of all finalised quotes)
  - Revenue per month (bar chart)
  - Revenue per year (comparison)
  - Highest paying client (with amount)
  - Most frequent client (by number of quotes)
  - Client who used most items (by total asset count across bookings)
  - Revenue by category (which asset types generate most revenue)
  - Top 10 quotes by value
- Data sourced from `bookings` + `quotes` tables
- **Files:** `src/app/components/revenue-tab.tsx`, `src/app/components/dashboard-tabs.tsx`

### Agent 16: Home Dashboard — Utilization Metrics Tab
**Scope:** Advanced utilization analytics tab
- Utilization tab shows:
  - Overall utilization (% of all assets booked across all time)
  - Current today utilization (% of assets with active booking TODAY)
  - This year utilization (% of asset-days booked this year / total asset-days)
  - Previous year utilization (same for last year)
  - Per-category utilization (each category's utilization %)
  - Advanced button → per plant number utilization (expandable table showing each asset's individual utilization %)
- Utilization formula must account for: varying pricing, different booking durations (days/months/years), seasonal off-time (mid-year low season)
- Utilization = (total booked days / total available days) * 100 for each scope
- Available days = calendar days minus SERVICE days
- Booked days = days with BOOKED/ON_HIRE status
- **Files:** `src/app/components/utilization-tab.tsx`

### Agent 17: Home Dashboard — Status View Tab
**Scope:** Status overview tab (current default view, reorganized)
- Status tab = the current home dashboard layout (KPIs, Active Projects, Recent Activity, Quick Actions, Engine Status)
- Move existing content into a tab component
- Default active tab = Status
- Tab component shared between Status/Revenue/Utilization
- **Files:** `src/app/components/status-tab.tsx`, modify `src/app/page.tsx`

### Agent 18: Delivery Notes Engine (Fix Broken Page)
**Scope:** Fix the Delivery Notes page that shows "Unable to load"
- Build complete Delivery Notes engine in `src/engines/delivery-notes/`
- List page: DN #, Client, Project, Status (Draft/Issued/Delivered/Signed), DN Date, Items count
- Detail page: full DN view with editable fields
- Create new DN manually (select project, add line items)
- Link to auto-generated DNs from quote finalisation
- Print/export as PDF using DN template (Agent 10)
- Status workflow: Draft → Issued → Delivered → Signed
- **Files:** `src/engines/delivery-notes/`, `src/app/(dashboard)/delivery-notes/`

### Agent 19: Fix All Other Broken Pages
**Scope:** Fix remaining 8 broken engine pages
- Each must have: list view with sample data fallback, proper error handling, engine isolation
- Engines to fix (each self-contained in `src/engines/{name}/`):
  - **Purchase Orders** — list/detail, link to PO template
  - **Maintenance** — list of maintenance records, link to fleet SERVICE bookings
  - **Water Delivery** — delivery tracking
  - **Workshop Stock** — inventory management
  - **Catalog** — product catalog browser
  - **Presentations** — Google Slides template integration (stub)
  - **MSRA** — safety document management (stub with template)
  - **Process** — workflow automation (stub)
- All must: register in engine-registry, have error boundary, show sample data when DB unavailable, pass deletion test
- **Files:** `src/engines/{each}/`, engine-registry updates

### Agent 20: Sample Data from Reference Documents
**Scope:** Create realistic sample data using actual reference documents
- Parse all reference PDFs and extract real data:
  - AMPLIFY EVENTS quote → sample quote record
  - PGA GROUP delivery notes → sample DN records
  - PGA GROUP return note → sample RN record
  - ALPS EVENTS F1 invoice → sample invoice record
  - Container rental PO → sample PO record
- Create seed SQL with this real data (actual client names, amounts, dates, plant numbers)
- Sample clients: AMPLIFY EVENTS MANAGEMENT, PGA GROUP, AL LAITH PROJECT SERVICES LLC - EVENTS, ALPS EVENTS
- Sample projects: PGA DUBAI INVITATIONAL 2026, F1 AFTER PARTY AT YAS MARINA, AMPLIFY 3DAYS GOLF BUGGY HIRE
- **Files:** `supabase/seed-reference-data.sql`

### Agent 21: Company Assets & Branding
**Scope:** Set up all company branding assets for document generation
- Al Laith logo already at `public/assets/al-laith-logo.png` — create transparent version
- Extract or recreate company stamp (circular stamp with Arabic + English text, "P.O. Box 27349 DUBAI - U.A.E.", "AL LAITH PROJECTS SERVICES L.L.C" around the border)
- Create `src/shared/company-info.ts` with:
  - Company name variants (full, short)
  - Addresses (HQ Dubai, PO Box)
  - Contact details (phone, fax, email, website)
  - VAT number: 100309977500003
  - Bank details (Emirates NBD, A/C, IBAN, Swift, Branch)
  - Standard T&C text (copied from quote reference)
  - Standard notes text
- **Files:** `public/assets/`, `src/shared/company-info.ts`

### Agent 22: Testing & Quality Assurance
**Scope:** Run all tests, fix failures, add missing tests
- Run `npm test` — fix any failures in existing 309 tests
- Add tests for new features: auth flow, quote availability checking, DN/RN generation, revenue calculations, utilization calculations
- Run deletion test on ALL engines (delete each one, verify build)
- Run `npm run lint` — fix all lint errors
- Verify TypeScript strict mode — no `any`, no `@ts-ignore`
- Check: no emojis in files, no "engine" in nav labels, no hardcoded colors outside tokens
- **Files:** `src/**/*.test.ts`, `src/**/*.test.tsx`

### Agent 23: Database Migrations & Schema Updates
**Scope:** Update schema for all new features
- Add to `users` table: `status` enum (active/pending/denied), `signature_image_url`, `password_change_required`
- Add `signup_requests` table: id, email, name, requested_role, status, created_at, reviewed_by, reviewed_at
- Add `quote_drafts` table for auto-save: id, user_id, quote_data (JSONB), created_at, updated_at
- Add `signatures` table: id, user_id, image_url, uploaded_at
- Add to `quotes` table: `vat_enabled` boolean, `vat_percentage` decimal, `auto_save_data` JSONB
- Add `revenue_cache` materialized view for dashboard performance
- Update `combined-migration.sql` with all new tables
- Add RLS policies for all new tables
- **Files:** `supabase/migrations/005_auth_signup.sql`, `supabase/migrations/006_signatures.sql`, `supabase/migrations/007_quote_drafts.sql`, update `supabase/combined-migration.sql`

### Agent 24: End-to-End Integration & Wiring
**Scope:** Wire everything together
- Quote finalisation → auto-generate DN + RN
- Fleet Dashboard bookings → Quote "Add Fleet Item" availability
- Revenue/utilization tabs → read from bookings + quotes tables
- Home Dashboard → show real project/booking data
- All document generation routes → use correct templates
- Notification system: signup approval, DN creation, quote finalisation
- Navigation: all sidebar links work, all routes resolve
- Error handling: every page shows useful error state, not blank screen
- **Files:** Cross-cutting integration work across engines

### Agent 25: Planning Docs & SKILL.md Update
**Scope:** Update all planning documentation
- Update `SKILL.md` with new DOs/DON'Ts from this session
- Update `IMPLEMENTATION-CHECKLIST.md` with new phases for all features
- Update `CLAUDE.md` with new engine status and architecture notes
- Update `VERSION-HISTORY.md` with v8 entry
- Update `PROJECT-TODO.md` with new tasks
- Update `DOs-and-DONTs.md` with new rules
- Write session notes in `MEMORY.md`
- **Files:** All planning/documentation files

## Step 3: EXECUTION RULES FOR ALL AGENTS

Every agent MUST follow these rules:

1. **Read SKILL.md first** — 36 DOs, 18 DON'Ts are law
2. **JSDoc on every export** — what it does, what it affects, what it connects to
3. **Inline WHY comments** — especially on business logic, color mappings, DB queries
4. **File headers** — every file starts with 2-3 line comment (purpose + engine)
5. **Section dividers** — `// ═══ SECTION ═══` in files >80 lines
6. **Max ~40 line functions** — extract helpers with descriptive names
7. **No cross-engine imports** — only from `shared/`
8. **Error boundaries** — every engine route wrapped
9. **Engine registry** — update if adding new engine
10. **Deletion test** — must pass after your work

## Step 4: EXECUTION ORDER

1. **First:** Agent 25 writes all planning docs (other agents reference these)
2. **Then:** Agents 2, 20, 21, 23 (data, assets, schema — foundational)
3. **Then:** Agents 1, 3, 4, 5, 6, 7, 8 (auth + fleet + quote improvements)
4. **Then:** Agents 9, 10, 11, 12, 13 (document templates — can be parallel)
5. **Then:** Agents 14, 15, 16, 17 (document workflow + dashboard tabs)
6. **Then:** Agents 18, 19 (fix broken pages)
7. **Then:** Agent 24 (wire everything)
8. **Last:** Agent 22 (test everything)

However, since agents are independent and crash-proof modularity ensures isolation, you CAN run all 25 in parallel with careful file ownership boundaries. The key constraint: only ONE agent writes to any given file.

## Step 5: LAUNCH

After completing Step 1 (writing all 25 agent plans), spawn all 25 sub-agents simultaneously. Each agent gets:
- Its plan from `.claude/agent-plans/agent-{N}-{name}.md`
- Access to all reference files
- The SKILL.md rules
- Clear file ownership boundaries

## New DOs to Add to SKILL.md

37. **DO generate documents that are pixel-perfect matches of reference templates** — same logo placement, same fonts, same table structure, same T&C text, same page layout. No creative reinterpretation.
38. **DO auto-generate DN and RN on quote finalisation** — DN date = start - logistics_in, RN date = end + logistics_out. Both editable after creation.
39. **DO implement signup approval flow** — new users register → admin notified → admin approves/denies → user gains access.
40. **DO check fleet availability when adding items to quotes** — blocked items show as unavailable, service items available if no overlap.
41. **DO auto-save quote drafts** — navigate away without saving → auto-save as unfinished draft. Recovery prompt on return.
42. **DO support VAT toggle per quote** — on/off switch affecting Grand Total. Per-line-item VAT override for exempt items.
43. **DO highlight plant number cells with today's active status color** — instant visual indicator of what's active today.
44. **DO provide collapsible description column on fleet dashboard** — toggle to show only plant numbers for a compact view.

## New DON'Ts to Add

19. **DON'T deviate from reference document templates** — generated PDFs must match the reference files exactly in layout, fonts, tables, T&C text, logo placement. Zero creative license.
20. **DON'T store passwords in plaintext** — always hash. Admin seed password `1234` must be hashed in seed SQL.
21. **DON'T auto-approve signups** — all new users start as PENDING until admin approves.
22. **DON'T allow adding unavailable fleet items to quotes** — if an asset is BOOKED during the requested period, it must not be selectable.

## Company Information (for document templates)

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

## Document Numbering Conventions

- Quote: `RP-XXXX` (sequential)
- Delivery Note: `ALPS/SSDO/XXXX/YYYY` (XXXX = sequence, YYYY = year)
- Return Note: same format as DN but different sequence
- Invoice: `ALPS/SSRPINV/XXXXX/YYYY`
- Purchase Order: `ALPS/PO-NI/EV/XXXX/YYYY`
- Project: `ALPS/SS/XXXXX`
- Quotation (internal): `ALPS/SSQTN/XXXXX/YYYYRN` (R1 = revision 1)
- Agreement: `ALPS/SSHA/XXXXX/YYYY`

## START NOW

1. Read all 13 reference files listed in Step 0
2. Write 25 agent plan files (Step 1)
3. Verify all plans have clear scope, file ownership, acceptance criteria
4. Spawn all 25 agents (Step 5)
5. After all agents complete: run full build + deletion test + lint + test suite
