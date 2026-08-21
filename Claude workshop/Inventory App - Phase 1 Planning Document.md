# Al Laith Workshop Inventory App — Phase 1 Planning Document

## 1. Problem Statement

The Al Laith Site Services Workshop manages ~43+ inventory items (electrical, dispensers, chemicals, signs, AC parts, bins). Current tracking is via exported Excel spreadsheets. Workers are multilingual (English/Hindi), many cannot read English fluently. There is no real-time stock tracking, no photo-based identification, and no way for workers to independently update inventory counts from the floor.

**Core need**: A picture-first, offline-capable inventory app where anyone can quickly find an item by photo, tap +/- to adjust stock, and admins can add new items — all syncing to a central database and exportable to Google Sheets / Excel matching the existing layout.

---

## 2. User Roles & Authentication

| Role | Access | Auth |
|------|--------|------|
| **Admin** (Calo + designated) | Full CRUD: add new items, edit items, delete items, manage categories, export, adjust stock | 4-6 digit PIN |
| **Worker** | View inventory, adjust stock (+/-) on existing items only, switch language | 4-6 digit PIN |

- PINs stored as bcrypt hashes in the database
- Session persists via JWT token in secure storage
- Offline auth: token validated locally, syncs when online
- No individual user accounts in MVP — one admin PIN, one worker PIN
- Future: individual PINs per person for audit trail

---

## 3. Core Features (MVP)

### 3.1 Picture-First Item Grid
- **Default view**: Large photo cards in a responsive grid (2-3 columns on phone, 4-6 on tablet/desktop)
- Each card shows: item photo (dominant), item name, current quantity badge, category color tag
- Tap a card → item detail view with +/- controls
- No text-heavy tables — photos are the primary navigation method

### 3.2 Quick Stock Adjustment (+/-)
- Large, thumb-friendly `+` and `-` buttons on each item detail view
- Quantity updates immediately in local DB
- Optional: quantity change reason (dropdown: "used on site", "received new stock", "damaged", "returned")
- Change log stored locally, synced to server

### 3.3 Category Navigation
- Top-level categories from your data: Electrical, Dispensers, Chemicals, Bins, AC, Signs, Plumbing
- Subcategories: e.g., Electrical > Bulbs > 8000K, Electrical > Wall Switches, Electrical > Outlets
- Visual: category icons/colors, not just text labels
- Filter bar at top for quick category switching

### 3.4 Search
- Search by item name (works in both English and Hindi)
- Fuzzy matching for typos
- Photo-based visual scanning (scroll through grid)

### 3.5 Hindi Language Toggle
- Fixed button bottom-left corner: हिंदी / EN
- All UI labels, category names, button text switch instantly
- Item names can have both English and Hindi versions
- Numbers remain universal (Arabic numerals)

### 3.6 Admin: Add New Item
- Only visible when logged in as admin
- Form: photo capture/upload, item name (EN + Hindi), category (dropdown with hierarchy), initial quantity, condition notes
- Camera opens directly for photo capture
- Can also select from gallery/file upload

### 3.7 Export
- **Export as Excel (.xlsx)**: Generates file matching exact layout of `inventory-export-2025-12-28.xlsx` — same columns: RowNumber, lId, Short Name, Name, Remarks, Stock Keeping Unit, StockMaintain, Capacity, Used, ResourceType, TaxType, StockLedger, StockLedgerIncome, StockLedgerExpense, LastModifiedBy, LastModifiedOn, Created On, HS-Codes, Working Height, Group Description, Sub Group Description, Category Description, Sub Category Description, Purchase Month, Purchase Year, Asset Description, Asset Cost, Total Life, Assets S. No, Revenue Category, Asset Type
- **Export as Google Sheet**: Same layout, pushed to a Google Sheet via API (requires one-time Google auth)
- Anyone can export (worker or admin)

### 3.8 Import from ERP
- **Admin only** — button hidden for workers
- Upload `.xlsx` file in the exact same 31-column format as the ERP export
- **Import modes** (selectable each time):
  - **Full Sync**: Add new items, update existing, soft-delete items missing from file
  - **Add & Update Only**: Add new, update existing, leave everything else untouched
- **Preview before committing**: color-coded table showing NEW / UPDATE / SAME / REMOVED per row
- **Summary counts** shown before confirm button
- **Auto-category creation**: Categories from `Category Description` column are auto-created if they don't exist
- **Passthrough fields**: Columns the app doesn't actively use (StockMaintain, TaxType, etc.) are stored as-is and written back on export — zero data loss
- **Works offline**: Parsed client-side via SheetJS, stored in IndexedDB, syncs to Supabase when online
- **Use case**: Initial bulk load from procurement → workers adjust stock in app → export back to update ERP

### 3.9 Offline-First with Sync
- App works fully offline: browse, search, adjust stock, view photos
- All data cached in IndexedDB on device
- Photos cached in Cache API / IndexedDB
- When internet returns: auto-sync pending changes to server
- Conflict resolution: last-write-wins with timestamp (sufficient for single-workshop use)

---

## 4. Data Model

### Items Table
```
{
  id: string (UUID),
  shortName: string,
  name: string,
  nameHindi: string,
  category: string (hierarchical, e.g., "Electrical > Bulbs > 8000K"),
  quantity: number,
  condition: string (e.g., "239 good" or "3 new, 13 good"),
  photoUrl: string (local blob reference + remote URL),
  photoThumbnail: string (base64 compressed thumbnail for grid),
  remarks: string,
  sku: string,
  groupDescription: string (always "Site Services Workshop"),
  subGroupDescription: string,
  categoryDescription: string,
  subCategoryDescription: string,
  lastModifiedBy: string,
  lastModifiedOn: ISO datetime,
  createdOn: ISO datetime,
  assetDescription: string,
  assetCost: number,
  syncStatus: "synced" | "pending" | "conflict",
  updatedAt: ISO timestamp (for sync ordering)
}
```

### Change Log Table
```
{
  id: string (UUID),
  itemId: string (FK → Items),
  action: "increment" | "decrement" | "create" | "edit" | "delete",
  quantityChange: number,
  reason: string,
  performedBy: "admin" | "worker",
  timestamp: ISO datetime,
  synced: boolean
}
```

### Categories Table
```
{
  id: string,
  name: string,
  nameHindi: string,
  parentId: string | null,
  icon: string (emoji or icon name),
  color: string (hex),
  level: number (0 = root, 1 = sub, 2 = sub-sub)
}
```

---

## 5. Recommended Tech Stack

### Frontend
| Component | Choice | Why |
|-----------|--------|-----|
| **Framework** | React 19 + Vite 6 | Largest ecosystem, most tutorials, easiest to find help. Vite gives instant HMR and PWA plugin |
| **PWA** | vite-plugin-pwa (Workbox) | Battle-tested service worker generation, precaching, runtime caching |
| **UI Library** | Tailwind CSS + shadcn/ui | Fast to build, responsive, accessible components out of the box |
| **Icons** | Lucide React | Lightweight, tree-shakeable |
| **i18n** | react-i18next | Industry standard, lazy loading, interpolation, pluralization |
| **Camera** | Native `<input type="file" capture="environment">` + MediaDevices API | Works on all phones, no library needed |
| **State** | Zustand | Tiny (1KB), simple, works great with IndexedDB sync |

### Local Database & Sync
| Component | Choice | Why |
|-----------|--------|-----|
| **Client DB** | Dexie.js (IndexedDB wrapper) | 29KB, excellent API, offline-first by design, handles blobs natively |
| **Photo Storage** | IndexedDB blobs (thumbnails) + Cache API (full-res) | No server needed for offline viewing |
| **Sync Engine** | Dexie Cloud (free tier) OR custom REST sync | Dexie Cloud: built-in sync for Dexie.js, handles conflicts. Custom: more control |
| **Conflict Strategy** | Last-write-wins (timestamp-based) | Simple, sufficient for single-workshop with few concurrent users |

### Backend (Minimal)
| Component | Choice | Why |
|-----------|--------|-----|
| **API** | Node.js + Express (or Hono for speed) | Simple REST API for sync endpoint + Google Sheets push |
| **Database** | SQLite (via better-sqlite3) OR PostgreSQL (Supabase free tier) | SQLite: zero config, single file. Supabase: managed, free 500MB |
| **Photo Storage** | Supabase Storage (5GB free) OR Cloudflare R2 (10GB free) | Cheap/free, CDN-backed |
| **Google Sheets** | googleapis npm package | Official SDK, well-documented |
| **Excel Export** | SheetJS (xlsx) | Client-side, works offline, exact column layout control |

### Deployment Options (Ranked)

#### Option A: Simplest — Vercel + Supabase (Recommended for MVP)
```
Frontend (React PWA) → Vercel (free tier, auto-deploy from Git)
Backend API → Vercel Serverless Functions (included free)
Database → Supabase PostgreSQL (free: 500MB, 50K monthly active users)
Photos → Supabase Storage (free: 1GB)
Cost: $0/month
```

#### Option B: Google Cloud Run
```
Frontend + Backend → Single Docker container on Cloud Run
Database → Firestore (free: 1GB storage, 50K reads/day)
Photos → Cloud Storage (free: 5GB)
Cost: $0/month (within free tier)
Caveat: Requires GCP project setup, gcloud CLI auth, Dockerfile
Claude CAN help write all the code and Dockerfile, but you'd need to run `gcloud run deploy` yourself or set up GitHub Actions CI/CD
```

#### Option C: Pure Localhost (Personal Use First)
```
Frontend + Backend → Local dev server (npm run dev)
Database → SQLite file on your machine
Photos → Local filesystem
Cost: $0
Caveat: Only works on your machine, no worker access, no sync
Good for: Testing the UI/UX before deploying
```

**Recommendation**: Start with **Option C** (localhost) to nail the UI, then deploy to **Option A** (Vercel + Supabase) when ready for workers.

---

## 6. UI/UX Design Specification

### Layout
```
┌─────────────────────────────────────────────┐
│  [Logo]  Al Laith Inventory    [Export] [👤] │
│  ┌─────────────────────────────────────────┐ │
│  │ 🔍 Search items...                      │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [All] [⚡Electrical] [🧴Dispensers] [🧪Chem]│
│  [🗑️Bins] [❄️AC] [🚻Signs] [🔧Plumbing]    │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  📷      │  │  📷      │  │  📷      │   │
│  │  [PHOTO] │  │  [PHOTO] │  │  [PHOTO] │   │
│  │          │  │          │  │          │   │
│  │ LED Bulb │  │ Dbl Plug │  │ Soap Dis │   │
│  │ 8000K    │  │          │  │ Plain    │   │
│  │   ●239   │  │   ●13    │  │   ●11    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  📷      │  │  📷      │  │  📷      │   │
│  │  [PHOTO] │  │  [PHOTO] │  │  [PHOTO] │   │
│  │ ...      │  │ ...      │  │ ...      │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                               │
│  [हिंदी]                      [+ Add Item]   │
│  (bottom-left, always visible)  (admin only)  │
└─────────────────────────────────────────────┘
```

### Item Detail View (on card tap)
```
┌─────────────────────────────────────────────┐
│  [← Back]           8000K 12w LED Bulb      │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │              [LARGE PHOTO]              │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Category: Electrical > Bulbs > 8000K        │
│  Condition: 239 good                          │
│                                               │
│           ┌─────┐         ┌─────┐            │
│           │     │         │     │            │
│           │  -  │  [239]  │  +  │            │
│           │     │         │     │            │
│           └─────┘         └─────┘            │
│        (large touch      (large touch        │
│         targets)          targets)            │
│                                               │
│  Reason: [Used on site ▼]                    │
│                                               │
│  [Edit Item] (admin only)                    │
│  [View History]                              │
│                                               │
│  [हिंदी]                                     │
└─────────────────────────────────────────────┘
```

### Design Principles
- **Touch targets**: All buttons minimum 48x48px (Google Material guidelines)
- **Photo cards**: Minimum 120x120px photos, 2:3 aspect ratio
- **Colors**: Category-coded with distinct, high-contrast colors
- **Font sizes**: Item names 16px+, quantities 24px+ bold
- **Language toggle**: Persistent bottom-left, never hidden
- **Offline indicator**: Small banner top when offline "📡 Offline — changes will sync"
- **Loading states**: Skeleton cards while photos load
- **Haptic feedback**: Vibration on +/- tap (via Navigator.vibrate API)

---

## 7. Export Specification

The export must exactly match the columns from your `inventory-export-2025-12-28.xlsx`:

| Column | Source in App |
|--------|-------------|
| RowNumber | Auto-increment |
| lId | Item internal ID |
| Short Name | item.shortName |
| Name | item.name |
| Remarks | item.remarks |
| Stock Keeping Unit | item.sku |
| StockMaintain | (nullable) |
| Capacity | (nullable) |
| Used | item.quantity |
| ResourceType | (nullable) |
| TaxType | (nullable) |
| StockLedger | (nullable) |
| StockLedgerIncome | (nullable) |
| StockLedgerExpense | (nullable) |
| LastModifiedBy | item.lastModifiedBy |
| LastModifiedOn | item.lastModifiedOn |
| Created On | item.createdOn |
| HS-Codes | (nullable) |
| Working Height | (nullable) |
| Group Description | "Site Services Workshop" |
| Sub Group Description | item.subGroupDescription |
| Category Description | item.categoryDescription |
| Sub Category Description | item.subCategoryDescription |
| Purchase Month | (nullable) |
| Purchase Year | (nullable) |
| Asset Description | item.assetDescription (e.g., "239 good") |
| Asset Cost | item.assetCost |
| Total Life | (nullable) |
| Assets S. No | (nullable) |
| Revenue Category | (nullable) |
| Asset Type | (nullable) |

---

## 8. Security Best Practices

- **PIN hashing**: bcrypt with salt rounds = 12
- **JWT tokens**: HS256, 24-hour expiry, stored in httpOnly cookie (when online) or secure IndexedDB (offline)
- **HTTPS only**: All deployed versions force TLS
- **Input sanitization**: All user inputs escaped before DB write
- **Photo validation**: Max 5MB per photo, image/* MIME type only, stripped EXIF data
- **Rate limiting**: Max 100 requests/minute per IP on sync endpoint
- **CSP headers**: Strict Content-Security-Policy on all pages
- **No secrets in client code**: API keys stored server-side only

---

## 9. Performance Targets

| Metric | Target |
|--------|--------|
| First load (online) | < 3 seconds |
| Subsequent loads (cached) | < 1 second |
| Offline load | < 500ms |
| Photo grid render (50 items) | < 200ms |
| Stock +/- response | < 50ms (local DB write) |
| Sync cycle | < 5 seconds for 50 items |
| Export generation | < 3 seconds for 500 items |
| Photo capture to display | < 1 second |

---

## 10. Development Phases

### Phase 1: Local MVP (What we build first) — ~2-3 days
- React + Vite + Tailwind + shadcn/ui scaffold
- Dexie.js local database with seed data from your Excel
- Photo card grid with category filters
- Item detail view with +/- buttons
- PIN auth (local only)
- Hindi/English toggle
- Excel export (SheetJS) matching your exact layout
- Service worker for offline caching

### Phase 2: Backend + Sync — ~2-3 days
- Express API with SQLite or Supabase
- Sync engine (push/pull changes)
- Photo upload to cloud storage
- Google Sheets export API integration
- Deploy to Vercel + Supabase (or Cloud Run if preferred)

### Phase 3: Polish — ~1-2 days
- Camera capture optimization
- Offline indicator UI
- Change history view
- Admin item management polish
- Performance testing on real devices
- PWA install prompt

---

## 11. Google Cloud Run — Detailed Assessment

**Can I (Claude) build it?** Yes — I can generate the entire codebase, Dockerfile, and deployment config.

**Can I deploy it via Chrome automation?** Partially:
- I **can** write all code, Dockerfile, cloudbuild.yaml
- I **can** push to a GitHub repo
- I **cannot** safely handle GCP credentials or run `gcloud auth login` through browser automation
- **Best path**: I write a GitHub Actions workflow that auto-deploys on push. You do a one-time GCP setup (create project, enable Cloud Run, create service account key, add it as GitHub secret)

**Cloud Run Architecture:**
```
Docker Container (Cloud Run):
├── /api/* → Express.js REST API
├── /static/* → React PWA (built assets)
├── Database → Cloud Firestore (serverless, free tier)
├── Photos → Cloud Storage (5GB free)
└── Service Worker → Offline caching on client
```

**Verdict**: Cloud Run works great but has more setup friction than Vercel + Supabase. For a personal-use-first approach, localhost → Vercel is faster to get running.

---

## 12. Success Metrics

- A worker who cannot read English can find and adjust an item's stock in under 15 seconds using photos only
- Admin can add a new item with photo in under 60 seconds
- App works fully offline for at least 24 hours without data loss
- Exported Excel matches the original layout column-for-column
- Page loads in under 1 second on a mid-range Android phone (offline)

---

## 13. Constraints & Assumptions

- Workshop has WiFi (intermittent is OK — offline-first handles gaps)
- Workers have smartphones (Android or iOS, any modern browser)
- ~43 items currently, expected to grow to ~200-500 max
- Single workshop location (no multi-site sync needed in MVP)
- Photos are per item type, not per individual unit
- Existing Excel layout is the source of truth for export format

---

*Document generated: March 9, 2026*
*Next step: User approval → Phase 2 (Design)*
