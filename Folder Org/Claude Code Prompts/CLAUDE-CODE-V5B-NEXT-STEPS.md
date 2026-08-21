# V5B — NEXT STEPS & UI FIXES

## Context
Claude Code already completed V5 Phase 1–4 in commit `b4bd760`. It's currently doing further work (removing sample data, wiring live Supabase). This prompt covers what's STILL MISSING and what needs fixing.

**Read these first (as always):**
```
.claude/CLAUDE.md
.claude/skills/site-services-webapp/SKILL.md
```

---

## 1. COMMIT HOUSEKEEPING

The working tree has ~96 files showing as changed due to CRLF line-ending normalization. Before doing anything else:

```bash
# Check if there are REAL code changes mixed in:
git diff --ignore-all-space --stat HEAD

# If the above shows 0 files: the changes are whitespace-only. Commit them:
git add -A && git commit -m "chore: normalize line endings (LF → CRLF)"

# If the above shows actual changes: commit code changes first, then normalize:
git add -A && git commit -m "feat: [describe actual changes]"
```

---

## 2. FLEET DASHBOARD — REMAINING GAPS

### 2.1 Admin CRUD Must Persist to Supabase
`src/engines/fleet-dashboard/hooks/use-admin-mode.ts` currently modifies LOCAL Zustand state only. Every admin operation must write to the database:

```
addCategory()   → INSERT INTO categories
removeCat()     → DELETE FROM categories (with cascade confirmation)
renameCat()     → UPDATE categories SET name = $1
addRow()        → INSERT INTO assets
removeRow()     → DELETE FROM assets
updateRow()     → UPDATE assets SET [field] = $1
```

Use the Supabase client from `src/lib/supabase/client.ts`. On success, invalidate TanStack Query cache. On failure, revert local state and show error toast.

### 2.2 XLSX Import Button
Add to fleet dashboard toolbar (admin-only):
- "Import from Spreadsheet" button
- Accepts .xlsx, parses with SheetJS (already in dependencies as `xlsx@^0.18.5`)
- Maps columns: CATEGORY → categories.name, PLANT NO → assets.plant_number, etc.
- Upserts to Supabase (ON CONFLICT DO NOTHING)
- Shows summary modal: "Added X categories, Y assets, Z updated"

### 2.3 Live Data Mode
Now that sample data fallback is being removed, ensure `use-fleet-data.ts` correctly:
- Queries `categories` table (ordered by display_order)
- Queries `assets` table (joined with bookings for status)
- Shows loading skeleton during fetch
- Shows error state with retry on failure
- Does NOT fall back to sample data in production (only in demo mode when Supabase is unconfigured)

---

## 3. ADMIN SETTINGS — UI FIXES

### 3.1 Toggle Switches Pushed Too Far Right
**File:** `src/engines/settings/components/system-tab.tsx`
**Problem:** Toggle containers use `flex items-start justify-between gap-4` which pushes the toggle to the far right edge, visually disconnecting it from its label.

**Fix:** Replace `justify-between` with a max-width constraint:
```tsx
// BEFORE (bad):
<div className="flex items-start justify-between gap-4">
  <div>{label + description}</div>
  <ToggleSwitch />
</div>

// AFTER (good):
<div className="flex items-start gap-4">
  <div className="flex-1">{label + description}</div>
  <ToggleSwitch />
</div>
```

This keeps the toggle next to the label text instead of flung to the far right.

Apply the same fix to ALL toggle rows in system-tab.tsx (lines ~260-750).

### 3.2 Dynamic Tailwind Classes NOT Working
**File:** `src/engines/settings/components/role-management.tsx`
**Problem:** Lines ~803 use `hover:${colors.activeBg}` — Tailwind does NOT support dynamic class interpolation. These hover styles are silently broken.

**Fix:** Use a style object or pre-define all possible classes in a safelist:
```tsx
// BEFORE (broken):
className={`hover:${colors.activeBg}`}

// AFTER (works):
style={{ '--hover-bg': colors.activeBgHex }}
className="hover:bg-[var(--hover-bg)]"

// OR use inline conditional:
className={cn(
  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
  isActive ? activeClasses : inactiveClasses
)}
```

Same issue at line ~362 (color picker buttons).

### 3.3 Button Consistency Audit
Multiple button size inconsistencies found:

| Location | Current Size | Should Be |
|---|---|---|
| Rate card add/cancel (line ~391) | px-2 py-1 text-xs | px-3 py-1.5 text-sm |
| Delete row buttons | px-2 py-1 text-xs | px-3 py-1.5 text-sm (min 44px touch target) |
| Role tab delete (line ~817) | p-1 | p-2 (WCAG min touch target) |
| Deactivate client (line ~685) | px-3 py-1 text-xs | px-3 py-1.5 text-sm |

**Standard button sizes (enforce these):**
- Primary: `px-4 py-2 text-sm font-medium` (all main actions)
- Small: `px-3 py-1.5 text-sm font-medium` (inline/table actions)
- Icon-only: `p-2` minimum (44px touch target)

### 3.4 Missing Focus Rings
Tab navigation buttons, role tabs, and inline edit inputs all lack focus rings. Add:
```
focus:outline-none focus:ring-2 focus:ring-navy/20 focus:ring-offset-1
```
to every interactive element.

### 3.5 Missing Disabled States
These buttons have `disabled` attribute but no visual feedback:
- ToggleSwitch component (system-tab.tsx line ~172)
- RadioOption component (system-tab.tsx line ~218)
- Rate card row action buttons

Add `disabled:opacity-50 disabled:cursor-not-allowed` to all.

---

## 4. LIVE DATA WIRING — ALL ENGINES

Now that demo mode is being removed, every engine hook must:

1. **Query Supabase first** (not sample data)
2. **Show loading state** while fetching
3. **Show error state** on failure (with retry button)
4. **Only fall back to sample data** when `isSupabaseConfigured === false` (env vars missing)

**Engines to verify are hitting real tables:**

| Engine | Hook File | Supabase Table |
|---|---|---|
| Fleet Dashboard | use-fleet-data.ts | categories, assets, bookings |
| Quotes | use-quotes.ts | quotes, quote_line_items |
| Delivery Notes | use-delivery-notes.ts | delivery_notes, dn_line_items |
| Return Notes | use-return-notes.ts | return_notes, rn_line_items |
| Purchase Orders | use-purchase-orders.ts | purchase_orders, po_line_items |
| Invoices | use-invoices.ts | invoices, invoice_line_items |
| Maintenance | use-maintenance.ts | maintenance_records, maintenance_parts |
| Water Delivery | use-water-deliveries.ts | water_deliveries |
| Workshop Stock | use-workshop-stock.ts | workshop_stock_items, workshop_stock_movements |
| MSRA | use-msra.ts | msra_documents, msra_risk_items, msra_control_measures |
| Projects | use-projects.ts | projects, bookings, documents |
| Settings | admin-settings.tsx | users, signup_requests, workflow_config, sidebar_visibility, clients, rate_card_items |

---

## 5. CROSS-ENGINE WORKFLOW TESTING

After live data wiring, test end-to-end:

1. **Create a quote** with 2+ line items → verify saved in `quotes` table
2. **Finalise quote** → verify:
   - Bookings created in `bookings` table
   - Fleet dashboard shows assets as BOOKED
   - DN auto-generated (if workflow config enabled)
   - RN auto-generated (if workflow config enabled)
3. **Open the auto-generated DN** → verify line items match quote
4. **Complete DN workflow** → yard check → transit → deliver → confirm
5. **Open the auto-generated RN** → complete return → inspect → close
6. **Verify QC maintenance record** created on RN close
7. **Create invoice** linked to quote → verify financial totals in Projects engine

---

## 6. PDF PIXEL-PERFECT VERIFICATION

Templates were rewritten in V5. Now verify visually:

1. Generate a quote PDF → compare side-by-side with `references/quotes/AMPLIFY-EVENTS-GOLF-BUGGY-RP0596-Quote.pdf`
2. Generate a DN PDF → compare with `references/delivery-notes/J60571-PGA-DELIVERY-NOTE.pdf`
3. Generate a RN PDF → compare with `references/return-notes/J60571-PGA-GROUP-RETURN-NOTE.pdf`
4. Generate an invoice PDF → compare with `references/invoices/J60564-ALPS-EVENTS-F1-ABLUTION-INV.pdf`

Check: column count, column labels, column widths, header colors, signature section layout, terms text, company info positioning, font sizes.

---

## 7. BUILD VERIFICATION

```bash
npm run build          # 0 errors, 0 warnings
npm run type-check     # 0 errors
npm run test           # All passing

# Deletion test
for engine in fleet-dashboard quotes delivery-notes return-notes purchase-orders invoices maintenance water-delivery workshop-stock msra projects catalog presentations process settings; do
  mv "src/engines/$engine" "/tmp/$engine-backup"
  npm run build 2>&1 | grep -E "error|Error|FAIL" | head -3
  mv "/tmp/$engine-backup" "src/engines/$engine"
done
```

---

## PRIORITY ORDER

1. Commit line-ending changes (housekeeping)
2. Fix toggle switch positioning (quick win, user-reported)
3. Fix dynamic Tailwind classes (broken hover states)
4. Wire fleet admin CRUD to Supabase
5. Verify all engine hooks hit real tables (not sample data)
6. Test cross-engine workflows end-to-end
7. Visual PDF verification
8. Build + deletion test
9. Button consistency + focus rings + disabled states (polish)
