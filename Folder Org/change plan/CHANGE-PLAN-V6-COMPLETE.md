# V6 CHANGE PLAN — SITE SERVICES WEBAPP
## Complete Audit Log + Claude Code Implementation Prompt
### Generated: 2026-03-23 | Audited live at: ss-workshop-stock-app-az9p-calos-projects-df7b646d.vercel.app

---

## READ THESE FIRST (MANDATORY)

```
.claude/CLAUDE.md
.claude/skills/site-services-webapp/SKILL.md
```

---

## PART 1: FULL LIVE WEBAPP AUDIT LOG

### 1.1 Pages That WORK (render data)

| Page | URL | Status | Issues Found |
|------|-----|--------|--------------|
| Dashboard (Home) | `/` | WORKS | Stats disconnected from real data |
| Fleet Dashboard | `/fleet` | WORKS | Cell click modal buttons dead, +New Quote dead, admin CRUD local-only |
| Quotes | `/quotes` | WORKS | Missing year/month filter, "Unknown Client", AED 0 on RP-0596, backwards date range |
| Projects | `/projects` | WORKS | All projects show AED 0 value and 0 assets — no aggregation |
| Delivery Notes | `/delivery-notes` | WORKS (empty) | No "+ New DN" button, no way to create DNs manually |
| Return Notes | `/return-notes` | WORKS (empty) | No creation mechanism visible |
| Purchase Orders | `/purchase-orders` | WORKS (empty) | No creation mechanism visible |
| Maintenance | `/maintenance` | WORKS (empty) | Has "+ New Record" button — verify it works |
| Water Delivery | `/water-delivery` | WORKS (empty) | No creation mechanism visible |
| Workshop Stock | `/workshop-stock` | WORKS (empty) | No creation mechanism visible |
| MSRA | `/msra` | WORKS (empty) | Has "+ New MSRA" button — verify it works |
| Settings | `/settings` | WORKS | Toggle switches too far right, dynamic Tailwind broken, button sizing |

### 1.2 Pages That are BROKEN (error state)

| Page | URL | Error Message | Root Cause |
|------|-----|---------------|------------|
| Invoices | `/invoices` | "Unable to load invoices" | Hook has `enabled: isSupabaseConfigured` but Supabase IS configured — likely table missing or query error |
| Catalog | `/catalog` | "Unable to load catalog" | Same pattern — table may not exist or query failing |
| Presentations | `/presentations` | "Unable to load presentations" | Same pattern |
| Process | `/process` | "Unable to load process workflows" | Same pattern |

**ACTION:** For each broken engine, check:
1. Does the Supabase table exist? (run `SELECT * FROM information_schema.tables WHERE table_name = 'X'`)
2. Does the hook query match the actual table schema?
3. Are RLS policies blocking the anon key?
4. Is the error being swallowed? Add `console.error` to catch the actual Supabase error.

### 1.3 Stats Inconsistencies (USER-REPORTED)

**Home Dashboard shows:**
- Total Assets: 763, On Hire: 28% (216 assets), Available: 72% (547 assets)
- Under Service: 0, Active Projects: 0, Pending Quotes: 1

**Fleet Dashboard shows:**
- Total: 763, Available: 547, Booked: 123, Quoting: 0, Util: 28%

**Problems:**
1. Home says "Active Projects: 0" but Projects page shows 6 Active projects (WORLD TRIATHLON, EMJ EVENTS, USHUAIA, WICKED TENT, AMPLIFY, PGA GROUP)
2. Home "On Hire 28%" = 216 assets, but Fleet "Booked: 123" — these should match or be clearly different metrics
3. Home counts `assets.current_status === 'on_hire'` while Fleet counts booking records — DIFFERENT DATA SOURCES
4. Fleet "Quoting: 0" but Home "Pending Quotes: 1" — again different data sources
5. All Project values show "AED 0" — no financial aggregation implemented

**FIX:** Unify the data source. Both dashboards should derive stats from the SAME query/calculation:
- Create a shared `useAssetStats()` hook that both dashboards consume
- Stats should come from bookings table (authoritative) cross-referenced with assets table
- Active Projects count should query projects table with `status = 'active'`

---

## PART 2: DATA FLOW MAP — CONNECTIONS BETWEEN ENGINES

### 2.1 Expected Flow (Business Logic)

```
FLEET DASHBOARD (cell click)
    ├── Create Quote → QUOTES ENGINE
    ├── Create Booking → BOOKINGS (in fleet)
    ├── Schedule Service → MAINTENANCE ENGINE
    └── Mark KSA → Update asset status

QUOTE (finalise)
    ├── Create Bookings → FLEET shows as BOOKED
    ├── Auto-generate DN → DELIVERY NOTES
    ├── Auto-generate RN → RETURN NOTES
    └── Link to Project → PROJECTS aggregates value

DN (complete delivery)
    └── Update booking status → Fleet shows ON SITE

RN (close return)
    ├── Create QC Maintenance → MAINTENANCE
    └── Update booking status → Fleet shows RETURNED/AVAILABLE

INVOICE (create)
    ├── Link to Quote → financial tracking
    └── Update Project → financial totals

PURCHASE ORDER (confirm)
    └── Link to Project → procurement tracking

PROJECT (aggregate)
    ├── Sum bookings → asset count
    ├── Sum quotes → quoted value
    ├── Sum invoices → invoiced value
    └── Sum POs → procurement cost
```

### 2.2 Implementation Status of Each Connection

| # | Connection | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Fleet cell click → Create Quote | **NOT IMPLEMENTED** | `create-modal.tsx` buttons have NO onClick handlers |
| 2 | Fleet cell click → Create Booking | **NOT IMPLEMENTED** | Same — dead buttons |
| 3 | Fleet cell click → Schedule Service | **NOT IMPLEMENTED** | Same — dead buttons |
| 4 | Fleet cell click → Mark KSA | **NOT IMPLEMENTED** | Same — dead buttons |
| 5 | Fleet "+ New Quote" button | **NOT IMPLEMENTED** | `filter-bar.tsx` — no onClick handler |
| 6 | Quote finalise → Create Bookings | **IMPLEMENTED** | `use-quote-mutations.ts:432-454` |
| 7 | Quote finalise → Auto-generate DN | **IMPLEMENTED** | `auto-generate-documents.ts` |
| 8 | Quote finalise → Auto-generate RN | **IMPLEMENTED** | `auto-generate-documents.ts` |
| 9 | Quote cancel → Cascade to DN/RN | **CODE EXISTS BUT NEVER CALLED** | `cascadeQuoteStatus()` defined but not imported |
| 10 | DN completion → Update booking status | **NOT IMPLEMENTED** | DN status change has no downstream effect |
| 11 | RN close → Create QC Maintenance | **PARTIAL** | FK exists but auto-creation missing |
| 12 | Invoice → Project financials | **NOT IMPLEMENTED** | FK exists, UI doesn't aggregate |
| 13 | Project → Aggregate bookings/quotes/invoices | **INCOMPLETE** | Shows bookings only, value hardcoded to 0 |
| 14 | Fleet admin CRUD → Supabase | **NOT IMPLEMENTED** | Local Zustand state only, comment says "DB write will be added" |
| 15 | PDF upload → Update quote/fleet entry | **NOT IMPLEMENTED** | No file upload mechanism exists |
| 16 | Home dashboard stats → Real data | **PARTIAL** | Queries exist but use different data source than fleet |

---

## PART 3: PDF TEMPLATE AUDIT — Quote vs Reference

### 3.1 Critical Mismatches

| # | Element | Reference PDF | Current Template | Fix Required |
|---|---------|--------------|-----------------|--------------|
| 1 | Logo | Lion logo IMAGE | Text fallback "AL LAITH" | Embed lion logo as base64 in template or provide logoUrl |
| 2 | Company name | "AL LAITH PROJECTS SEVICES LLC" | "AL LAITH PROJECTS SERVICES L.L.C" | Match reference exactly (keep typo "SEVICES" — it's their official branding) |
| 3 | Phone number | +971 4436360 | +971 4443 6360 | Fix in company-info.ts line 29 |
| 4 | Additional Requirements "Section Total" | RED text | Black text | Change color to red in quote-template.tsx |

### 3.2 Items Already Correct

- All table structures (7-column equipment + additional requirements) ✓
- All font sizes and weights throughout ✓
- All color values except Section Total ✓
- Signature block layout (no border, 4 fields with lines, stamp box) ✓
- General Notes subsections (4 sections, correct order and titles) ✓
- Totals formatting (no currency prefix except Grand Total line) ✓
- Page footer (date left, page number right) ✓
- Customer details grid (6 left fields, 7 right fields including Begin Dismantle) ✓

### 3.3 Logo Fix

The lion logo must be embedded. Options:
1. **Best:** Convert the logo to base64 PNG and hardcode in `company-info.ts` as `COMPANY.logoBase64`
2. **Alternative:** Host on Supabase Storage and use URL
3. The reference logo is located at: `references/quotes/` (extract from the reference PDF)

---

## PART 4: SETTINGS PAGE UI FIXES

### 4.1 Toggle Switches — VERIFIED OK
**Status:** ✅ Toggle positioning appears correct in current deployment. No fix needed.
Previously reported as "too far right" — confirmed working during live audit 2026-03-23.

### 4.2 Dynamic Tailwind Classes BROKEN
**File:** `src/engines/settings/components/role-management.tsx`
**Lines:** ~803 and ~362
```tsx
// BROKEN:
className={`hover:${colors.activeBg}`}

// FIX:
style={{ '--hover-bg': colors.activeBgHex }}
className="hover:bg-[var(--hover-bg)]"
```

### 4.3 Button Size Inconsistencies

| Location | Current | Should Be |
|----------|---------|-----------|
| Rate card add/cancel | px-2 py-1 text-xs | px-3 py-1.5 text-sm |
| Delete row buttons | px-2 py-1 text-xs | px-3 py-1.5 text-sm |
| Role tab delete | p-1 | p-2 (44px WCAG touch target) |
| Deactivate client | px-3 py-1 text-xs | px-3 py-1.5 text-sm |

### 4.4 Missing Focus Rings
Add to ALL interactive elements:
```
focus:outline-none focus:ring-2 focus:ring-navy/20 focus:ring-offset-1
```

### 4.5 Missing Disabled States
Add to ToggleSwitch, RadioOption, rate card buttons:
```
disabled:opacity-50 disabled:cursor-not-allowed
```

---

## PART 5: IMPLEMENTATION TASKS — PRIORITY ORDER

### PHASE 0: Housekeeping (30 min)
- [ ] Commit CRLF line-ending changes: `git add -A && git commit -m "chore: normalize line endings"`
- [ ] Verify `full-combined-migration.sql` was deployed (39 tables should exist)

### PHASE 1: Fix Broken Engines (2 hrs)
- [ ] **Invoices** — Debug why "Unable to load" despite Supabase being configured. Check table exists, RLS policies, query format
- [ ] **Catalog** — Same debug process
- [ ] **Presentations** — Same debug process
- [ ] **Process** — Same debug process
- [ ] For each: add `console.error(error)` in the hook's error handler to surface the actual Supabase error

### PHASE 2: Fleet Dashboard — Cell Click Actions (3 hrs)
- [ ] **CreateModal onClick handlers** — Wire up all 4 buttons:
  - "New Quote" → `router.push('/quotes/new?asset=${assetId}&startDate=${date}&endDate=${date}')`
  - "New Booking" → Create booking record in Supabase, refresh fleet data
  - "Schedule Service" → `router.push('/maintenance/new?asset=${assetId}')`
  - "Mark In KSA" → Update asset status to 'ksa' in Supabase
- [ ] **"+ New Quote" button in filter bar** → `router.push('/quotes/new')`
- [ ] **Date range selection** — Allow clicking and dragging across cells to select a date range, pass to create modal
- [ ] **Quote form pre-population** — `/quotes/new` route should read URL params and pre-fill asset + dates

### PHASE 3: Fleet Admin CRUD → Supabase (2 hrs)
- [ ] `addCategory()` → `INSERT INTO categories`
- [ ] `removeCat()` → `DELETE FROM categories` (with cascade confirmation)
- [ ] `renameCat()` → `UPDATE categories SET name = $1`
- [ ] `addRow()` → `INSERT INTO assets`
- [ ] `removeRow()` → `DELETE FROM assets`
- [ ] `updateRow()` → `UPDATE assets SET [field] = $1`
- [ ] On success: invalidate TanStack Query cache
- [ ] On failure: revert local state + show error toast

### PHASE 4: Unify Dashboard Stats (1.5 hrs)
- [ ] Create `src/shared/hooks/use-asset-stats.ts` shared hook
- [ ] Both home dashboard AND fleet KPI cards consume this hook
- [ ] Stats derived from: `assets` table joined with `bookings` table (active bookings within date range)
- [ ] Active Projects count: query `projects` table where `status = 'active'`
- [ ] Pending Quotes: query `bookings` where `status = 'quote'`
- [ ] Home dashboard "Active Projects: 0" bug fix — currently queries wrong or empty table

### PHASE 5: Quotes Engine Enhancements (2 hrs)
- [ ] **Fix "Unknown Client"** — Add JOIN to clients table in `fetchQuoteList()` query
- [ ] **Fix "AED 0.00"** — Ensure quote total is calculated from line items on fetch
- [ ] **Add year/month filter** — Date picker or dropdown (Year: 2024/2025/2026, Month: Jan-Dec)
- [ ] **Add search by name or job number** — Already has search bar, verify it searches client name + job number
- [ ] **Fix backwards date range** — Either data fix in DB or display logic to swap if end < start

### PHASE 6: PDF Template Fixes (1 hr)
- [ ] **Embed lion logo** — Extract from reference PDF, convert to base64, add to company-info.ts
- [ ] **Fix company name** — Change to "AL LAITH PROJECTS SEVICES LLC" (match reference branding)
- [ ] **Fix phone number** — Change to "+971 4436360" in company-info.ts
- [ ] **Fix Section Total color** — Change to RED in quote-template.tsx additional requirements footer

### PHASE 7: Cross-Engine Workflow Wiring (3 hrs)
- [ ] **Quote cancel cascade** — Import and call `cascadeQuoteStatus()` when quote cancelled
- [ ] **DN completion → booking status update** — When DN status changes to 'delivered', update linked booking status
- [ ] **RN close → auto-create QC maintenance** — When RN closed, INSERT into maintenance_records
- [ ] **Invoice → Project financials** — Project detail page should fetch and sum linked invoices
- [ ] **Project aggregation** — Query bookings (asset count), quotes (value), invoices (invoiced amount), POs (procurement cost)

### PHASE 8: PDF Upload → Update Entry (2 hrs)
- [ ] Add file upload button to Quotes page (per-row or in quote detail)
- [ ] Use Supabase Storage bucket for PDFs
- [ ] On upload: store file URL in `quotes.pdf_url` column
- [ ] Fleet dashboard: show PDF icon/link when quote has uploaded PDF
- [ ] Watch a local folder (optional / future): Google Drive integration or file watcher

### PHASE 9: Missing Creation Buttons (1 hr)
- [ ] **Delivery Notes** — Add "+ New DN" button, create `/delivery-notes/new` form
- [ ] **Return Notes** — Add "+ New RN" button if not auto-generated only
- [ ] **Purchase Orders** — Add "+ New PO" button
- [ ] **Water Delivery** — Add "+ Schedule Delivery" button
- [ ] **Workshop Stock** — Add "+ Add Item" button
- [ ] Verify Maintenance "+ New Record" and MSRA "+ New MSRA" buttons actually work (open form, save to DB)

### PHASE 10: Settings UI Polish (45 min)
- [x] ~~Fix toggle switch positioning~~ — VERIFIED OK, no fix needed
- [ ] Fix dynamic Tailwind classes (4.2 above)
- [ ] Fix button sizing (4.3 above)
- [ ] Add focus rings (4.4 above)
- [ ] Add disabled states (4.5 above)

### PHASE 11: Build Verification (30 min)
```bash
npm run build          # 0 errors, 0 warnings
npm run type-check     # 0 errors

# Engine isolation test — each engine must be removable
for engine in fleet-dashboard quotes delivery-notes return-notes purchase-orders invoices maintenance water-delivery workshop-stock msra projects catalog presentations process settings; do
  mv "src/engines/$engine" "/tmp/$engine-backup"
  npm run build 2>&1 | grep -E "error|Error|FAIL" | head -3
  mv "/tmp/$engine-backup" "src/engines/$engine"
done
```

---

## PART 6: COMPLETE UI ELEMENT MAP

### Every Button, Card, Stat, and Interactive Element

#### HOME DASHBOARD (`/`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Total Assets: 763 | Stat card | assets table count | YES but different source than fleet |
| On Hire: 28% (216) | Stat card | assets.current_status = 'on_hire' | YES but doesn't match fleet "Booked: 123" |
| Available: 72% (547) | Stat card | assets.current_status = 'available' | YES |
| Under Service: 0 | Stat card | assets.current_status = 'service' | YES (likely correct — no service records) |
| Active Projects: 0 | Stat card | projects.status = 'active' | **BROKEN** — shows 0 but 6 active projects exist |
| Pending Quotes: 1 | Stat card | bookings.status = 'quote' | Inconsistent with fleet "Quoting: 0" |
| "New Quote" quick action | Button | Should → /quotes/new | VERIFY |
| "New Booking" quick action | Button | Should → /fleet with modal | VERIFY |
| "Check Availability" quick action | Button | Should → /fleet | VERIFY |
| Active Projects list | Card | projects table | Shows "No Active Projects" — **BROKEN** |
| Recent Activity | Card | aggregated events | Shows "No Recent Activity" — NOT IMPLEMENTED |
| System Status (15 engines) | Grid | engine health check | Shows green for all — VERIFY these are real checks |

#### FLEET DASHBOARD (`/fleet`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Total: 763 | KPI card | Sum of category counts | YES |
| Available: 547 | KPI card | Rows with no bookings | YES |
| Booked: 123 | KPI card | Rows with booking status | YES |
| Quoting: 0 | KPI card | Rows with quote status | YES but inconsistent with home |
| Util: 28% | KPI card | (total-available)/total | YES |
| Search bar | Input | Client-side filter | VERIFY |
| Category dropdown | Select | Filter by category | VERIFY |
| Status dropdown | Select | Filter by status | VERIFY |
| Time range buttons (30D/60D/90D/6M/1Y/2Y) | Buttons | Calendar date range | VERIFY |
| Today / << / < / > / >> | Nav buttons | Calendar scroll | VERIFY |
| "+ New Quote" button | Button | Should → /quotes/new | **DEAD — NO HANDLER** |
| Category collapse arrows | Buttons | Toggle category rows | VERIFY |
| Calendar cells (per asset per day) | Clickable cells | Opens CreateModal | Modal opens but **ALL 4 BUTTONS ARE DEAD** |
| Color legend (Quote/Booked/KSA/Yard/Issues/Logistics) | Legend | Visual reference | Static — OK |

#### QUOTES (`/quotes`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| "+ New Quote" button | Button | Should → /quotes/new | VERIFY |
| Search bar | Input | Search quotes, clients | VERIFY searches by name AND job number |
| Status dropdown | Select | Filter by status | YES |
| Year/Month filter | **MISSING** | Should filter by date | **NOT IMPLEMENTED** |
| Quote table rows | Clickable? | Should → /quotes/[id] | VERIFY |
| "Download PDF" buttons | Button | Generate PDF via @react-pdf/renderer | VERIFY — does it use correct template? |
| RP-0596 client name | Data | Should show "AMPLIFY EVENTS" | **SHOWS "Unknown Client"** |
| RP-0596 total | Data | Should show actual total | **SHOWS "AED 0.00"** |
| RP-0596 date range | Data | "1 Dec 2024 — 11 Feb 2024" | **BACKWARDS** (end before start) |

#### DELIVERY NOTES (`/delivery-notes`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Search bar | Input | Search DN#, clients, sites | YES (empty list) |
| Status dropdown | Select | Filter by status | YES |
| "+ New DN" button | **MISSING** | Should create new DN | **NOT IMPLEMENTED** |

#### RETURN NOTES (`/return-notes`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Status dropdown | Select | Filter by status | YES |
| "+ New RN" button | **MISSING** | Should create new RN | **NOT IMPLEMENTED** |

#### PURCHASE ORDERS (`/purchase-orders`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Status dropdown | Select | Filter by status | YES |
| "+ New PO" button | **MISSING** | Should create new PO | **NOT IMPLEMENTED** |

#### INVOICES (`/invoices`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| ENTIRE PAGE | Error state | "Unable to load invoices" | **BROKEN** |

#### MAINTENANCE (`/maintenance`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| "+ New Record" button | Button | Should open form | VERIFY |
| Status dropdown | Select | Filter by status | YES |
| Type dropdown | Select | Scheduled/Reactive/QC | YES |

#### WATER DELIVERY (`/water-delivery`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Status dropdown | Select | Filter by status | YES |
| "+ Schedule" button | **MISSING** | Should create delivery | **NOT IMPLEMENTED** |

#### WORKSHOP STOCK (`/workshop-stock`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Category dropdown | Select | Filter by category | YES |
| "+ Add Item" button | **MISSING** | Should add stock item | **NOT IMPLEMENTED** |

#### PROJECTS (`/projects`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Status dropdown | Select | Filter by status | YES |
| Project rows | Table | 8 projects visible | YES |
| Assets column | Data | Should count linked bookings | **ALL SHOW 0** |
| Value column | Data | Should sum quotes/invoices | **ALL SHOW AED 0** |
| Project row click | Clickable? | Should → /projects/[id] | VERIFY |

#### CATALOG (`/catalog`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| ENTIRE PAGE | Error state | "Unable to load catalog" | **BROKEN** |

#### PRESENTATIONS (`/presentations`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| ENTIRE PAGE | Error state | "Unable to load presentations" | **BROKEN** |

#### MSRA (`/msra`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| "+ New MSRA" button | Button | Should open form | VERIFY |
| Status dropdown | Select | Filter by status | YES |

#### PROCESS (`/process`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| ENTIRE PAGE | Error state | "Unable to load process workflows" | **BROKEN** |

#### SETTINGS (`/settings`)
| Element | Type | Connected To | Working? |
|---------|------|-------------|----------|
| Users tab | Tab | User management | YES — 4 users visible |
| Rate Card tab | Tab | Rate card items | VERIFY |
| Clients tab | Tab | Client management | VERIFY |
| Data Import tab | Tab | XLSX import | VERIFY |
| System tab | Tab | Toggle switches | YES but **toggles pushed too far right** |
| Add User button | Button | Should create user | VERIFY |
| Role Permission toggles | Checkboxes | Sidebar visibility per role | VERIFY saves to DB |
| Save Permissions button | Button | Should persist to Supabase | VERIFY |
| Role tab delete buttons | Buttons | Delete custom role | **TOO SMALL (p-1, needs p-2)** |
| Role hover states | CSS | Dynamic Tailwind classes | **BROKEN — hover:${var} doesn't work** |

---

## PART 7: SUMMARY STATISTICS

| Metric | Count |
|--------|-------|
| Total pages | 16 |
| Pages working | 12 |
| Pages broken (error) | 4 (Invoices, Catalog, Presentations, Process) |
| Dead buttons (no handler) | 6+ (fleet create modal ×4, fleet +New Quote, possibly others) |
| Missing creation buttons | 5 (DN, RN, PO, Water Delivery, Workshop Stock) |
| Stats showing wrong data | 3 (Home Active Projects, Home vs Fleet On Hire/Booked mismatch, Project values) |
| Cross-engine connections implemented | 3 of 16 |
| Cross-engine connections missing | 13 of 16 |
| PDF template mismatches | 4 (logo, company name, phone, Section Total color) |
| UI polish items | 5 (toggles, Tailwind classes, button sizes, focus rings, disabled states) |

---

## EXECUTION ORDER

1. Fix 4 broken engines (Invoices, Catalog, Presentations, Process)
2. Wire fleet cell click → create quote/booking/maintenance/KSA (HIGHEST USER PRIORITY)
3. Fix fleet "+ New Quote" button
4. Unify home + fleet dashboard stats
5. Fix quotes page (Unknown Client, AED 0, year/month filter, search)
6. PDF template fixes (logo, company name, phone, Section Total color)
7. Wire cross-engine connections (quote cancel cascade, DN→booking, RN→maintenance, invoice→project)
8. Add missing creation buttons (DN, RN, PO, Water, Workshop)
9. Fleet admin CRUD → Supabase persistence
10. PDF upload feature
11. Project aggregation (assets, value from quotes/invoices)
12. Settings UI polish
13. Build verification + engine isolation test

---

## PART 8: CORRECTIONS FROM LIVE AUDIT (2026-03-23)

These findings correct earlier assumptions made before thorough ref-click testing:

| Item | Previously Reported | Corrected Status |
|------|-------------------|-----------------|
| Dashboard Status tab | "Broken when switching from Revenue" | ✅ WORKS — was a coordinate-click accuracy issue, not a code bug |
| Dashboard Revenue tab | "Non-functional" | ✅ WORKS — shows Total Revenue, Highest Client (AMPLIFY EVENTS MANAGEMENT), Revenue by Month chart, Top 10 Quotes |
| Dashboard Utilization tab | "Non-functional" | ✅ WORKS — shows Overall %, Today %, YoY comparison, all 34 categories with booked/total days |
| Settings toggle positioning | "Too far right" | ✅ OK in current deployment — no fix needed |
| Revenue tab client name | Not previously checked | ✅ Shows "AMPLIFY EVENTS MANAGEMENT" correctly (even though quotes list shows "Unknown Client") |
| Quick Action buttons | "Untested" | ✅ All 3 work (New Quote → /quotes, New Booking → /fleet, Check Availability → /fleet) |
| Project detail tabs | "Untested" | ✅ All 4 tabs render (Documents, Assets, Timeline, Financials) |

**Key insight:** The Revenue tab correctly resolves client names from the clients table, confirming the JOIN logic exists somewhere — the quotes LIST page just isn't using it.

---

## PART 9: CLAUDE CODE EXECUTION INSTRUCTIONS

### How to Use This Plan

This plan is designed to be handed directly to Claude Code. Copy-paste the relevant phase or the entire plan into a Claude Code session with the codebase open.

### Pre-Execution Checklist

```bash
# 1. Read mandatory skill files FIRST
cat .claude/CLAUDE.md
cat .claude/skills/site-services-webapp/SKILL.md

# 2. Verify you're in the right repo
ls src/engines/  # Should show 15 engine directories
ls src/shared/   # Should show engine-registry.ts, company-info.ts, etc.

# 3. Verify clean git state
git status       # Should be clean or only have expected changes
git log --oneline -5  # See recent commits
```

### Execution Rules

1. **Work phase by phase** — Complete each phase fully before moving to the next
2. **Commit after each phase** — One commit per phase with descriptive message
3. **Build check after each phase** — `npm run build` must pass with 0 errors before committing
4. **Type check after each phase** — `npm run type-check` (or `npx tsc --noEmit`) must pass
5. **Never break engine isolation** — If you touch `src/shared/`, verify no engine imports break
6. **Read the SKILL.md rules** — Especially:
   - NO direct PostgreSQL — only Supabase client
   - Input-based integration ONLY — engines don't import each other
   - Google Drive filing via API, not filesystem
   - Email = draft-first, never auto-send
   - `rm -rf src/engines/[any-engine]/ && npm run build` must ALWAYS pass

### Commit Strategy

```bash
# Phase 0
git add -A && git commit -m "chore: normalize line endings and verify migration"

# Phase 1
git add src/engines/invoices/ src/engines/catalog/ src/engines/presentations/ src/engines/process/
git commit -m "fix: resolve broken engine pages (invoices, catalog, presentations, process)"

# Phase 2
git add src/engines/fleet-dashboard/
git commit -m "feat: wire fleet cell click actions (quote, booking, service, KSA)"

# Phase 3
git add src/engines/fleet-dashboard/
git commit -m "feat: persist fleet admin CRUD to Supabase"

# Phase 4
git add src/shared/hooks/ src/engines/fleet-dashboard/ src/app/
git commit -m "fix: unify dashboard stats from single source of truth"

# Phase 5
git add src/engines/quote/
git commit -m "fix: quotes page - client names, totals, year/month filter, search"

# Phase 6
git add src/shared/company-info.ts src/shared/pdf-templates/
git commit -m "fix: PDF template - logo, company name, phone, section total color"

# Phase 7
git add src/shared/ src/engines/
git commit -m "feat: wire cross-engine workflows (cancel cascade, DN→booking, RN→maintenance, project aggregation)"

# Phase 8
git add src/engines/quote/ src/engines/fleet-dashboard/
git commit -m "feat: PDF upload with Supabase Storage"

# Phase 9
git add src/engines/delivery-notes/ src/engines/return-notes/ src/engines/purchase-orders/ src/engines/water-delivery/ src/engines/workshop-stock/ src/engines/maintenance/ src/engines/msra/
git commit -m "feat: add missing creation forms for DN, RN, PO, water, workshop, maintenance, MSRA"

# Phase 10
git add src/engines/settings/
git commit -m "fix: settings UI polish - Tailwind classes, button sizes, focus rings, disabled states"

# Phase 11 (final)
git commit -m "chore: build verification passed — all phases complete"
```

### Post-Implementation Verification

After ALL phases are complete, run this full verification:

```bash
# 1. Clean build
npm run build  # Must be 0 errors, 0 warnings

# 2. Type check
npx tsc --noEmit  # Must be 0 errors

# 3. Engine isolation test (MANDATORY)
for engine in fleet-dashboard quotes delivery-notes return-notes purchase-orders invoices maintenance water-delivery workshop-stock msra projects catalog presentations process settings; do
  echo "Testing removal of: $engine"
  mv "src/engines/$engine" "/tmp/$engine-backup"
  npm run build 2>&1 | grep -cE "error|Error|FAIL"
  mv "/tmp/$engine-backup" "src/engines/$engine"
done
# Every engine removal must result in 0 build errors

# 4. Verify Supabase connectivity
# Open the app locally and check:
# - All 16 pages load without error
# - Fleet dashboard shows 763 assets
# - Quotes show client names (not "Unknown Client")
# - Home dashboard "Active Projects" matches Projects page count
```

### Deploy

```bash
# Push to trigger Vercel auto-deploy
git push origin main

# Verify deployment at:
# https://ss-workshop-stock-app-az9p-calos-projects-df7b646d.vercel.app/
```

---

## PART 10: FINAL SUMMARY

| Metric | Count |
|--------|-------|
| Total implementation phases | 12 (0-11) |
| Estimated total time | ~18 hours |
| Commits expected | 12 |
| Pages to fix (broken) | 4 |
| Dead buttons to wire | 8+ |
| Missing creation forms | 7 |
| Cross-engine connections to implement | 13 |
| PDF template fixes | 4 |
| UI polish items | 4 (toggle already OK) |
| Stats unification queries | 3 |

### Priority Order (USER IMPACT)
1. **Highest:** Fleet cell click → create actions (this is the core workflow)
2. **High:** Fix 4 broken pages, fix quotes Unknown Client / AED 0
3. **Medium:** PDF template pixel-perfect, cross-engine wiring, missing creation forms
4. **Lower:** Stats unification, fleet admin persistence, settings polish
5. **Final:** Build verification, deploy
