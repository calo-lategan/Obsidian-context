# CLAUDE CODE V5 — FULL AUDIT, FIX & PIXEL-PERFECT IMPLEMENTATION PROMPT

## Al Laith Site Services Web App — V10.0 Complete

---

## PHASE 0: MANDATORY PRE-WORK — READ EVERYTHING FIRST

**Before writing a SINGLE line of code, you MUST read and internalize ALL of the following files.** Do not skip any. Do not skim. Read them fully and extract every constraint, rule, and requirement.

### 0.1 Architecture & Rules (READ FIRST)
```
Read: .claude/CLAUDE.md
Read: .claude/skills/site-services-webapp/SKILL.md
Read: .claude/skills/multi-agent-workflow/SKILL.md
Read: docs/Fleet-Dashboard-DOs-DONTs.md
Read: docs/UI-UX-Research-Findings.md
```

### 0.2 Project Memory & Status
```
Read: .claude/projects/C--Users-USER-Desktop-Folder-Org-site-services-app/memory/MEMORY.md
Read: IMPLEMENTATION-CHECKLIST.md
```

### 0.3 Feature Specifications
```
Read: ../Claude Code Prompts/WEBAPP PLAN and features.md
Read: ../Claude Code Prompts/CLAUDE-CODE-V4-IMPLEMENTATION-PROMPT.md
```

### 0.4 Reference Documents (THE SOURCE OF TRUTH for PDF templates)
```
Read: ../Site Services Project/references/quotes/AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf
Read: ../Site Services Project/references/delivery-notes/J60571-PGA-DELIVERY-NOTE.pdf
Read: ../Site Services Project/references/return-notes/J60571-PGA-GROUP-RETURN-NOTE.pdf
Read: ../Site Services Project/references/invoices/J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf
Read: ../Site Services Project/references/purchase-orders/PR5873472-Container-Rental.xlsx
Read: ../Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx
Read: ../Site Services Project/references/maintenance/Site-Services-Maintenance-2026.xlsx
Read: ../Site Services Project/references/spreadsheets/Flexiloo-Details.xlsx
Read: ../Site Services Project/references/spreadsheets/Water-Delivery-V2.xlsx
```

### 0.5 Existing PDF Templates (compare against references)
```
Read: src/shared/pdf-templates/quote-template.tsx
Read: src/shared/pdf-templates/delivery-note-template.tsx
Read: src/shared/pdf-templates/return-note-template.tsx
Read: src/shared/pdf-templates/invoice-template.tsx
Read: src/shared/pdf-templates/purchase-order-template.tsx
Read: src/shared/pdf-templates/shared-styles.ts
Read: src/shared/company-info.ts
```

### 0.6 Current Engine Code (audit what exists)
```
Read: src/shared/engine-registry.ts
Read: src/shared/engine-loader.ts
Read: src/shared/auth/auth-provider.tsx
Read: src/shared/auth/role-permissions.ts
Read: src/shared/hooks/use-sidebar-visibility.ts
Read: src/shared/document-workflow/auto-generate-documents.ts
Read: src/app/components/sidebar.tsx
Read: src/app/(dashboard)/[...engine]/page.tsx
```

### 0.7 After Reading — Run Baseline
```bash
npm run build          # Must pass with 0 errors
npm run type-check     # Must pass
npm run test           # Record current pass count
```

**Document the baseline state before making ANY changes.**

---

## PHASE 1: FLEET DASHBOARD — FULL 763 ASSET LOAD

### Problem
The fleet dashboard shows **610 assets across 13 categories** from hardcoded sample data. The Season Stock spreadsheet has **763 unique plant numbers across 34 categories**. 21 categories are completely missing.

### Missing Categories (21)
DIESEL TANK (1), FEMALE VIP ABLUTION 40' (1), FLAG POLES (1), FLATPACK (5), FLEXILOO POD (4), FLEXILOO SHOWER (4), FLEXILOO URINAL (34), FLEXILOO VANITY (59), HAND WASH BASINS (4), MALE VIP ABLUTION 40' (1), MIXED VIP ABLUTION (4), PICNIC TABLES & BENCHES (1), POD CHEMICAL TOILET (2), ROAD BARRIER (2), SHOWER (5), TENT (1), TICKET BOOTH (20), TRAFFIC CONE (1), WATER DISPENSING CONTAINER (1), WUDU CONTAINER (1), WUDU MATE (1)

### Requirements

**1.1 Parse Season Stock XLSX → Seed SQL**
- Read `../Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx`
- Sheet name: "STOCK STATUS"
- Columns: CATEGORY, DESCRIPTION & SIZE, PLANT NO, STATUS, JOB NO., CLIENT / REMARKS, PROJECT, START DATE, END DATE, LOGISTICS IN, LOGISTICS OUT, DETAILS, [blank], YARD, IN KSA
- Generate `supabase/migrations/013_fleet_seed.sql` with:
  - INSERT INTO categories for all 34 categories (ON CONFLICT DO NOTHING)
  - INSERT INTO assets for all 763 plant numbers (ON CONFLICT DO NOTHING)
  - INSERT INTO bookings for any assets with active JOB NO./CLIENT/dates

**1.2 Update sample-data.ts**
- Replace the current 610-asset subset with ALL 763 assets across all 34 categories
- Keep the compact `{ p, d, s, c, pr, j, sd, ed, li, lo }` format
- Ensure every plant number matches the spreadsheet exactly (e.g., `4DR.ABL.16.1`, `OPO.20.01`, `OPO.L.20.01`, `FLX.T.01`)

**1.3 Admin Import Feature**
- In fleet dashboard admin mode, add "Import from Spreadsheet" button (admin-only)
- Accepts .xlsx upload, parses with SheetJS, validates against schema
- Upserts to `categories` and `assets` tables via Supabase
- Shows import summary: X new categories, Y new assets, Z updated

**1.4 Admin CRUD → Supabase Persistence**
Currently admin mode (add/remove category, add/remove/edit asset) only modifies LOCAL state. Wire ALL admin operations to Supabase:
- `addCategory()` → INSERT into categories
- `removeCat()` → DELETE from categories (cascade to assets)
- `renameCat()` → UPDATE categories SET name
- `addRow()` → INSERT into assets
- `removeRow()` → DELETE from assets
- `updateRow()` → UPDATE assets SET field

**1.5 KPI Cards Must Show 763+ Total**
After seed data loads, KPI should reflect actual DB count, not hardcoded sample totals.

### Files to Modify
```
src/engines/fleet-dashboard/lib/sample-data.ts          — Replace with full 763 assets
src/engines/fleet-dashboard/hooks/use-fleet-data.ts      — Wire Supabase queries
src/engines/fleet-dashboard/hooks/use-admin-mode.ts      — Persist CRUD to Supabase
src/engines/fleet-dashboard/components/kpi-cards.tsx      — Show real totals
src/engines/fleet-dashboard/components/fleet-dashboard.tsx — Add import button
supabase/migrations/013_fleet_seed.sql                    — NEW: seed all 763 assets
```

---

## PHASE 2: PDF TEMPLATES — PIXEL-PERFECT MATCH TO REFERENCES

Every generated document MUST look EXACTLY like the reference PDFs. Not "similar" — IDENTICAL layout, columns, fonts, spacing.

### 2.1 Quote Template — REWRITE to match reference

**Reference:** `AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf`

**Current app template has 9 columns. Reference has 7 columns. Fix:**

| Reference Column | Width | App Status |
|---|---|---|
| Item # | 6% | ✓ Exists |
| Item Description | 34% | ✓ Exists (rename from "Description") |
| Qty | 8% | ✓ Exists |
| On Hire | 12% | ✗ MISSING — add (date field) |
| Off Hire | 12% | ✗ MISSING — add (date field) |
| Duration | 10% | ✗ MISSING — add (calculated: Off Hire - On Hire) |
| Total | 18% | ✓ Exists |

**Remove from template:** Category, Rate Type, Unit Rate, Period, Mob/Demob columns (these are NOT in the reference)

**Additional fixes:**
- Add "Additional Requirements" table (separate section below main table, same column structure)
- Fix signature section: 4 fields (Customer Name, Customer Contact, Customer Signature, Company Stamp) — NOT 2 blocks
- Add "GENERAL NOTES" section with 4 subsections matching reference
- Navy header row (#1F4E79, white text, bold 9pt)
- Alternating row backgrounds (white / #F5F7FA)
- Grand Total row: navy background, white bold text, "AED" prefix
- Document title: "QUOTATION" (not "HIRE QUOTATION")

### 2.2 Delivery Note Template — Fix to match reference

**Reference:** `J60571-PGA-DELIVERY-NOTE.pdf`

**Current columns:** Item # (8%), Plant No (15%), Description (37%), Qty (10%), Condition at Loading (30%)
**Reference columns:** Sr No, Description, Stock No., Qty

**Fixes:**
- Column order: Sr No → Description → Stock No. → Qty (4 columns, not 5)
- "Stock No." label (not "Plant No")
- Remove "Condition at Loading" column from main table (condition is tracked separately in the system, not on the printed DN)
- Insurance notice: bold black text, ALL CAPS, centered (not yellow highlight)
- Signature section: single line layout — "Signature :" and "Received By:" on one row, "Position :" on second row (not three separate blocks)
- Company stamp placeholder in lower-right table area
- Terms text: "By signing below you agree to hire the above listed equipment in accordance with the quotation our terms & conditions of hire"

### 2.3 Return Note Template — Fix to match reference

**Reference:** `J60571-PGA-GROUP-RETURN-NOTE.pdf`

**Current columns:** 7 columns (Item #, Plant No, Description, Del. Qty, Ret. Qty, Condition, Notes)
**Reference columns:** Sr No, Description, Stock No., Qty (4 columns — same as DN)

**Fixes:**
- Match DN layout exactly — 4 columns, same structure
- Remove Del. Qty, Ret. Qty, Condition, Notes columns from printed output
- Keep condition tracking in the digital system (Supabase) — just don't print it
- Same insurance notice, signature layout, and terms as DN
- Document title: "RETURN NOTE" (verify correct)

### 2.4 Invoice Template — Fix to match reference

**Reference:** `J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf`

**Current columns:** Item # (6%), Description (30%), Category (14%), Qty (8%), Unit Rate (14%), Hire Period (14%), Total (14%)
**Reference columns:** Sr No., Description, Qty, Rate, Grs. Amt, VAT %, VAT Amt, Total (8 columns)

**Fixes:**
- Remove "Category" column — not in reference
- Add "Grs. Amt" (Gross Amount) column
- Add "VAT %" column per line item
- Add "VAT Amt" column per line item
- Show hire period dates BELOW description text (not as separate column): "Hire Period: 30-Nov-2025 to 06-Dec-2025= 7 Day(s)"
- "VAT #" line centered below document title (not in logo area)
- Grand total in words: full width centered row — "Grand Total : AED Sixty-Five Thousand..."
- "Summary of VAT" box: Amount Before Tax | VAT % | VAT Amount | Total Amount
- Bank Details box matches reference exactly (Account Name, Bank Name, A/C No., Branch, Swift Code, IBAN)
- Two signature blocks side-by-side: "Authorized By" and "Client Acceptance"
- Company stamp placeholder
- Page 2: Payment notice text, Receiver's Name field, Al Laith Representative Name field
- Customer details grid must include: Customer, Address, VAT, Telephone, Email, Customer LPO, Payment Terms, Due Date (left) and Invoice No., Invoice Date, PM/SM Name, Quotation No., Agreement No., Project No., Al Laith Contact, Contact No. (right)

### 2.5 Purchase Order Template — Fix to match reference

**Reference:** `PR5873472-Container-Rental.xlsx` (review structure)

**Fixes:**
- Columns: Description, Job No, QTY, UOM, Rate (AED), GRS.AMT, VAT AMT, Total Amt. (AED)
- Authorization limits table (DM LIMIT, BUM LIMIT)
- 6 approval signature lines: Prepared By, Requested By, Approved By DM, Approved By BUM, Approved By CCO, Approved By CEO

### Files to Modify
```
src/shared/pdf-templates/quote-template.tsx          — REWRITE
src/shared/pdf-templates/delivery-note-template.tsx   — REWRITE
src/shared/pdf-templates/return-note-template.tsx     — REWRITE
src/shared/pdf-templates/invoice-template.tsx         — REWRITE
src/shared/pdf-templates/purchase-order-template.tsx  — REWRITE
src/shared/pdf-templates/shared-styles.ts             — Update if needed
src/shared/company-info.ts                            — Verify all fields present
```

---

## PHASE 3: ADMIN SETTINGS — COMPLETE FIX

### 3.1 User Management
**Status:** Partially working. Approve/deny exists but errored previously.

**Verify and fix:**
- Approve button → creates user in Supabase `users` table with requested role → removes from pending
- Deny button → updates `signup_requests.status = 'denied'` → removes from pending
- Add User form → inserts new user into `users` table
- Edit user role → confirmation dialog → updates `users.role`
- Edit user status → updates `users.status` (active/inactive/suspended)
- Delete user (admin only) — add this if missing

**Test:** Create a signup request, approve it, verify user appears in active list with correct role.

### 3.2 Workflow Config Toggles
**Status:** Functional (DB-backed via workflow_config table). But user reports toggle switches positioned too far right.

**Fix:**
- Review toggle switch positioning in `system-tab.tsx`
- Ensure toggles are left-aligned with label text, not pushed to far right
- Test: Toggle each setting, click "Save Configuration", reload page, verify settings persisted

**Toggles to verify:**
- DN Trigger: Quote Finalisation / Logistics In Date (radio)
- RN Trigger: Quote Finalisation / Logistics Out Date (radio)
- Auto-generate PO (toggle switch)
- Auto-generate Invoice on Return (toggle switch)
- Require MSRA Before Delivery (toggle switch)
- Require Dual Verification on Delivery (toggle switch)

### 3.3 Role Management (RBAC)
**Status:** Permission matrix exists (14 engines × 4 roles). But user wants ability to ADD new roles and EDIT existing role names.

**Add:**
- "Add Role" button → modal with: Role Name, Color, Description
- New role gets default permissions (all visible, none accessible)
- Edit role name (click to rename inline)
- Delete custom role (not the 4 default roles — admin/manager/supervisor/operator are permanent)
- Persist custom roles to a new `roles` table or extend sidebar_visibility

### 3.4 Rate Card Tab
**Verify all working:**
- View rate card items grouped by category
- Add new item (code, description, unit rate, period, currency)
- Inline edit any cell (blur/Enter to commit)
- Delete item with confirmation dialog
- All CRUD persisted to `rate_card_items` table

### 3.5 Clients Tab
**Verify all working:**
- View clients list with search
- Add client (Company Name*, Contact, Email, Phone, Address, TRN, Payment Terms, Currency)
- Edit client (click row → modal)
- Deactivate/Reactivate client
- All CRUD persisted to `clients` table

### Files to Modify
```
src/engines/settings/components/system-tab.tsx        — Fix toggle positioning
src/engines/settings/components/role-management.tsx    — Add custom role CRUD
src/engines/settings/components/users-tab.tsx          — Verify approve/deny working
src/engines/settings/components/admin-settings.tsx     — Add delete user capability
src/engines/settings/components/rate-card-tab.tsx      — Verify Supabase persistence
src/engines/settings/components/clients-tab.tsx        — Verify Supabase persistence
```

---

## PHASE 4: EVERY ENGINE — FULL BUTTON & FEATURE AUDIT

For EACH engine listed below, verify EVERY button, link, form, dropdown, toggle, and clickable element works end-to-end with Supabase. If it falls back to sample data, wire it to the real table.

### 4.1 Quote Engine
**Pages:** List view, Detail/Form view, Preview
**Buttons & Actions:**
- [ ] "New Quote" → creates draft in `quotes` table
- [ ] Search input → filters list
- [ ] Status filter dropdown → filters by draft/pending/finalised/cancelled/expired
- [ ] Click row → navigates to `/quotes/[id]`
- [ ] Title input → saves to quotes.title
- [ ] Client dropdown (searchable) → saves to quotes.client_id
- [ ] Project dropdown → saves to quotes.project_id
- [ ] Job number input → saves to quotes.job_number
- [ ] Currency picker (AED/SAR/USD) → saves to quotes.currency
- [ ] Start date picker → saves to quotes.start_date
- [ ] End date picker → saves to quotes.end_date
- [ ] Logistics in/out days inputs
- [ ] Payment terms input
- [ ] Notes textarea
- [ ] "Add Line Item" → inserts row in quote_line_items
- [ ] Edit line item fields (description, category, qty, rate type, unit rate, periods, mob/demob, cross-hire toggle, supplier)
- [ ] Delete line item → removes from quote_line_items
- [ ] Subtotal/VAT/Grand Total calculated correctly
- [ ] VAT toggle per line item
- [ ] "Finalise" → changes status to finalised, creates bookings, auto-generates DN & RN
- [ ] "Cancel" → changes status to cancelled
- [ ] "Revise" → creates new revision (Q-XXXX-R1) with only new items
- [ ] "Delete" → removes draft quote
- [ ] Quote preview panel renders PDF-like view
- [ ] Download PDF button → generates PDF matching reference EXACTLY
- [ ] Asset picker → shows fleet assets with availability, blocks unavailable items
- [ ] Unsaved changes warning on navigate-away
- [ ] Auto-save draft to quote_drafts table

### 4.2 Delivery Notes Engine
**Pages:** List view, Detail view
**Buttons & Actions:**
- [ ] Search input → filters by DN #, client, project, site
- [ ] Status filter → draft/yard-checked/in-transit/delivered/confirmed/disputed
- [ ] Click row → navigates to detail
- [ ] Edit mode toggle (draft only)
- [ ] Line items table with condition dropdowns (good/fair/damaged/not-inspected)
- [ ] Loading notes, delivery notes per line item
- [ ] Signature capture: yard_checker, client_receiver
- [ ] Status transition buttons
- [ ] Download PDF → matches reference EXACTLY
- [ ] Deep link from fleet dashboard → opens correct DN

### 4.3 Return Notes Engine
**Pages:** List view, Detail view
**Buttons & Actions:**
- [ ] Search, status filter, click row
- [ ] Edit mode toggle (draft only)
- [ ] Line items: quantity delivered vs returned, condition at return
- [ ] Inspection progress bar
- [ ] Dual signatures (client, yard inspector)
- [ ] Status transitions: draft → issued → returned → inspected → closed
- [ ] Auto-create QC maintenance record on close (if workflow config enabled)
- [ ] Download PDF → matches reference EXACTLY
- [ ] Manual creation from DN (select DN → pre-populate items)

### 4.4 Purchase Orders Engine
**Pages:** List view, Detail view
**Buttons & Actions:**
- [ ] "New PO" button → create form
- [ ] Search, status filter, click row
- [ ] PO form: PO number, vendor/supplier, job reference, line items
- [ ] Line items: description, job no, qty, UOM, rate, gross, VAT, total
- [ ] Status transitions: pending → confirmed → completed
- [ ] Download PDF → matches reference EXACTLY
- [ ] Link to originating quote

### 4.5 Invoices Engine
**Pages:** List view, Detail view
**Buttons & Actions:**
- [ ] "New Invoice" button → create form
- [ ] Search, status filter, click row
- [ ] Invoice form: client, project, quote ref, PO ref, line items
- [ ] Line items: description, qty, rate, gross, VAT %, VAT amt, total
- [ ] Hire period dates per item
- [ ] Subtotal, VAT Total, Grand Total (number + words)
- [ ] Bank details section (from company-info.ts)
- [ ] Status transitions: draft → issued → sent → paid
- [ ] "Mark as Paid" button
- [ ] "Email Invoice" button (draft-first)
- [ ] Download PDF → matches reference EXACTLY

### 4.6 Maintenance Engine
**Pages:** List view, Detail view, Create form
**Buttons & Actions:**
- [ ] "New Maintenance" → create form
- [ ] Search, status filter, type filter (scheduled/reactive/qc-inspection)
- [ ] Click row → detail view
- [ ] Form: asset search/picker, maintenance type, scheduled date, technician, summary, notes
- [ ] Parts editor: add/remove parts (name, ID, qty, unit cost, currency, notes)
- [ ] Status transitions: scheduled → in-progress → completed
- [ ] Link to return note (if QC inspection triggered by RN close)
- [ ] Must match reference maintenance sheet structure

### 4.7 Water Delivery Engine
**Pages:** List view, Detail view
**Buttons & Actions:**
- [ ] Search, status filter, click row
- [ ] Create new water delivery run
- [ ] Form: site, project, quantity (litres), driver, vehicle, date
- [ ] Status transitions: draft → scheduled → in-transit → delivered → closed
- [ ] Driver signature capture
- [ ] Client signature + signer name
- [ ] Cancel with reason

### 4.8 Workshop Stock Engine
**Pages:** List view
**Buttons & Actions:**
- [ ] Search, category filter
- [ ] "Add Stock" button → create form
- [ ] Stock level badges (in stock/low/critical/out of stock)
- [ ] Click row → edit/detail
- [ ] Stock movement recording (in/out/adjustment)
- [ ] Movement history (immutable ledger)

### 4.9 MSRA Engine
**Pages:** List view, Detail view, Create/Edit form
**Buttons & Actions:**
- [ ] "New MSRA" → create form
- [ ] Search, status filter (draft/submitted/approved/rejected)
- [ ] Form: project, site location, scope of work, methodology, personnel, emergency info, PPE requirements
- [ ] Risk items: add/edit/remove (hazard, description, affected parties, risk level before/after)
- [ ] Control measures per risk item: add/edit/remove (description, responsible party)
- [ ] Status transitions: draft → submitted → approved/rejected
- [ ] Approval workflow (admin/manager only)
- [ ] Download/preview MSRA document

### 4.10 Projects Engine
**Pages:** List view, Detail view (4 tabs)
**Buttons & Actions:**
- [ ] Search, status filter (active/completed/quoted/cancelled)
- [ ] Click row → tabbed detail
- [ ] Assets Tab: fleet items assigned to project with status
- [ ] Documents Tab: linked quotes, DNs, RNs, invoices, POs
- [ ] Financials Tab: total quote value, total invoiced, total PO value
- [ ] Timeline Tab: project schedule
- [ ] Create project
- [ ] Edit project details

### 4.11 Catalog Engine
**Pages:** Grid view
**Buttons & Actions:**
- [ ] Search input (name, description, specs, category)
- [ ] Category filter dropdown
- [ ] Product cards: image placeholder, category badge, name, description, specs, price, availability bar
- [ ] Click card → detail (if implemented)

### 4.12 Presentations Engine
**Pages:** List view
**Buttons & Actions:**
- [ ] Search, status filter (draft/ready/sent)
- [ ] "New Presentation" button
- [ ] Click row → view/download
- [ ] Status transitions: draft → ready → sent

### 4.13 Process Engine
**Pages:** List view
**Buttons & Actions:**
- [ ] Search, status filter (active/paused/completed)
- [ ] "New Workflow" button
- [ ] Progress bar (stages completed / total)
- [ ] Click row → detail/edit

### 4.14 Home Dashboard
**Elements:**
- [ ] KPI cards (total assets, available, on-hire, in-maintenance)
- [ ] Active projects list
- [ ] Recent activity feed
- [ ] Engine status grid (all 15 engines with status indicators)
- [ ] Revenue tab
- [ ] Utilization tab

### 4.15 Sidebar
**Elements:**
- [ ] All 15 engines listed (based on engine-registry.ts)
- [ ] Active route highlighted (navy)
- [ ] Role-based visibility (admin sees all, operator sees subset)
- [ ] Locked engines show lock icon + "Access Restricted" tooltip
- [ ] Collapsible on mobile
- [ ] Logo/branding at top

---

## PHASE 5: CROSS-ENGINE WORKFLOWS — END-TO-END VERIFICATION

### 5.1 Quote → DN → RN → Invoice Pipeline
1. Create quote with line items
2. Finalise quote → verify bookings created in fleet dashboard
3. Verify DN auto-generated (if workflow config enabled)
4. Verify RN auto-generated (if workflow config enabled)
5. Complete DN workflow (yard check → transit → delivery → confirm)
6. Complete RN workflow (issue → return → inspect → close)
7. Verify QC maintenance record created on RN close (if enabled)
8. Create invoice linked to quote
9. Verify all documents visible in Projects engine Documents tab
10. Verify financial totals update in Projects Financials tab

### 5.2 Fleet Dashboard ↔ Quotes
1. Click empty cell in fleet calendar → opens create modal
2. Select "New Quote" → navigates to quote form with asset pre-selected
3. Finalise quote → verify asset status changes to BOOKED in fleet dashboard
4. Cancel quote → verify asset returns to AVAILABLE

### 5.3 Status Cascading
- Quote finalised → linked DN status = draft, linked RN status = draft
- Quote cancelled → linked DN/RN cancelled
- DN confirmed → triggers next step in pipeline

### 5.4 Document Numbering
Verify auto-increment works correctly:
- Quotes: RP-XXXX (sequential)
- DN: ALPS/SSDO/XXXX/YYYY
- RN: ALPS/SSRN/XXXX/YYYY
- Invoice: ALPS/SSRPINV/XXXXX/YYYY
- PO: ALPS/PO-NI/EV/XXXX/YYYY

---

## PHASE 6: UI/UX POLISH

### 6.1 Toggle Switch Positioning
In admin settings System tab, workflow toggle switches are pushed too far right. Fix:
- Align toggle switches with their label text
- Use consistent spacing: label left, toggle right-aligned within a reasonable width (not edge-to-edge)
- Test on desktop (1920px) and tablet (768px)

### 6.2 Responsive Design
Verify all pages work at:
- Desktop: 1920×1080
- Laptop: 1366×768
- Tablet: 768×1024
- Mobile: 375×812

### 6.3 Glass Card Consistency
- All list views use glass card container (border-white/20, backdrop-blur-[20px])
- Consistent padding, border radius
- No glassmorphism on data cells (only chrome/panels)

### 6.4 Loading States
Every page must show:
- Loading skeleton while data fetches
- Error alert on failure with retry button
- Empty state when no data
- Sample data banner (amber) when using fallback data

---

## PHASE 7: BUILD VERIFICATION & DELETION TEST

After ALL changes:

```bash
# 1. Build must pass clean
npm run build

# 2. TypeScript strict must pass
npm run type-check

# 3. Tests must pass (same or higher count than baseline)
npm run test

# 4. Deletion test — EVERY engine must be independently removable
for engine in fleet-dashboard quote delivery-notes return-notes purchase-orders invoices maintenance water-delivery workshop-stock msra projects catalog presentations process settings; do
  echo "Testing deletion of $engine..."
  mv "src/engines/$engine" "/tmp/$engine-backup"
  npm run build 2>&1 | tail -5
  mv "/tmp/$engine-backup" "src/engines/$engine"
done

# 5. Lint
npm run lint
```

**All 5 must pass before committing.**

---

## EXECUTION ORDER

| Phase | Priority | Can Parallelize? |
|---|---|---|
| Phase 0: Read all docs | MANDATORY FIRST | No |
| Phase 1: Fleet 763 assets | High | Yes (independent) |
| Phase 2: PDF templates | High | Yes (independent per template) |
| Phase 3: Admin settings | High | Yes (independent) |
| Phase 4: Engine audit | Medium | Yes (per engine) |
| Phase 5: Cross-engine workflows | Medium | No (depends on Phase 4) |
| Phase 6: UI polish | Low | Yes (independent) |
| Phase 7: Build verification | MANDATORY LAST | No |

---

## RULES (from SKILL.md — NEVER VIOLATE)

1. **Crash-Proof Modularity:** `rm -rf src/engines/[any-engine]/ && npm run build` MUST always pass
2. **Input-Based Integration:** Engines communicate ONLY through shared Supabase tables. NO cross-engine imports.
3. **Engine Registry:** `src/shared/engine-registry.ts` is append-only metadata. No logic.
4. **Dynamic Imports:** Template literal webpack context in engine-loader.ts. No path aliases.
5. **Sample Data Fallback:** Every engine MUST have `lib/sample-data.ts` that works when Supabase is unavailable.
6. **npm only:** Do NOT use pnpm, yarn, or bun.
7. **Tailwind v4:** CSS-first config. No `tailwind.config.js`.
8. **No dark mode.** No emojis in navigation.
9. **Draft-first emails:** Never auto-send. Always create draft, confirm, then send.
10. **PDF templates MUST match reference documents exactly.** Not approximately. EXACTLY.

---

## COMMIT STRATEGY

After each Phase:
1. Run build + type-check + tests + deletion test
2. Commit with descriptive message: `feat(phase-X): [description]`
3. Update MEMORY.md with current state
4. Update IMPLEMENTATION-CHECKLIST.md with completed items

---

## SUMMARY OF ALL KNOWN ISSUES

| # | Issue | Engine | Severity |
|---|---|---|---|
| 1 | Fleet shows 610/763 assets, missing 21 categories | Fleet Dashboard | Critical |
| 2 | Admin CRUD is local-only, not persisted to Supabase | Fleet Dashboard | Critical |
| 3 | Quote PDF columns don't match reference (9 vs 7 cols) | PDF Templates | Critical |
| 4 | DN PDF columns don't match reference | PDF Templates | Critical |
| 5 | RN PDF columns don't match reference | PDF Templates | Critical |
| 6 | Invoice PDF missing VAT %, VAT Amt columns, hire period display wrong | PDF Templates | Critical |
| 7 | PO PDF needs authorization limits table | PDF Templates | Critical |
| 8 | Toggle switches positioned too far right in workflow settings | Admin Settings | Medium |
| 9 | Cannot add custom roles (hardcoded to 4) | Admin Settings | Medium |
| 10 | Signup approve/deny was erroring | Admin Settings | High |
| 11 | Most engines fall back to sample data instead of Supabase | All Engines | High |
| 12 | Cross-engine workflows (quote→DN→RN→invoice) not fully tested | Workflow | High |
| 13 | Document numbering auto-increment not verified | All Documents | Medium |
| 14 | No fleet asset import from XLSX | Fleet Dashboard | High |
| 15 | Quote Additional Requirements table missing from PDF | PDF Templates | Medium |
