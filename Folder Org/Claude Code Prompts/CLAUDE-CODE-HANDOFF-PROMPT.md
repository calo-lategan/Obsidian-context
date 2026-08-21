# Claude Code CLI — Site Services App Implementation Prompt

Copy everything below the line and paste it as your first prompt in Claude Code CLI.

---

I'm building the Site Services web app for Al Laith Projects Services LLC. Production project, not a prototype. This session covers: Shared Shell + Engine 1 (Fleet Dashboard) + Engine 2 (Projects Engine).

## Step 1: Read These Files BEFORE Writing Any Code

1. `.claude/skills/site-services-webapp/SKILL.md` — 31 DOs, 16 DON'Ts, full architecture rules, code commenting standards, business context, roles matrix, Drive folder hierarchy, naming conventions. This is the law. Follow every rule.
2. `.claude/CLAUDE.md` — project brief, engine registry pattern, coding conventions, Home Dashboard spec, Projects Engine spec, status colors, design tokens.
3. `docs/wireframes/fleet-dashboard-v7.jsx` — approved v7 wireframe. Source of truth for Fleet Dashboard UI: layout, colors, interactions, data structure, design tokens, admin CRUD patterns.
4. `docs/Fleet-Dashboard-DOs-DONTs.md` — 26 DOs and 14 DON'Ts specific to the Fleet Dashboard wireframe and UI.
5. `docs/UI-UX-Research-Findings.md` — frozen headers, z-index strategy, glassmorphism, collapsible sections, design token system.
6. `IMPLEMENTATION-CHECKLIST.md` — 9 phases, 130+ checkboxes with built-in TEST items. Update this as you work. Check off items ONLY when fully done and tested. Log bugs in the issue table. Fill "Notes for Next Session" before finishing.

## Step 2: Understand the 3 Non-Negotiable Architecture Rules

### Rule 1: Crash-Proof Modularity

If I delete an entire engine folder, every other engine and page still compiles and functions. This is the #1 requirement.

**The Deletion Test (run after every major phase):** `rm -rf src/engines/fleet-dashboard/` → `pnpm build` succeeds → Home Dashboard loads (shows Fleet as "Unavailable") → all other engines work. If this fails, the architecture is wrong. Fix before proceeding.

How:
- Engine Registry (`src/shared/engine-registry.ts`) — single array of engine metadata. Sidebar and Home Dashboard iterate this. No hardcoded engine imports anywhere.
- Dynamic imports only (`next/dynamic`) for all engine page mounts. Never static import engine code in layout, sidebar, or Home Dashboard.
- Error Boundary per engine route. Crash caught and contained, doesn't propagate.
- No cross-engine imports. Engines import from `shared/` only.
- Graceful absence — missing engine route shows "Coming Soon" or "Unavailable", never a white screen or build error.

### Rule 2: Google Shared Drive = Document Database

Drive is NOT just file storage — it IS the document database. Supabase stores metadata only (file IDs, names, types). Drive stores actual files.

- `documents` table: `drive_file_id`, `drive_folder_id`, `file_name`, `type`, `created_at`, `booking_id`, `project_id`
- "View a document" = fetch from Drive API using stored file ID
- "Create a document" = generate file → upload to Drive → store metadata in Supabase
- Auto-file to correct Drive folder by type + year (20-folder hierarchy in SKILL.md)
- Shared Drive client at `src/shared/drive/client.ts` used by all engines

### Rule 3: IT-Team Readable Code (MANDATORY)

The IT team at Al Laith must read, understand, and maintain this code without needing the original developer. Write code as if handing it to someone who's never seen the project.

1. **JSDoc on every export** — what it does, what it affects, how it connects to other parts. Example:
   ```typescript
   /**
    * CalendarGrid — Main fleet calendar view.
    * Renders a day-level grid of all assets grouped by category.
    * Reads: 'assets', 'bookings', 'categories' tables via useFleetData hook.
    * Affects: Clicking colored cell opens DocumentPanel. Clicking empty cell opens CreateModal.
    * Connects to: Home Dashboard reads same bookings data for KPI cards.
    */
   ```
2. **Inline comments at non-obvious logic** — explain WHY, not WHAT. Especially: status color mappings, z-index layering (why 14/12/8/5), DB queries and what other engines read the same data, Drive API folder routing, conditional business rules.
3. **Section dividers** (`// ═══ SECTION NAME ═══`) in files longer than 80 lines.
4. **Document data flow** — when writing to a DB table, comment which other engines/components read it: `// Writes to 'bookings' → Fleet Dashboard colors cells, Projects Engine Assets tab, Home Dashboard KPIs`
5. **File header comments** — every file starts with 2-3 lines: purpose + which engine/module it belongs to.
6. **Short functions (~40 lines max)**, descriptive variable names, early returns, no single-letter variables.

## Step 3: Tech Stack

- React 19 + Next.js 15 App Router + TypeScript (strict, no `any`) + Tailwind CSS
- Supabase PostgreSQL + Row Level Security
- Supabase Auth + Google OAuth
- TanStack Query (server state) + Zustand (client state, scoped per-engine)
- Google Drive API (shared client)
- Gmail API (draft-first, double-confirm send)
- pnpm + Vercel deployment

## Step 4: Build in This Order

### Phase A — Shared Shell (build first, everything depends on this)

A1. **Database schema** — design and migrate these tables:
- `categories` (id, name, display_order)
- `assets` (plant_number PK, description, category_id FK, current_status)
- `clients` (id, name, contact_name, email, phone, payment_terms)
- `projects` (id, name, client_id FK, status enum, job_number, start_date, end_date, created_at)
- `bookings` (id, asset_id FK, project_id FK, status, start_date, end_date, logistics_in_days, logistics_out_days)
- `documents` (id, project_id FK, booking_id FK nullable, type enum, file_name, drive_file_id, drive_folder_id, created_at)
- `users` (id, email, name, role enum: Admin/Manager/Supervisor/Operator)
- Row Level Security policies per role
- Seed with real Season Stock data (actual plant numbers, categories, descriptions)

A2. **Engine Registry** — `src/shared/engine-registry.ts`. Fleet + Projects as 'active', all others as 'planned'.

A3. **Auth** — Supabase Auth + Google OAuth for Gmail/Drive access. Protected routes redirect to login.

A4. **Google Drive client** — `src/shared/drive/client.ts`. Functions: listFiles, uploadFile, downloadFile, searchFiles. Maps to 20-folder hierarchy.

A5. **Root Layout + Sidebar** — sidebar generated dynamically from engine registry. No hardcoded engine imports. Collapsible. Active route highlighted. 'Planned' engines greyed with "Coming Soon". Admin toggle at bottom. No emojis. No "engine" in nav labels.

A6. **Home Dashboard** (`/` route) — default landing page:
- KPI cards: Total Assets, On Hire %, Available %, Under Service, Active Projects, Pending Quotes
- Active Projects: cards from `projects` table (clickable → `/projects/[id]`)
- Recent Activity: latest bookings/status changes
- Quick Actions: New Quote, New Booking, Check Availability
- Engine Status Grid: tiles from registry (active/planned)
- Does NOT import engine code — reads Supabase tables directly. Missing tables show empty/placeholder state.

A7. **Shared UI** — Button, Modal, SlideOutPanel, InlineEdit, Toast, ErrorBoundary, LoadingState, EmptyState.

A8. **DELETION TEST:** Delete `src/engines/` entirely → `pnpm build` succeeds → Home Dashboard loads → sidebar shows all engines as "Coming Soon". If fails, fix before Phase B.

### Phase B — Fleet Dashboard (Engine 1)

All code in `src/engines/fleet-dashboard/` and `src/app/(dashboard)/fleet/`. Self-contained. No imports from other engines.

B1. **Design tokens + constants** — STATUS colors (exact hex + opacity), glassmorphism values, navy accent #1F4E79, z-index tiers. All in `constants.ts`.

B2. **CalendarGrid** — day-level grid, one column per day. Frozen headers + columns (Excel freeze pane):
- Header row: `position: sticky; top: 0; z-index: 12`
- Plant No + Description: `position: sticky; left: 0; z-index: 5`
- Category headers: sticky left cell (z-index: 8) + spanning right cell
- Corner: z-index: 14
- This is the hardest CSS — nail it first.

B3. **CategorySection** — collapsible toggle, arrow rotates, asset count badge when collapsed. Lazy render collapsed rows.

B4. **DayCell** — status colors:
- AVAILABLE: #FFFFFF (100%), text #64748b
- QUOTE: #FF00FF (82%), text #1a001a
- BOOKED/ON HIRE: #00FFFF (82%), text #003333
- SOLD TO KSA/IN KSA: #FF9900 (82%), text #1a0d00
- SERVICE: #FF0000 (78%), text #ffffff
- YARD: #00FF00 (75%), text #003300
- REVISION QUOTES: #D5A6BD (78%)
- Colors VIVID. Match Season Stock exactly. No fading.
- Logistics in/out: diagonal stripes (CSS `repeating-linear-gradient`), 45deg mob-in, -45deg demob-out.

B5. **DocumentPanel** — slide-out from right (420px). Click colored cell → shows docs for that booking. Cards: Quote, DN, PO, RN, Presentation, MSRA, Catalog. Actions: View, Download, Email. Fetches from Drive via shared client.

B6. **CreateModal** — click empty cell → modal pre-filled with plant number + date. Options: New Quote, New Booking, Schedule Service, Mark In KSA.

B7. **EmailComposer** — selectable doc attachments. Always create Gmail DRAFT first. "Send" requires double-confirmation. Never auto-send.

B8. **Admin CRUD** — role-gated admin mode:
- InlineEdit (double-click to edit, Enter saves, Esc cancels)
- Edit plant numbers, descriptions, category names
- Add/remove asset rows and categories
- Admin toggle in sidebar, visual indicator in header
- All handlers use `useCallback`

B9. **Fleet KPI cards** — Total Assets, On Hire %, Available %, Under Service. Glass card styling.

B10. **TimeRangeSelector** — 30D / 60D / 90D / 6M / 1Y / 2Y + year navigation arrows.

B11. **DELETION TEST:** `rm -rf src/engines/fleet-dashboard/` → `pnpm build` succeeds → Home Dashboard loads (Fleet section shows fallback) → sidebar shows Fleet as "Unavailable". If fails, fix before Phase C.

### Phase C — Projects Engine (Engine 2)

All code in `src/engines/projects/` and `src/app/(dashboard)/projects/`. Self-contained. No imports from fleet-dashboard.

C1. **Projects List** (`/projects`) — filterable/searchable table. Columns: Project Name, Client, Status, Asset Count, Date Range, Value. Click row → `/projects/[id]`.

C2. **Project Detail** (`/projects/[id]`) — header with project info + tab navigation:
- **Documents tab** — from Google Drive, grouped by type (Quotes, DNs, POs, RNs, Invoices, Presentations, MSRAs). View/Download/Email actions.
- **Assets tab** — plant numbers assigned, current status (color-coded). Click → Fleet Dashboard (graceful fallback if fleet unavailable).
- **Timeline tab** — chronological events (Quote Created, Booking Confirmed, Delivered, Returned, Invoiced).
- **Financials tab** — quote value, PO value, invoiced amount, outstanding balance.

C3. Wire Home Dashboard "Active Projects" to real `projects` table data.

C4. **DELETION TEST:** Delete `src/engines/projects/` → `pnpm build` succeeds → Fleet Dashboard works → Home shows empty projects section. If fails, fix before Phase D.

### Phase D — Production Readiness

D1. Mobile responsive (grid scrollable with touch, panel full-width, sidebar → hamburger)
D2. Offline PWA (service worker, IndexedDB, sync queue)
D3. Final deletion test on every engine
D4. Lighthouse audit (performance >80, accessibility audit)

## Step 5: UI Design Rules

- **Light glassmorphism (Apple Liquid Glass)** on chrome/panels ONLY:
  - Panel: `rgba(255,255,255,0.58)` + `backdrop-filter: blur(20px)`
  - Header: `rgba(255,255,255,0.68)` + `blur(24px)`
  - Card: `rgba(255,255,255,0.5)` + `blur(14px)`
- **Data grid: solid white background** — NO glass on data cells
- **Navy accent:** #1F4E79
- **Font:** Inter, 11-13px grid cells, 16px+ headers. Monospace for plant numbers.
- **No emojis. No "engine" in nav labels.**

## Step 6: Project Structure

```
src/
  app/
    page.tsx                      # Home Dashboard (default landing)
    layout.tsx                    # Root layout — sidebar from engine registry
    (dashboard)/
      fleet/page.tsx              # Fleet Dashboard
      projects/
        page.tsx                  # Projects list
        [id]/page.tsx             # Project detail
  engines/
    fleet-dashboard/              # Engine 1 — fully self-contained
      components/                 # CalendarGrid, CategorySection, DayCell, etc.
      hooks/                      # useFleetData, useCalendarRange, useCollapsible, useAdminMode
      lib/                        # constants.ts, types.ts, utils.ts
      actions/                    # fleet.ts (server actions)
    projects/                     # Engine 2 — fully self-contained
      components/                 # ProjectList, ProjectDetail, DocumentsTab, etc.
      hooks/                      # useProjects, useProjectDocuments
      lib/                        # types.ts
      actions/                    # projects.ts
  shared/
    engine-registry.ts            # CRITICAL: dynamic engine metadata
    types/
    db/                           # Supabase client
    drive/                        # Google Drive API client
      client.ts
      types.ts
    auth/
    ui/                           # Shared UI (Button, Modal, Toast, ErrorBoundary)
  lib/
    supabase/
      client.ts
      server.ts
      types.ts
```

## Step 7: Working with the Checklist

`IMPLEMENTATION-CHECKLIST.md` has 9 phases and 130+ checkboxes. As you work:

1. Check off items ONLY when fully done, tested, zero errors/warnings
2. Partially done items → leave unchecked, add comment explaining what remains
3. After each major phase → update Bug/Warning/Issue Log table
4. Before finishing → fill "Notes for Next Session"
5. Built-in TEST items → run each test when you reach it. Do not skip.

## Start Now

1. Read all 6 reference files listed in Step 1
2. Check off Phase 0 items in the checklist as you read each file
3. Begin Phase A (Shared Shell) — database schema first
4. Follow the checklist order. Update it as you go.
