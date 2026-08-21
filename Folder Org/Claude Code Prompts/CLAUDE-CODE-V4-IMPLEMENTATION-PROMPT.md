# AL LAITH SITE SERVICES — V4 IMPLEMENTATION PROMPT

## Claude Code CLI — Multi-Agent Advanced Implementation

**App:** Al Laith Site Services Web Application (v9.2 → v10.0)
**Repo:** `/path/to/site-services-app/`
**Live URL:** `https://ss-workshop-stock-app-az9p-git-main-calos-projects-df7b646d.vercel.app/`
**Admin Account:** `calo.lategan@allaith.com` / `1234`
**Tech Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth + RLS + Realtime) + TanStack Query + Zustand + Vercel

---

## MANDATORY SKILLS & PLUGINS

Before writing ANY code, load these skills:
- `site-services-webapp` — Architecture rules, DOs/DON'Ts, engine isolation
- `onstart-onthinking` — Cognitive OS for reasoning quality

---

## THE #1 RULE — CRASH-PROOF MODULARITY

```bash
# This MUST pass after EVERY change:
rm -rf src/engines/[any-engine]/ && npm run build
```

**Every engine is deletable.** No cross-engine imports. Communication is INPUT-BASED ONLY — engines read/write shared Supabase tables independently. The engine-registry (`src/shared/engine-registry.ts`) is metadata-only — no code imports.

---

## PHASE 0: AUDIT, PLAN & UPDATE PROJECT DOCS (MANDATORY FIRST)

### Agent 0 — Planning & Documentation Audit

```
BEFORE writing a single line of code, complete ALL of the following:

1. READ ALL PROJECT DOCUMENTS
   - Read IMPLEMENTATION-CHECKLIST.md, PROJECT-TODO.md, VERSION-HISTORY.md, README.md
   - Read src/shared/engine-registry.ts (14 engines, all metadata)
   - Read src/shared/auth/role-permissions.ts (RBAC matrix)
   - Read src/shared/document-workflow/auto-generate-documents.ts
   - Read src/shared/document-workflow/status-events.ts
   - Read src/shared/company-info.ts
   - Read src/middleware.ts
   - Read supabase/migrations/*.sql (all 11 migration files)
   - Read the site-services-webapp skill SKILL.md

2. AUDIT EVERY ENGINE
   For each of the 14 engines, read every file and document:
   - What works (list features that function correctly)
   - What's broken (list bugs with exact file + line references)
   - What's missing (list features that don't exist yet)
   - What's placeholder (list things that show sample/fake data)

3. UPDATE PROJECT DOCUMENTS
   Based on audit findings, update:
   - PROJECT-TODO.md — full task list organized by engine
   - IMPLEMENTATION-CHECKLIST.md — mark completed items, add new items
   - VERSION-HISTORY.md — document what v9.2 accomplished and what v10.0 will do

4. CREATE IMPLEMENTATION PLAN
   Write a detailed plan covering:
   - Execution order (what depends on what)
   - Database migrations needed (new tables, columns, constraints)
   - Shared utilities needed (what goes in src/shared/)
   - Per-engine changes (isolated, deletable)
   - Risk assessment (what could break)

5. VERIFY MODULARITY
   Run: npm run build
   Run: rm -rf src/engines/fleet-dashboard/ && npm run build (must pass)
   Restore: git checkout src/engines/fleet-dashboard/

ONLY after Phase 0 is complete, proceed to implementation phases.
```

---

## PHASE 1: DATABASE FOUNDATION (Must complete before all other phases)

### Agent 1 — Supabase Migration: Schema Completion

```
OBJECTIVE: Create migration 012_v10_schema.sql adding all missing tables and columns.

NEW TABLES NEEDED:

1. invoices
   - id UUID PK
   - invoice_number TEXT UNIQUE (INV-YYYY-NNNN)
   - quote_id FK → quotes
   - po_id FK → purchase_orders (nullable)
   - project_id FK → projects (nullable)
   - client_id FK → clients (nullable)
   - status TEXT ('draft','issued','sent','paid','overdue','cancelled')
   - currency TEXT ('AED','SAR','USD')
   - subtotal DECIMAL, vat_total DECIMAL, total DECIMAL
   - issued_date DATE, due_date DATE, paid_date DATE
   - created_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
   - FORCE ROW LEVEL SECURITY

2. invoice_line_items
   - id UUID PK
   - invoice_id FK → invoices
   - description TEXT, category TEXT
   - quantity INT (>0), unit_rate DECIMAL (>=0)
   - rate_period TEXT, rate_periods INT, mob_demob_fee DECIMAL
   - line_total DECIMAL
   - asset_id TEXT (nullable)

3. clients
   - id UUID PK
   - name TEXT, contact_person TEXT, email TEXT, phone TEXT
   - address TEXT, trn TEXT (Tax Registration Number)
   - payment_terms INT (days, default 30)
   - currency TEXT DEFAULT 'AED'
   - status TEXT ('active','inactive')
   - created_at, updated_at

4. rate_cards
   - id UUID PK
   - name TEXT (e.g. 'Standard 2026', 'EXPO Special')
   - client_id FK → clients (nullable, for client-specific overrides)
   - is_default BOOLEAN DEFAULT false
   - status TEXT ('active','archived')
   - created_at, updated_at

5. rate_card_items
   - id UUID PK
   - rate_card_id FK → rate_cards
   - category TEXT, description TEXT
   - unit_rate DECIMAL, rate_period TEXT ('daily','weekly','monthly')
   - mob_demob_fee DECIMAL DEFAULT 0
   - currency TEXT DEFAULT 'AED'

6. workflow_config
   - id UUID PK
   - key TEXT UNIQUE
   - value JSONB
   - description TEXT
   - updated_by UUID, updated_at TIMESTAMPTZ
   Keys to seed:
   - 'document_generation_trigger': { dn_on: 'quote_finalised' | 'logistics_in', rn_on: 'quote_finalised' | 'logistics_out' }
   - 'auto_generate_po': boolean
   - 'auto_generate_invoice': boolean
   - 'require_msra_before_delivery': boolean
   - 'require_dual_verification': boolean
   - 'document_generation_stages': { quotes: true, po: false, invoice: false }

7. user_signatures (if not already created)
   - id UUID PK
   - user_id FK → auth.users UNIQUE
   - signature_data TEXT (base64 PNG)
   - created_at, updated_at

8. sidebar_visibility (role-based page visibility)
   - id UUID PK
   - role TEXT
   - engine_id TEXT (references engine-registry IDs)
   - visible BOOLEAN DEFAULT true
   - can_access BOOLEAN DEFAULT true

COLUMN ADDITIONS TO EXISTING TABLES:

- quotes: ADD client_id FK → clients (nullable)
- quotes: ADD invoice_id FK → invoices (nullable)
- purchase_orders: ADD quote_id FK → quotes, ADD invoice_id FK → invoices
- delivery_notes: ADD return_note_id FK → return_notes (bidirectional link)
- return_notes: ADD delivery_note_id FK → delivery_notes
- return_notes: ADD generated_by TEXT ('auto_quote_finalise','auto_logistics_out','manual')
- delivery_notes: ADD generated_by TEXT ('auto_quote_finalise','auto_logistics_in','manual')
- projects: ADD total_quote_value DECIMAL, ADD total_invoiced DECIMAL, ADD total_po_value DECIMAL
- app_users: ADD signature_id FK → user_signatures (nullable)

RLS POLICIES:
- FORCE ROW LEVEL SECURITY on ALL new tables
- authenticated users: SELECT on all, INSERT/UPDATE based on role
- admin: full access to workflow_config, sidebar_visibility
- anon: no access to any new tables

SEED DATA:
- Insert default workflow_config rows
- Insert default sidebar_visibility for all 4 roles × 14 engines
- Insert default rate_card with standard Al Laith rates
```

---

## PHASE 2: CORE SHARED UTILITIES (Parallel batch)

### Agent 2 — Document Generation Workflow Engine Rewrite

```
OBJECTIVE: Rewrite src/shared/document-workflow/ to support configurable generation triggers.

CURRENT STATE:
- autoGenerateDocuments() creates DN + RN on quote finalise (always)
- No PO or Invoice generation
- No configurable triggers
- Status events exist but aren't consumed

NEW BEHAVIOR:

1. READ WORKFLOW CONFIG from Supabase workflow_config table
   - Determine WHEN to generate each document type
   - Default: DN + RN on quote finalisation, PO on quote finalisation, Invoice on quote finalisation

2. GENERATION TRIGGERS (configurable via Admin Settings):

   Option A — "On Quote Finalisation" (default):
   Quote finalised → generate DN + RN + PO + Invoice (all draft status)

   Option B — "On Logistics Date":
   DN generated on logistics_in date (startDate - logistics_in_days)
   RN generated on logistics_out date (endDate + logistics_out_days)
   PO + Invoice still on quote finalisation

3. DOCUMENT GENERATION RULES:
   - DN: One per quote. Contains ALL line items from the quote.
   - RN: One per DN (mirrors DN line items). Links back to DN via delivery_note_id.
   - PO: One per quote. Auto-numbered PO-YYYY-NNNN.
   - Invoice: One per quote. Auto-numbered INV-YYYY-NNNN.
   - If DN/RN for a quote already exist, do NOT create duplicates.
   - If user manually created an RN for specific items, don't auto-generate another for those items.

4. ADDENDUM HANDLING (adding items to finalised quote):
   When items are added to a FINALISED quote:
   - Create a NEW quote (revision) with ONLY the new items
   - Auto-number: original Q-2026-0042 → Q-2026-0042-R1
   - Generate a NEW DN for the new items only
   - Generate a NEW RN for the new items only
   - Original quote + its DN/RN remain unchanged
   - Link revision to parent via parent_quote_id

5. STATUS CASCADING:
   When quote status changes, cascade to linked documents:
   - Quote 'draft' → all linked docs stay 'draft'
   - Quote 'finalised' → DN/RN become 'issued', PO becomes 'pending', Invoice becomes 'draft'
   - Quote 'cancelled' → all linked docs become 'cancelled'
   DO NOT cascade backwards (DN status never changes quote status).

   Implementation: Write to document_status_events table.
   Each engine reads events independently (input-based integration).

6. RETURN NOTE SPECIAL LOGIC:
   - RN can be manually created by selecting a DN and generating a copy
   - If user creates RN manually for DN items → mark those items as "return_note_issued"
   - If auto-generation date arrives and RN already exists → skip
   - If auto-generation date arrives and NO RN exists → auto-generate + flag as overdue/not-done
   - RN must show which items have been returned and which haven't

7. PROJECT DOCUMENT AUTO-FILING:
   When any document is created (DN, RN, PO, Invoice):
   - If quote has project_id → insert record into documents table with project_id
   - Document type, number, status, and link stored
   - Projects engine reads documents table independently

8. FINANCIAL AGGREGATION:
   When documents are created/updated:
   - Update projects.total_quote_value = SUM(quotes.total WHERE project_id = X)
   - Update projects.total_po_value = SUM(purchase_orders.value WHERE project_id = X)
   - Update projects.total_invoiced = SUM(invoices.total WHERE project_id = X AND status IN ('issued','paid'))
   Use database triggers or compute on read (preferred for modularity).

FILE: src/shared/document-workflow/auto-generate-documents.ts (rewrite)
FILE: src/shared/document-workflow/status-cascade.ts (new)
FILE: src/shared/document-workflow/workflow-config.ts (new — reads workflow_config table)
FILE: src/shared/document-workflow/addendum-handler.ts (new)
```

### Agent 3 — RBAC & Sidebar Visibility System

```
OBJECTIVE: Make sidebar navigation role-aware and build full RBAC management UI.

CURRENT STATE:
- role-permissions.ts has complete 4-role × 14-engine permission matrix
- Sidebar shows ALL engines to ALL users (no filtering)
- No UI to edit role permissions or sidebar visibility

IMPLEMENT:

1. SIDEBAR ROLE FILTERING (src/app/components/sidebar.tsx):
   - On mount, read sidebar_visibility table for current user's role
   - Filter ENGINE_REGISTRY entries: only show engines where visible=true
   - If can_access=false but visible=true → show greyed out with lock icon
   - If visible=false → hide completely from sidebar
   - Admin always sees everything

2. PERMISSION CHECK ENFORCEMENT:
   - Every engine page component must check hasPermission() on mount
   - If no access → redirect to /dashboard with toast "Access denied"
   - If view-only → hide edit/create/delete buttons
   - If can sign → show signature capture UI
   - Already partially implemented via role-permissions.ts — ensure ALL engines use it

3. ADMIN SETTINGS → ROLE MANAGEMENT TAB (new):
   Build under src/engines/settings/components/role-management.tsx:
   - Matrix view: rows = roles, columns = engines
   - Each cell shows checkboxes for: view, edit, create, delete, sign
   - Admin can create NEW roles (stored in roles table)
   - Admin can modify existing role permissions
   - Changes save to role_permissions table in Supabase
   - Changes to sidebar_visibility also saved
   - Show which pages each role can see/access

4. USER SIGNATURE MANAGEMENT:
   In Admin Settings → Users tab:
   - Each user row shows signature status (captured / not captured)
   - Click to view/update signature
   - Admin can upload signature on behalf of user
   - Signature auto-populates in documents when user signs off
   - useUserSignature() hook already exists — wire it into the Users table

5. ADMIN USER VISIBILITY:
   - calo.lategan@allaith.com must appear in the Users table as role=admin
   - Check migration 008_admin_seed_user.sql — ensure it creates app_users record
   - If not in app_users table, add migration to insert
   - Show admin badge next to name in Users list
```

---

## PHASE 3: ENGINE FIXES (Parallel batch — all independent)

### Agent 4 — Quote Engine Fixes

```
OBJECTIVE: Fix all quote creation, display, and workflow bugs.

BUGS TO FIX:

1. QUOTE NOT UPDATING ON /quotes PAGE
   Current: useCreateQuote() invalidates QUOTES_LIST_QUERY_KEY
   Issue: If using sample data fallback (Supabase not configured), new quote
   isn't added to sample array. Fix: ensure optimistic update or refetch works
   in both Supabase mode AND demo mode.

2. FLEET PAGE NOT UPDATING ON QUOTE CREATE
   Current: useFinaliseQuote() creates bookings → fleet should show them
   Issue: Fleet dashboard reads bookings table independently but may have stale cache.
   Fix: After quote create/finalize, also invalidate fleet-related query keys.
   DO NOT import fleet hooks (modularity). Instead, invalidate by query key string.

3. PROJECTS NOT UPDATED
   When a quote is created with a project_id:
   - Insert into documents table: { project_id, type: 'quote', doc_id: quote.id, doc_number: quote.quote_number }
   - If no client name → project shows "Untitled" (not blank)
   - If no project name → shows "Untitled Project"

4. START/END DATES NOT FILLING
   Ensure startDate and endDate from quote form are:
   - Saved to quotes table on create/update
   - Displayed on /quotes list (add columns if missing)
   - Passed to booking creation on finalize
   - Passed to DN/RN generation

5. STATUS NOT UPDATING AFTER FINALIZE
   Current: useFinaliseQuote() updates status in DB then invalidates cache
   Issue: User reports status still shows "Draft" at top-left after clicking Finalize
   Fix: Ensure quote-detail re-fetches after mutation completes.
   Check if optimistic update is stale. Force refetch with await queryClient.invalidateQueries().

6. DRAFT SAVE VISUAL FEEDBACK
   Current: handleSaveDraft() shows toast but no persistent visual indicator
   Fix: After successful save, show green checkmark icon next to "Save Draft" button
   that persists for 3 seconds. Also show "Last saved: [time]" text.

7. NAVIGATE-AWAY DRAFT SAVE
   Current: useUnsavedChanges() handles beforeunload + popstate
   Issue: Next.js App Router soft navigation (Link clicks) doesn't trigger either event
   Fix: Add router.beforePopState() or use next/navigation events.
   On route change: if unsaved changes exist → show confirmation modal → save draft if confirmed.

8. ADDENDUM TO FINALISED QUOTE
   When user tries to add items to a finalised quote:
   - Show modal: "This quote is finalised. Adding items will create a revision."
   - On confirm: create new quote (revision) with only new items
   - Link to parent quote via parent_quote_id
   - Auto-generate DN for new items only
   - Original quote remains unchanged

FILE: src/engines/quote/hooks/use-quote-mutations.ts
FILE: src/engines/quote/components/quote-form.tsx
FILE: src/engines/quote/components/quote-detail.tsx
FILE: src/engines/quote/hooks/use-unsaved-changes.ts
```

### Agent 5 — Delivery Notes Engine Fixes

```
OBJECTIVE: Fix DN loading, implement full edit + sign-off workflow.

BUGS TO FIX:

1. DN DETAIL PAGE NOT LOADING
   User reports: clicking a DN on /delivery-notes → "Unable to load delivery note"
   Root cause: useDNDetail() may be failing Supabase query or ID routing is wrong.
   Debug: Check [id] param extraction in page.tsx, verify Supabase query, check RLS policies.
   Fix the query and ensure fallback to sample data works.

2. EDIT WORKFLOW
   DN must be editable when status is 'draft' or 'issued':
   - Delivery date, site address, driver name, vehicle plate, notes
   - Per-line-item: quantity adjustment, condition at loading
   - Save changes → update delivery_notes + dn_line_items in Supabase
   - Add useDNMutations() hook if not exists

3. SIGN-OFF WORKFLOW (DUAL VERIFICATION)
   Implement complete sign-off flow:
   - YARD CHECK: yard supervisor signs → captures signature via SignaturePad
     → stores in dn_signatures with role='yard-team'
     → status transitions: draft → yard-checked
   - CLIENT DELIVERY: client signs on delivery
     → stores in dn_signatures with role='client'
     → status: delivered → signed
   - Both signatures required for completion
   - Auto-populate admin signature from user_signatures table

4. DEEP LINKING FROM FLEET DASHBOARD
   Current: Fleet document panel links to /delivery-notes (list page)
   Fix: Link to /delivery-notes/[dn-id] (specific document)
   In fleet-dashboard DocumentPanel: when building document cards,
   include the actual document ID so the link goes to the detail page.
   DO NOT import from delivery-notes engine. Pass document IDs through
   the bookings table (add dn_id column if needed) or query by quote reference.

FILE: src/engines/delivery-notes/components/dn-detail.tsx
FILE: src/engines/delivery-notes/hooks/use-dn-detail.ts
FILE: src/engines/delivery-notes/hooks/use-dn-mutations.ts (new)
```

### Agent 6 — Return Notes Engine Fixes

```
OBJECTIVE: Wire up RN detail, implement manual creation from DN, auto-generation logic.

CURRENT STATE:
- useRNDetail() hook exists but is NOT wired into rn-detail.tsx component
- rn-detail.tsx uses sample data with comment: "For v1 we use sample data"
- No edit, sign-off, or creation UI

IMPLEMENT:

1. WIRE useRNDetail() INTO COMPONENT
   Replace sample data in rn-detail.tsx with actual hook call.
   Follow same pattern as dn-detail.tsx.

2. RN DETAIL PAGE NOT LOADING
   Same issue as DN — verify [id] param routing, Supabase query, RLS.

3. MANUAL RN CREATION FROM DN
   Add "Create Return Note" button on DN detail page (when DN status >= 'delivered'):
   - Opens modal showing DN line items
   - User selects which items to include in RN
   - Pre-fills: quantities from DN, dates from booking
   - User can add comments/notes per item
   - On save: creates RN linked to DN via delivery_note_id
   - Prevents duplicate: if RN already exists for these DN items → show warning

4. AUTO-GENERATION LOGIC
   Based on workflow_config:
   - Option A (default): RN created on quote finalisation (mirrors DN)
   - Option B: RN created on logistics_out date (endDate + logistics_out_days)
     → If that date arrives and user hasn't manually created RN → auto-generate
     → Flag the RN as "overdue" or "not done" if items not yet returned
   - NEVER create duplicate RNs for same items

5. SIGN-OFF WORKFLOW
   - Client signs: captures return acknowledgment signature
   - Yard receives: yard team signs on inspection
   - Per-item check: quantity returned, condition assessment (good/fair/damaged/missing)
   - Reconciliation: compare DN quantities vs RN quantities
   - Shortages flagged automatically

6. EDIT WORKFLOW
   When status is 'draft' or 'issued':
   - Edit return date, comments, per-item quantities and conditions
   - Save → update return_notes + rn_line_items

FILE: src/engines/return-notes/components/rn-detail.tsx (rewrite)
FILE: src/engines/return-notes/hooks/use-rn-detail.ts (wire in)
FILE: src/engines/return-notes/hooks/use-rn-mutations.ts (new)
FILE: src/engines/return-notes/components/rn-create-from-dn.tsx (new)
```

### Agent 7 — Purchase Orders & Invoice Engine

```
OBJECTIVE: Fix PO loading, create Invoice engine from scratch.

PO FIXES:

1. PO DETAIL NOT LOADING
   User reports: "Unable to load purchase order"
   Same pattern as DN/RN — debug [id] routing, Supabase query, RLS.

2. PO GENERATION ON QUOTE FINALISE
   When quote is finalised AND workflow_config.auto_generate_po = true:
   - Create PO record with: quote reference, client, project, line items, total
   - PO number: auto-generated PO-YYYY-NNNN
   - Status: 'pending'
   - Link: po.quote_id = quote.id

3. PO EDIT & STATUS MANAGEMENT
   - Pending → Confirmed (with confirmed_by, confirmed_date)
   - Confirmed → Completed (with completed_by, completed_date)
   - Confirmation triggers downstream (if Invoice not yet generated → generate now)

INVOICE ENGINE (NEW — src/engines/invoices/):

Create complete invoice engine following engine isolation pattern:

1. STRUCTURE:
   src/engines/invoices/
   ├── components/
   │   ├── invoice-list.tsx
   │   ├── invoice-detail.tsx
   │   └── invoice-status-badge.tsx
   ├── hooks/
   │   ├── use-invoices.ts
   │   ├── use-invoice-detail.ts
   │   └── use-invoice-mutations.ts
   ├── lib/
   │   ├── types.ts
   │   ├── constants.ts
   │   └── sample-data.ts
   └── index.ts

2. INVOICE LIFECYCLE:
   draft → issued → sent → paid (terminal)
   draft → cancelled (terminal)

3. GENERATION:
   - Auto-generated on quote finalisation (or PO confirmation, per workflow_config)
   - Copies line items from quote
   - Calculates: subtotal, VAT (5%), grand total
   - Due date: issued_date + client.payment_terms (default 30 days)

4. FEATURES:
   - List view with search/filter by status, client, date range
   - Detail view with line items, totals, payment status
   - Mark as paid (records paid_date)
   - Send to client (future: email integration)
   - PDF export (future: @react-pdf/renderer)

5. REGISTER IN ENGINE REGISTRY:
   Add to src/shared/engine-registry.ts:
   { id: 'invoices', name: 'Invoices', route: '/invoices', icon: 'receipt', status: 'active' }

6. ADD ROUTE:
   src/app/invoices/page.tsx → renders InvoiceList
   src/app/invoices/[id]/page.tsx → renders InvoiceDetail

7. ADD TO SIDEBAR:
   Engine registry handles this automatically. Add between Purchase Orders and Maintenance.
```

### Agent 8 — Admin Settings: Full Implementation

```
OBJECTIVE: Complete admin settings with workflow config, clients, rate cards, and fixes.

CURRENT STATE:
- Users tab: functional (approve/deny/add/edit roles)
- Rate Card tab: placeholder "Coming Soon"
- Clients tab: placeholder "Coming Soon"
- System tab: workflow toggles are visual-only (not saved to DB)
- Approve/Deny: User reports "Failed to approve signup request" (see screenshot)

FIX & IMPLEMENT:

1. APPROVE/DENY BUG
   Error visible in screenshot: "Failed to approve signup request"
   Debug: Check Supabase connection, RLS policies on signup_requests and app_users.
   The approve handler (lines 1047-1130) updates signup_requests AND creates app_users record.
   Possible causes:
   - RLS policy blocking INSERT on app_users
   - Missing required columns (email uniqueness constraint?)
   - Supabase not configured (demo mode fallback not handling mutations)
   Fix: Add proper error handling, check RLS, ensure migration creates proper policies.

2. ADMIN USER VISIBILITY
   calo.lategan@allaith.com must show as Admin in Users table.
   Check: migration 008 seeds this user. Verify app_users table has this record.
   If not: add to migration or seed on first login.
   Show admin badge on the row.

3. WORKFLOW CONFIGURATION (System tab rewrite)
   Replace visual-only toggles with functional Supabase-backed settings:

   a) DOCUMENT GENERATION SETTINGS:
      - "Generate DN on": [Quote Finalisation] / [Logistics In Date] (radio)
      - "Generate RN on": [Quote Finalisation] / [Logistics Out Date] (radio)
      - "Auto-generate PO on Quote Finalisation": [toggle]
      - "Auto-generate Invoice on Quote Finalisation": [toggle]
      - "Generate documents at which stage": [Quotes only] / [PO Confirmation] / [Both]

   b) APPROVAL SETTINGS:
      - "Require MSRA before delivery": [toggle]
      - "Require dual verification on delivery": [toggle]
      - "Auto-generate invoice on return completion": [toggle]

   c) Save all to workflow_config table
   d) Read on load, show current values
   e) "Save Configuration" button with success feedback

4. CLIENTS MANAGEMENT (new tab content)
   Replace placeholder with full client management:
   - Client list with search
   - Add Client form: name, contact person, email, phone, address, TRN, payment terms, currency
   - Edit client inline
   - Deactivate client (soft delete)
   - Client-specific rate card override link

5. RATE CARD MANAGEMENT (new tab content)
   Replace placeholder with:
   - Rate card list (Standard, EXPO Special, etc.)
   - Create rate card with name
   - Add items: category, description, unit rate, rate period, mob/demob fee
   - Set default rate card
   - Client-specific overrides: select client → override specific rates
   - Quote engine reads from rate_cards when adding line items

6. ROLE MANAGEMENT (new section in Users tab or new tab)
   - See Agent 3 above for full spec
   - Matrix view of roles × engines × permissions
   - Sidebar visibility toggles per role
```

### Agent 9 — Fleet Dashboard Sync & Deep Linking

```
OBJECTIVE: Sync dashboard metrics with fleet data, fix document deep links.

CURRENT STATE:
- Home dashboard shows utilisation, revenue, status cards
- These are NOT synced to fleet dashboard real data
- Fleet document panel links to list pages, not specific documents
- Clicking a booked date → document popup → clicking document → goes to /quotes not /quotes/[id]

FIX:

1. DASHBOARD ↔ FLEET SYNC (src/engines/dashboard/)
   The home dashboard must read from the SAME data sources as fleet dashboard:

   a) UTILISATION RATE:
      - Calculate from bookings table: (booked_asset_count / total_asset_count) × 100
      - Group by status: on-hire, quoted, available, in-service
      - Must match fleet dashboard's utilisation display exactly
      - Read from: fleet assets table + bookings table
      - DO NOT duplicate the query — create shared hook in src/shared/hooks/use-fleet-stats.ts
        that BOTH dashboard and fleet-dashboard can import independently

   b) REVENUE:
      - Calculate from quotes table: SUM(total) WHERE status = 'finalised'
      - Monthly breakdown: GROUP BY EXTRACT(MONTH FROM created_at)
      - Must reflect actual quote values, not hardcoded numbers
      - Create: src/shared/hooks/use-revenue-stats.ts

   c) STATUS SYNC:
      - Document counts by status (draft, finalised, completed, etc.)
      - Read from: quotes, delivery_notes, return_notes, purchase_orders, invoices tables
      - Show real numbers, not sample data

2. FLEET DOCUMENT DEEP LINKING
   In src/engines/fleet-dashboard/ when building DocumentPanel document cards:

   Current: { type: 'quote', route: '/quotes' }
   Fix:    { type: 'quote', route: '/quotes/[actual-quote-id]' }

   How to get the actual document ID:
   - Bookings table already has: quote_id (or job_number reference)
   - Query: SELECT id FROM quotes WHERE id = booking.quote_id
   - For DN: SELECT id FROM delivery_notes WHERE quote_id = booking.quote_id
   - For RN: SELECT id FROM return_notes WHERE quote_id = booking.quote_id
   - Store document IDs on the booking record OR query on panel open

   DO NOT import from quote/DN/RN engines. Query Supabase directly in fleet-dashboard hooks.

3. STATUS CONSISTENCY
   Ensure status shown in fleet calendar cells matches actual document status:
   - Magenta cell (QUOTE) → quote exists but not finalised
   - Green cell (ON-HIRE) → DN issued + equipment on site
   - Blue cell (COMPLETED) → RN confirmed + all returned
   - Red cell (OVERDUE) → past end_date + RN not confirmed
```

### Agent 10 — MSRA Engine: Full Implementation

```
OBJECTIVE: Build complete MSRA (Method Statement & Risk Assessment) engine.

CURRENT STATE:
- List view only with search/filter
- No detail view, no create, no edit, no download, no preview
- Status lifecycle defined in types: draft → submitted → approved / rejected

IMPLEMENT:

1. MSRA DETAIL VIEW (src/engines/msra/components/msra-detail.tsx)
   - Full read view of MSRA document
   - Sections: project info, scope of work, risk items, control measures, PPE requirements
   - Status badge with lifecycle indicator
   - Prepared by / approved by / rejected by with timestamps

2. MSRA CREATE/EDIT (src/engines/msra/components/msra-form.tsx)
   - Form with sections matching MSRA template:
     a) Project Information (client, site, project name, dates)
     b) Scope of Work (text area)
     c) Risk Assessment Table:
        - Hazard description
        - Risk level (Low/Medium/High/Critical)
        - Control measures
        - Responsible person
     d) PPE Requirements (checkboxes)
     e) Emergency procedures
   - Save as Draft
   - Submit for Approval

3. APPROVAL WORKFLOW
   - Draft → Submit: author clicks "Submit for Approval"
   - Submitted → Approve: admin/manager clicks "Approve" → captures signature
   - Submitted → Reject: admin/manager clicks "Reject" → adds rejection reason
   - Rejected → Edit → Resubmit
   - Approved MSRAs are read-only

4. PREVIEW & DOWNLOAD
   - Preview: render MSRA as formatted document in modal
   - Download: generate PDF using the PDF template system (future @react-pdf/renderer)
   - For now: download as formatted HTML or use browser print

5. DATABASE:
   - msra table should already exist or create migration
   - Fields: id, msra_number, title, status, project_id, client_id, site_location,
     scope_of_work, risk_items (JSONB), control_measures (JSONB), ppe_requirements (JSONB),
     prepared_by, approved_by, rejected_by, rejection_reason, approved_at, rejected_at,
     drive_file_id, created_at, updated_at

6. HOOKS:
   - useMSRAs() — list with filtering
   - useMSRADetail() — single record
   - useMSRAMutations() — create, update, submit, approve, reject
```

### Agent 11 — Maintenance Engine: Reference Sheet Match

```
OBJECTIVE: Build maintenance engine matching the reference maintenance sheet exactly.

CURRENT STATE:
- List view with search/filter
- Detail view reads data but is read-only
- No create, edit, status transitions, or 2-way sync
- No expected deliverable dates or QC check tracking

IMPLEMENT:

1. MAINTENANCE RECORD VIEW (match reference sheet layout)
   The maintenance detail must look EXACTLY like the reference maintenance sheet:
   - Header: Asset plant number, description, category
   - Scheduled date, actual start, actual completion
   - Technician assigned
   - Maintenance type: scheduled / reactive / qc-inspection
   - Work description
   - Parts used table (part name, quantity, unit cost, total)
   - QC results section
   - Sign-off section

2. CREATE/EDIT MAINTENANCE RECORD
   - Form matching the reference sheet fields
   - Select asset from fleet (shared asset picker pattern — independent query)
   - Set scheduled date and expected completion date
   - Assign technician
   - Add parts used
   - Save draft → scheduled

3. STATUS TRANSITIONS
   - scheduled → in-progress (technician starts work)
   - in-progress → completed (work done, awaiting QC)
   - Mark when first check is done
   - If requires maintenance → status = needs-qc
   - needs-qc → QC check scheduled in AppSheet app

4. EXPECTED DELIVERABLE DATES
   - Set expected completion date on creation
   - Show countdown/overdue indicator
   - Visual timeline of: scheduled → started → first check → QC → completed

5. 2-WAY SYNC WITH DOCUMENT/APPSHEET
   - Maintenance records write to Supabase table
   - AppSheet reads same Supabase table (via PostgREST API)
   - QC logs done in AppSheet → write qc_result, qc_notes to same record
   - Maintenance dashboard reads updated QC data
   - Bidirectional: dashboard creates record → AppSheet updates QC → dashboard shows results

   Implementation:
   - Add columns: qc_status ('pending','passed','failed'), qc_checked_at, qc_checked_by
   - AppSheet uses Supabase REST API to UPDATE these columns
   - Maintenance dashboard polls/subscribes to changes via TanStack Query refetch

6. RETURN NOTE → MAINTENANCE LINK
   When RN inspection finds damaged items:
   - Auto-create maintenance record with type='qc-inspection'
   - Link: maintenance.return_note_id = rn.id
   - Pre-fill asset info from RN line items
```

### Agent 13 — Fleet Dashboard: Full Season Stock Import (764 Assets)

```
OBJECTIVE: Import ALL 764 assets from the Season Stock 2026-2027 spreadsheet into the fleet
dashboard. Currently only 35 sample items are hardcoded in sample-data.ts with 610 declared
across categories — but the actual spreadsheet has 764 individual asset rows.

CURRENT STATE:
- sample-data.ts has 35 sample FleetAssetRow objects across 13 categories
- Total declared in category headers = 610 (but only 35 actual rows rendered)
- The source spreadsheet is: Site Services Project/references/spreadsheets/Season-Stock-2026-2027.xlsx
- No CSV/XLSX import pipeline exists in the app
- Data flows: Supabase DB (primary) → sample-data.ts fallback (35 items)

IMPLEMENT:

1. PARSE THE FULL SEASON STOCK SHEET
   Read Season-Stock-2026-2027.xlsx and extract ALL asset rows:
   - Plant number (e.g., 4DR.ABL.16.1, ABL.F.20.2, OPO.001)
   - Description / model name
   - Category (Mixed Ablution, Female Ablution, OPO, DRS, Flexiloo, etc.)
   - Condition / status
   - Current location (site or yard)
   - Any booking/hire data if present
   Map each row to the FleetAssetRow type defined in types.ts.

2. SEED DATABASE MIGRATION (013_fleet_full_seed.sql)
   Create a migration that:
   - INSERTs all 764 assets into the fleet_assets table (or whatever the table is named)
   - Preserves exact plant numbers from the sheet
   - Sets correct category_id references
   - Includes condition, location, and availability status
   - This is the AUTHORITATIVE source — not the 35-item sample

3. UPDATE sample-data.ts AS FULL FALLBACK
   Replace the 35-item sample with the complete 764-item dataset.
   If this makes the file too large (>100KB), instead:
   - Create src/engines/fleet-dashboard/lib/fleet-seed-data.json (764 items)
   - Import the JSON in sample-data.ts
   - The JSON file gets tree-shaken in production if DB is available

4. ADMIN IMPORT FEATURE (Admin Settings → System tab)
   Add "Fleet Data Import" section:
   - "Import from Spreadsheet" button (admin only)
   - Upload .xlsx file → parse with SheetJS (xlsx package)
   - Preview table showing parsed rows with validation
   - "Confirm Import" → upsert into fleet_assets table
   - Progress bar during import
   - Conflict resolution: if plant_number already exists → update, don't duplicate
   - Import log showing: added N, updated N, skipped N, errors N

   Implementation:
   - Install: npm install xlsx (SheetJS — already available in React artifacts)
   - Create: src/engines/settings/components/fleet-import.tsx
   - Parse: read workbook → iterate sheets → map columns to FleetAssetRow fields
   - Validate: required fields present, no duplicate plant numbers
   - Upload: batch upsert to Supabase (50 rows per batch to avoid payload limits)

5. SHEET FILE IN FILESYSTEM
   Copy Season-Stock-2026-2027.xlsx to: public/data/Season-Stock-2026-2027.xlsx
   On first load (no DB data), fleet dashboard can fetch from this path as seed.
   OR better: parse at build time and generate a JSON seed file.

6. ENSURE QUOTE ASSET PICKER READS SAME DATA
   src/engines/quote/components/asset-picker.tsx currently has its own SAMPLE_ASSETS
   with WRONG plant numbers (CAB-001, TOI-001 instead of real fleet format).
   Fix: asset-picker must query the same fleet_assets table.
   Remove SAMPLE_ASSETS hardcoded data.
   Use the shared useFleetAssets() hook from src/shared/hooks/use-fleet-assets.ts.
   Fallback to the same 764-item seed data, not a separate fake 8-item list.

FILES:
- supabase/migrations/013_fleet_full_seed.sql (new)
- src/engines/fleet-dashboard/lib/sample-data.ts (replace with full data)
- src/engines/fleet-dashboard/lib/fleet-seed-data.json (new, optional)
- src/engines/settings/components/fleet-import.tsx (new)
- src/engines/quote/components/asset-picker.tsx (fix to use real fleet data)
- public/data/Season-Stock-2026-2027.xlsx (copy of source sheet)
```

---

## PHASE 4: CROSS-CUTTING CONCERNS (After Phase 3)

### Agent 14 — Status Sync, Financial Aggregation & Project Auto-Filing

```
OBJECTIVE: Ensure all engines reflect consistent status and financial data.
(Renumbered from Agent 12 to Agent 14 to accommodate Agents 12-13 additions)

1. STATUS SYNC CONSUMER
   Create src/shared/document-workflow/status-sync-consumer.ts:
   - Each engine page checks document_status_events table on load
   - If upstream status changed → update local document status
   - Example: Quote cancelled → DN/RN/PO/Invoice all show 'cancelled'
   - Use TanStack Query with short stale time (10s) for near-real-time

2. FINANCIAL AGGREGATION
   Create src/shared/hooks/use-project-financials.ts:
   - Reads quotes, POs, invoices for a given project_id
   - Computes: total quoted, total PO'd, total invoiced, outstanding balance
   - Projects engine imports this hook for its Financials tab
   - Dashboard imports for revenue cards

3. PROJECT DOCUMENT AUTO-FILING
   When ANY document is created with a project_id:
   - Insert into project_documents junction table:
     { project_id, document_type, document_id, document_number, status, created_at }
   - Projects engine reads this table for its Documents tab
   - No cross-engine imports — just shared database table

4. FLEET BOOKING → DOCUMENT LINK TABLE
   Create booking_documents junction table:
   - booking_id, document_type ('quote','dn','rn','po','invoice'), document_id
   - Written by document generation workflow
   - Read by fleet-dashboard DocumentPanel for deep linking
```

---

## EXECUTION ORDER

```
SEQUENTIAL:  Phase 0 (Agent 0) — MUST complete first
SEQUENTIAL:  Phase 1 (Agent 1) — Database migrations, MUST complete before Phase 2-3
PARALLEL:    Phase 2 (Agents 2, 3) — Shared utilities
PARALLEL:    Phase 3 (Agents 4-13) — All engine work in parallel (10 agents)
SEQUENTIAL:  Phase 4 (Agent 14) — After all engines are done
```

---

## VERIFICATION CHECKLIST (Run after ALL phases)

```bash
# 1. Build must pass
npm run build

# 2. Deletion test — EVERY engine must be independently removable
for engine in fleet-dashboard projects quotes delivery-notes return-notes \
  purchase-orders maintenance water-delivery workshop-stock catalog \
  presentations msra process settings invoices; do
  echo "Testing deletion of $engine..."
  rm -rf "src/engines/$engine/"
  npm run build || echo "FAIL: $engine deletion breaks build"
  git checkout "src/engines/$engine/"
done

# 3. No cross-engine imports
grep -r "from.*engines/" src/engines/ --include="*.ts" --include="*.tsx" | \
  grep -v "from.*engines/[^/]*/\|engine-registry" && echo "CROSS-ENGINE IMPORT FOUND!" || echo "Clean"

# 4. TypeScript clean
npx tsc --noEmit

# 5. Bundle size check
npm run build 2>&1 | grep "First Load JS"
```

---

## THINGS TO SKIP (DO LATER)

- Presentations engine (waiting for Janu's templates)
- Catalog engine updates (one-time template, deal with later)
- Workshop Stock inventory system (separate project)
- Google Drive integration (needs API keys and setup)
- PDF template system (needs @react-pdf/renderer, separate session)
- Email integration (future feature)

---

## COMPANY INFORMATION (For Reference)

```
Company: Al Laith Projects LLC (Site Services Division)
TRN: 100529430100003
Currency: AED (primary), SAR, USD supported
VAT: 5% (UAE standard)
Address: P.O. Box 24460, Abu Dhabi, UAE
Document Prefixes:
  - Quotes: Q-YYYY-NNNN or RP-NNNN
  - Delivery Notes: DN-YYYY-NNNN
  - Return Notes: RN-YYYY-NNNN
  - Purchase Orders: PO-YYYY-NNNN
  - Invoices: INV-YYYY-NNNN
  - MSRA: MSRA-YYYY-NNNN
```
