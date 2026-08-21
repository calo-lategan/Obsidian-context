# CLAUDE CODE V3 SESSION PROMPT — Site Services App
## Session 10: Documents, Signatures, Admin RBAC, Bug Fixes & Full Feature Polish

---

## BEFORE YOU WRITE ANY CODE

1. **Read the project skill**: `.claude/skills/site-services-webapp/SKILL.md` — this is your bible. 44 DOs, 22 DON'Ts.
2. **Read the project CLAUDE.md**: `.claude/CLAUDE.md` — architecture patterns, engine registry, coding conventions.
3. **Read VERSION-HISTORY.md** — understand what v9.2 already has.
4. **Read PROJECT-TODO.md** — know what's done vs remaining.
5. **Read IMPLEMENTATION-CHECKLIST.md** — the master checklist with phases 0-17.
6. **Run `npm run build` first** — confirm 0 errors before touching anything.
7. **Run tests** — confirm current passing count as baseline.

### THE #1 RULE: CRASH-PROOF MODULARITY
Every change MUST maintain: `rm -rf src/engines/fleet-dashboard/ && npm run build` succeeds.
All cross-engine linking is NON-DESTRUCTIVE. Engines communicate ONLY through the shared database layer. No direct imports between engines. Status cascading uses input-based integration (write a DB record, other engine reads it on its own schedule). If you break this rule, you break everything.

---

## USE 10 PARALLEL AGENTS

Split work across 10 simultaneous agents. Each agent works on an isolated concern. Merge at the end.

### AGENT 1: Signature System (Shared Component)
**Create `src/shared/components/signature-pad.tsx`** — a reusable canvas-based signature capture component.

Requirements:
- HTML5 Canvas drawing with touch + mouse support
- Clear button, Undo last stroke
- Export as base64 PNG (`signatureDataUrl`)
- Responsive — works on mobile/tablet
- Props: `onSave(dataUrl: string)`, `onClear()`, `width`, `height`
- Save signature per user in Supabase `user_signatures` table (user_id, signature_data_url, created_at, updated_at)
- "Use saved signature" toggle — if user has a stored signature, auto-fill it
- Test with admin account: `calo.lategan@allaith.com` / `1234`

This component will be imported by Quotes, DN, RN, PO, and Water Delivery engines independently (each engine imports it directly — no cross-engine dependency).

**Also create `src/shared/components/signature-display.tsx`** — read-only display of a captured signature image. Shows signer name, date, and the signature image.

### AGENT 2: Quote Engine — Draft Save Fix + Signature + Status Cascade
**File: `src/engines/quote/components/quote-form.tsx`**

BUG FIXES:
1. **Save as Draft shows NO visual feedback** — clicking "Save as Draft" does nothing visible. Add:
   - Green checkmark animation next to the button after save
   - Toast notification: "Draft saved successfully"
   - Update the draft banner to show new timestamp
   - Button should briefly show "✓ Saved" then revert to "Save as Draft"
2. **Navigate-away doesn't save on client-side routing** — `beforeunload` only fires on hard navigation, NOT on Next.js router.push(). Add:
   - `next/navigation` `useRouter` event listeners for soft navigation
   - Or use `window.addEventListener('popstate', ...)` + intercept sidebar link clicks
   - Show confirmation modal: "You have unsaved changes. Save as draft before leaving?"
   - Auto-save to localStorage AND show the checkmark
3. **Draft quote should appear in quotes list with "Draft" badge** — currently drafts saved to localStorage don't appear in the quotes table. When "Save as Draft" is clicked and Supabase is connected, persist to the `quotes` table with status='draft'. When offline, keep localStorage fallback.

NEW FEATURES:
4. **Add signature section** to quote detail view (below line items, above notes):
   - "Client Signature" area with SignaturePad component
   - "Authorized By" signature (internal — uses saved admin signature)
   - Signatures required before status can change from 'pending' → 'finalised'
5. **Status cascade** — when a quote status changes, update all linked documents:
   - Quote → Draft: linked DN/RN stay draft
   - Quote → Finalised: auto-generate DN + RN (already works via `auto-generate-documents.ts`)
   - Quote → Cancelled: linked DN/RN set to 'cancelled' (write to DB, other engines read)
   - Implementation: write status_change record to a `document_status_events` table. DN/RN engines read this table. **Do NOT import quote engine code from DN/RN engines.**

### AGENT 3: Quote Engine — Fleet Asset Picker Fix
**File: `src/engines/quote/components/asset-picker.tsx`**

BUG: The "Add Fleet Asset" modal shows **8 hardcoded sample assets** (CAB-001, TOI-001, etc.) instead of the **610 real fleet assets** from the Fleet Dashboard (4DR.ABL.16.1, ABL.F.20.2, etc.).

FIX:
1. The asset picker already has Supabase query code (lines 325-337) but falls back to `SAMPLE_ASSETS` when DB isn't configured. The sample data is wrong — it uses generic IDs (CAB-001) instead of matching the fleet dashboard's plant numbers.
2. **Update SAMPLE_ASSETS** to use the EXACT same plant number format, categories, and descriptions as the fleet dashboard's sample data (from `src/engines/fleet-dashboard/lib/sample-data.ts`).
3. **Create a shared data layer**: `src/shared/hooks/use-fleet-assets.ts` — a hook that fetches assets + bookings from Supabase (or returns sample data matching fleet dashboard). Both the fleet dashboard AND the asset picker import this shared hook. This is NOT cross-engine coupling — it's a shared utility in `src/shared/`.
4. Categories in the picker dropdown must match fleet dashboard categories EXACTLY: Mixed Ablution, Female Ablution, Male Ablution, Toilet Trailer, Pod Ablution, CPO Cabin, DRS, FlexiLoo Pump, FlexiLoo Toilet, Mess, Chemical Toilet, Storage, Water Tank, etc.
5. Show plant number prominently (e.g., `4DR.ABL.16.1`) with description and availability status.

### AGENT 4: Admin Settings — Signup Approval + Role Management
**File: `src/engines/settings/components/admin-settings.tsx`**

BUG FIXES:
1. **Deny doesn't remove the entry** — clicking Deny on sample data does nothing (buttons are disabled when Supabase not configured). Fix: make approve/deny work on sample data too (remove from local state array on click, show toast feedback). When Supabase IS connected, the existing DB handlers should work but also must optimistically update the UI.
2. **Approve doesn't add to User Management table** — the approve handler creates a DB record but the User Management section doesn't refresh. Fix: after successful approve, add the new user to the local users array and re-render the table.

NEW FEATURES:
3. **Role editing** — each user row needs:
   - Click-to-edit Role dropdown (Administrator/Manager/Supervisor/Operator)
   - Click-to-edit Status toggle (Active/Inactive/Suspended)
   - Save button per row (or auto-save on change)
   - Confirmation dialog before role change: "Change [name]'s role from [old] to [new]?"
4. **Custom role creation** — button to add new roles:
   - Role name, description
   - Per-engine permissions matrix: for each of the 13 engines, toggle: View / Edit / Admin / None
   - Store in `roles` table with `role_permissions` JSON column
5. **Remove "Enable Admin Mode" button** from the bottom-left of EVERY page. It's on the sidebar (ref_16 in accessibility tree). The admin account login replaces this. Delete or hide the component entirely.
6. **"Add User" button** — currently disabled. Make it open a form: Name, Email, Role dropdown, send invite (or create directly for now since no email service yet).

### AGENT 5: Delivery Notes — Edit Mode + Sign-Off + Check-Off
**File: `src/engines/delivery-notes/components/dn-detail.tsx`**

Currently 100% read-only. Add:

1. **Edit mode toggle** — "Edit" button (visible for draft/issued status only). Switches to editable form:
   - Edit delivery date, site address, driver, vehicle
   - Edit line item quantities, conditions
   - Save changes to DB
2. **Sign-off capability**:
   - "Yard Checker Sign-Off" — uses SignaturePad component, captures name + signature
   - "Client Receiver Sign-Off" — same
   - Both signatures stored in `dn_signatures` table via the existing DNSignature interface
   - After both signatures: status auto-advances to 'signed'
3. **Line item check-off**:
   - Each item gets a checkbox: "Delivered ✓"
   - Condition dropdown per item: Good / Damaged / Missing
   - Notes field per item
   - Progress indicator: "8/12 items checked"
4. **Status transitions**: Draft → Issued → In Transit → Delivered → Signed
   - Each transition requires confirmation
   - 'Signed' requires both signatures

### AGENT 6: Return Notes — Edit Mode + Sign-Off + Inspection
**File: `src/engines/return-notes/components/rn-detail.tsx`**

Currently 100% read-only. Add:

1. **Edit mode** — same pattern as DN:
   - Edit return date, quantities returned, conditions
   - Compare delivered qty vs returned qty with visual diff
2. **Sign-off**:
   - "Client Return Sign-Off" with SignaturePad
   - "Yard Inspector Sign-Off" with SignaturePad
3. **Inspection check-off per item**:
   - Returned qty input (vs original delivered qty)
   - Condition at return: Good / Damaged / Missing / Partial
   - Shortage flag auto-calculated: if returned < delivered
   - Photo upload placeholder (show upload button, store count)
   - Inspector notes per item
4. **Reconciliation dashboard**:
   - Summary: X items returned, Y shortages, Z damaged
   - Highlight mismatches between client-reported and yard-inspected conditions
   - Status: Draft → Issued → Returned → Inspected → Closed

### AGENT 7: Water Delivery — Sign-Off + Edit
**File: `src/engines/water-delivery/components/`**

Add:
1. **Edit mode** for draft/scheduled deliveries (quantity, site, driver, date)
2. **Driver sign-off** with SignaturePad on departure
3. **Client sign-off** with SignaturePad on delivery
4. **Quantity verification** — client confirms litres received matches litres dispatched
5. **Status transitions**: Scheduled → In Transit → Delivered → Signed → Closed

### AGENT 8: Document PDF Templates (Empty Templates)
**Install `@react-pdf/renderer`** (`npm install @react-pdf/renderer`)

Create **empty template components** for each document type. These are pixel-perfect PDF layouts matching Al Laith's branding. Create them in `src/shared/pdf-templates/`:

1. **`quote-template.tsx`** — Quote PDF
   - Al Laith logo top-left, "QUOTATION" header
   - Company info block from `src/shared/company-info.ts`
   - Quote #, revision, date, client details, job number
   - Line items table: Description, Category, Qty, Rate Type, Unit Rate, Periods, Mob/Demob, Total
   - Subtotal, VAT, Grand Total
   - Terms & Conditions section
   - Signature lines (Authorized By + Client Acceptance)
   - Page numbers

2. **`delivery-note-template.tsx`** — DN PDF
   - Header: ALPS/SSDO format number
   - From/To addresses
   - Line items: Plant No, Description, Qty, Condition at Loading
   - Signature blocks: Yard Checker, Driver, Client Receiver
   - Date/time fields

3. **`return-note-template.tsx`** — RN PDF
   - Header: linked DN reference
   - Items returned table with condition comparison
   - Shortage summary
   - Signature blocks: Client, Yard Inspector

4. **`invoice-template.tsx`** — Invoice PDF
   - Company info + TRN number
   - Invoice #, date, payment terms
   - Line items from finalised quote
   - Subtotal, VAT (5%), Grand Total
   - Bank details (from company-info.ts)

5. **`purchase-order-template.tsx`** — PO PDF
   - Client's PO number, our quote reference
   - Line items, delivery schedule
   - Terms, signatures

Each template must:
- Export a `generatePDF(data)` function that returns a blob
- Export a `<PDFPreview data={...} />` React component for in-app preview
- Use `src/shared/company-info.ts` for all company details
- Include the Al Laith logo from `public/assets/al-laith-logo.png`
- Be a standalone module — no cross-engine imports

### AGENT 9: Google Drive Integration (Stub + Ready)
**Create `src/shared/drive/`** directory:

1. **`drive-client.ts`** — Google Drive API wrapper (stubbed)
   - `uploadDocument(file, folderId)` → returns Drive file ID
   - `createFolder(name, parentId)` → returns folder ID
   - `getFileUrl(fileId)` → returns shareable URL
   - `listFiles(folderId)` → returns file metadata array
   - All functions check for Drive credentials, return graceful fallback when not configured

2. **`drive-filing.ts`** — Auto-filing logic per SKILL.md DO #7:
   - Quote PDFs → `Quotes / [Year] / [Client] / [Quote#]`
   - DN PDFs → `Delivery Notes / [Year] / [DN#]`
   - RN PDFs → `Return Notes / [Year] / [RN#]`
   - Invoice PDFs → `Invoices / [Year] / [Client]`

3. **`drive-ingest.ts`** — Document ingestion (for when Drive API is available Monday):
   - Watch a Drive folder for new files
   - Parse filename conventions to extract: document type, number, client, date
   - Create/update records in Supabase with file metadata
   - Display ingested documents in the relevant engine with all stats, info, names
   - Stub the watcher, implement the parser and DB writer

4. **Settings → System tab**: Add Drive configuration section:
   - Drive folder ID input
   - "Test Connection" button
   - Filing structure preview

### AGENT 10: Presentation + Catalog Templates + Cross-Engine Polish
**Presentations Engine** (`src/engines/presentations/`):
1. Create a **presentation template system**:
   - Template interface: `{ sections: [{ type: 'hero' | 'header' | 'content' | 'image' | 'specs', title, description, imageUrl }] }`
   - Dynamic text injection: title, client name, project name, descriptions, specs
   - Hero image placeholder, header image placeholder
   - For now: generate an HTML-based preview that can be exported
   - Template stub ready for colleague's PPTX templates later

**Catalog Engine** (`src/engines/catalog/`):
1. Add **Download PDF** button — generates catalog PDF using the catalog data
2. Add **Email** button — opens email draft with catalog PDF attached (stub Gmail integration)
3. Catalog is a static template — one-time generation, no per-client customization

**Cross-Engine Polish** (check ALL engines):
1. Remove "Enable Admin Mode" button from sidebar across ALL pages
2. Verify every clickable element actually does something or shows appropriate "coming soon" feedback
3. Ensure all sample data is consistent across engines (same client names, project names, dates)
4. Test every filter dropdown, search box, and status badge
5. Ensure all tables are sortable by clicking column headers
6. Verify responsive layout on mobile viewport

---

## DOCUMENT STATUS SYNC RULES (NON-DESTRUCTIVE)

When implementing status cascading between documents, follow this pattern:

```
QUOTE changes status → writes to `document_status_events` table:
  { source_type: 'quote', source_id: 'xxx', new_status: 'finalised', timestamp }

DN engine reads `document_status_events` on load → updates own status if linked
RN engine reads `document_status_events` on load → updates own status if linked
```

**This is input-based integration (DO #4).** The quote engine NEVER imports DN/RN code. It writes a record. DN/RN read on their own schedule.

Status mapping:
| Quote Status | DN Status | RN Status | PO Status |
|---|---|---|---|
| Draft | Draft | Draft | — |
| Pending Review | Draft | Draft | — |
| Finalised | Auto-created as Draft | Auto-created as Draft | Awaiting client PO |
| Cancelled | Cancelled | Cancelled | Cancelled |

---

## ROLE-BASED ACCESS MATRIX

| Feature | Admin | Manager | Supervisor | Operator |
|---|---|---|---|---|
| View all engines | ✅ | ✅ | ✅ | ✅ |
| Create quotes | ✅ | ✅ | ❌ | ❌ |
| Finalise quotes | ✅ | ✅ | ❌ | ❌ |
| Sign documents | ✅ | ✅ | ✅ | ❌ |
| Approve signups | ✅ | ❌ | ❌ | ❌ |
| Manage roles | ✅ | ❌ | ❌ | ❌ |
| Admin Settings | ✅ | View only | ❌ | ❌ |
| Edit fleet data | ✅ | ✅ | ✅ | ❌ |
| Water delivery sign-off | ✅ | ✅ | ✅ | ✅ |
| DN/RN check-off | ✅ | ✅ | ✅ | ❌ |

Store this in `src/shared/auth/role-permissions.ts` as a typed constant. Each engine's components check permissions before rendering edit/action buttons.

---

## EXECUTION ORDER

1. **Agent 1 first** (Signature component) — other agents depend on it
2. **Agents 2-7 in parallel** after Agent 1 completes — these are all independent engine work
3. **Agent 8** can run in parallel with 2-7 (PDF templates are standalone)
4. **Agent 9** can run in parallel (Drive stubs are standalone)
5. **Agent 10 last** — cross-engine polish after all other agents complete

---

## VERIFICATION CHECKLIST (RUN AFTER ALL AGENTS COMPLETE)

```bash
# 1. Build must pass
npm run build

# 2. Deletion test — MUST STILL WORK
rm -rf src/engines/fleet-dashboard/
npm run build  # Must succeed
git checkout src/engines/fleet-dashboard/  # Restore

# 3. No cross-engine imports
grep -r "from.*engines/" src/engines/ --include="*.ts" --include="*.tsx" | grep -v "from.*engines/\($(basename $PWD)\)" | head -20
# Should return ZERO results (no engine imports another engine)

# 4. All tests pass
npm test

# 5. Check bundle size
# / route should be < 120kB
```

---

## COMPANY INFORMATION (from company-info.ts)
- **Company**: Al Laith Projects Services L.L.C
- **Address**: P.O. Box 47028, Dubai, UAE
- **TRN**: 100452133700003
- **VAT Rate**: 5%
- **Bank**: Emirates NBD
- **Admin Account**: calo.lategan@allaith.com / 1234

## TECH STACK
- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth)
- TanStack Query + Zustand
- @react-pdf/renderer (install as part of this session)
- Deployed on Vercel

## DOCUMENT NUMBERING
| Type | Format | Example |
|---|---|---|
| Quote | RP-XXXX | RP-0596 |
| DN | ALPS/SSDO/XXXX/YYYY | ALPS/SSDO/0138/2026 |
| RN | RN-XXXX | RN-0038 |
| Invoice | INV-XXXX/YYYY | INV-0001/2026 |
| PO | Client-specific | AMP-PO-2026-0034 |
