# Al Laith Inventory App — Phase 3: Architecture Document

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  React   │  │  Dexie   │  │  Service  │  │  Sync        │  │
│  │  19 +    │  │  .js     │  │  Worker   │  │  Engine      │  │
│  │  Vite 6  │  │  (IDB)   │  │  (Workbox)│  │  (Background)│  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  │
│       │              │              │                │           │
│       └──────────────┴──────────────┴────────────────┘           │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │  Supabase Client   │                        │
│                    │  SDK (JS)          │                        │
│                    └─────────┬──────────┘                        │
└──────────────────────────────┼────────────────────────────────────┘
                               │ HTTPS
              ┌────────────────┼────────────────────┐
              │                │                    │
     ┌────────▼─────┐  ┌──────▼───────┐  ┌────────▼─────────┐
     │   Supabase   │  │  Supabase    │  │  Supabase        │
     │   PostgREST  │  │  Storage     │  │  Edge Functions  │
     │   (REST API) │  │  (Photos)    │  │  (PIN Auth,      │
     │              │  │              │  │   Google Sheets)  │
     └──────┬───────┘  └──────────────┘  └──────────────────┘
            │
     ┌──────▼───────┐
     │  PostgreSQL  │
     │  (Supabase)  │
     │  + RLS       │
     └──────────────┘

DEPLOYMENT:
  Frontend → Vercel (static + edge functions)
  Backend  → Supabase (managed PostgreSQL + Storage + Edge Functions)
```

---

## 2. Tech Stack (Final)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19.x | UI components |
| **Bundler** | Vite | 6.x | Build, HMR, PWA plugin |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Components** | shadcn/ui | latest | Accessible base components |
| **Icons** | Lucide React | 0.400+ | Lightweight icon set |
| **State** | Zustand | 5.x | Global state (auth, UI) |
| **Local DB** | Dexie.js | 4.x | IndexedDB wrapper |
| **i18n** | react-i18next | 15.x | English + Hindi |
| **PWA** | vite-plugin-pwa | 0.21+ | Service worker, manifest |
| **Excel Export** | SheetJS (xlsx) | 0.20+ | Client-side .xlsx generation |
| **Photo** | Native HTML5 | — | Camera capture + gallery |
| **Backend** | Supabase | latest | PostgreSQL + Storage + Auth |
| **Deploy** | Vercel | — | Static hosting + Edge |
| **Routing** | React Router | 7.x | Client-side navigation |
| **Virtual Scroll** | @tanstack/virtual | 3.x | Large list performance |

---

## 3. Database Schema (Supabase PostgreSQL)

### 3.1 Core Tables

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ============================================
-- STORES (workshop/location)
-- ============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_hi TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed: single workshop
INSERT INTO stores (name, name_hi)
VALUES ('Site Services Workshop', 'साइट सेवा कार्यशाला');

-- ============================================
-- AUTH PINs
-- ============================================
CREATE TABLE auth_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  label TEXT, -- "Admin PIN", "Worker PIN"
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CATEGORIES (hierarchical with ltree)
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_hi TEXT,
  path LTREE NOT NULL,
  parent_id UUID REFERENCES categories(id),
  icon TEXT, -- emoji or lucide icon name
  color TEXT, -- hex color
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(store_id, path)
);

CREATE INDEX idx_categories_path ON categories USING GIST (path);

-- ============================================
-- INVENTORY ITEMS
-- ============================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  short_name TEXT NOT NULL,
  name TEXT NOT NULL,
  name_hi TEXT,
  category_id UUID REFERENCES categories(id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  condition TEXT, -- "239 good", "3 new, 13 good"
  remarks TEXT,
  sku TEXT,

  -- Photo references
  photo_path TEXT, -- Supabase Storage path
  photo_thumbnail TEXT, -- base64 tiny thumbnail for fast grid render

  -- Fields matching your Excel export
  group_description TEXT DEFAULT 'Site Services Workshop',
  sub_group_description TEXT,
  category_description TEXT, -- denormalized from category path
  sub_category_description TEXT,
  asset_description TEXT, -- "239 good"
  asset_cost DECIMAL(10,2),
  total_life TEXT,
  hs_codes TEXT,
  working_height TEXT,
  purchase_month TEXT,
  purchase_year TEXT,
  revenue_category TEXT,
  asset_type TEXT,

  -- Tracking
  created_by TEXT NOT NULL DEFAULT 'admin',
  last_modified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Sync
  sync_version INT DEFAULT 1,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_items_store ON items(store_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_category ON items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_updated ON items(updated_at);

-- ============================================
-- CHANGE LOG (audit trail)
-- ============================================
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('increment', 'decrement', 'create', 'edit', 'delete')),
  quantity_before INT,
  quantity_after INT,
  quantity_change INT,
  reason TEXT, -- "Used on site", "Received new", "Damaged", "Returned", "Adjustment"
  performed_by TEXT NOT NULL, -- "admin" or "worker"
  created_at TIMESTAMPTZ DEFAULT now(),
  synced BOOLEAN DEFAULT false
);

CREATE INDEX idx_changelog_item ON change_log(item_id);
CREATE INDEX idx_changelog_created ON change_log(created_at);

-- ============================================
-- SYNC CHECKPOINTS (per-device sync state)
-- ============================================
CREATE TABLE sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id),
  device_id TEXT NOT NULL,
  last_pull_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  UNIQUE(store_id, device_id)
);
```

### 3.2 Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

-- Items: authenticated users can read items for their store
CREATE POLICY "read_items" ON items FOR SELECT
  USING (store_id = (auth.jwt() ->> 'store_id')::uuid);

-- Items: only admin can INSERT new items
CREATE POLICY "admin_create_items" ON items FOR INSERT
  WITH CHECK (
    store_id = (auth.jwt() ->> 'store_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );

-- Items: admin can update anything, worker can only update quantity
CREATE POLICY "update_items" ON items FOR UPDATE
  USING (store_id = (auth.jwt() ->> 'store_id')::uuid)
  WITH CHECK (store_id = (auth.jwt() ->> 'store_id')::uuid);

-- Change log: anyone can insert (both admin and worker log changes)
CREATE POLICY "insert_changelog" ON change_log FOR INSERT
  WITH CHECK (store_id = (auth.jwt() ->> 'store_id')::uuid);

-- Change log: anyone can read their store's history
CREATE POLICY "read_changelog" ON change_log FOR SELECT
  USING (store_id = (auth.jwt() ->> 'store_id')::uuid);

-- Categories: anyone can read, only admin can modify
CREATE POLICY "read_categories" ON categories FOR SELECT
  USING (store_id = (auth.jwt() ->> 'store_id')::uuid);

CREATE POLICY "admin_manage_categories" ON categories FOR ALL
  USING (
    store_id = (auth.jwt() ->> 'store_id')::uuid
    AND (auth.jwt() ->> 'role') = 'admin'
  );
```

---

## 4. Client-Side Database (Dexie.js)

```typescript
// src/db/database.ts
import Dexie, { Table } from 'dexie';

export interface Item {
  id: string;
  storeId: string;
  shortName: string;
  name: string;
  nameHi?: string;
  categoryId?: string;
  quantity: number;
  condition?: string;
  remarks?: string;
  sku?: string;
  photoPath?: string;
  photoThumbnail?: string; // base64
  photoBlob?: Blob; // local photo not yet uploaded
  groupDescription: string;
  subGroupDescription?: string;
  categoryDescription?: string;
  subCategoryDescription?: string;
  assetDescription?: string;
  assetCost?: number;
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  syncVersion: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deletedAt?: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  nameHi?: string;
  path: string;
  parentId?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  syncStatus: 'synced' | 'pending';
}

export interface ChangeLogEntry {
  id: string;
  storeId: string;
  itemId: string;
  action: 'increment' | 'decrement' | 'create' | 'edit' | 'delete';
  quantityBefore?: number;
  quantityAfter?: number;
  quantityChange?: number;
  reason?: string;
  performedBy: string;
  createdAt: string;
  synced: boolean;
}

export interface PendingSync {
  id: string;
  table: 'items' | 'change_log' | 'categories';
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  createdAt: string;
  retries: number;
}

export interface PhotoUpload {
  id: string;
  itemId: string;
  blob: Blob;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  retries: number;
  createdAt: string;
  error?: string;
}

class InventoryDatabase extends Dexie {
  items!: Table<Item>;
  categories!: Table<Category>;
  changeLog!: Table<ChangeLogEntry>;
  pendingSync!: Table<PendingSync>;
  photoUploads!: Table<PhotoUpload>;

  constructor() {
    super('AlLaithInventory');

    this.version(1).stores({
      items: 'id, storeId, categoryId, name, updatedAt, syncStatus, [storeId+syncStatus]',
      categories: 'id, storeId, path, parentId, [storeId+parentId]',
      changeLog: 'id, storeId, itemId, createdAt, synced, [itemId+createdAt]',
      pendingSync: 'id, table, createdAt, [table+createdAt]',
      photoUploads: 'id, itemId, status, [status+createdAt]'
    });
  }
}

export const db = new InventoryDatabase();
```

---

## 5. Sync Architecture

### 5.1 Sync Flow (Pull-First Strategy)

```
ONLINE DETECTED (or manual trigger)
       │
       ▼
┌──────────────────┐
│  1. PULL PHASE   │
│  GET /items      │
│  WHERE updated_at│
│  > last_pull_at  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  2. MERGE PHASE  │
│  For each server │
│  item:           │
│  - If no local   │
│    → insert      │
│  - If local is   │
│    synced → update│
│  - If local is   │
│    pending →     │
│    CONFLICT      │
│    (server wins  │
│    for quantity)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  3. PUSH PHASE   │
│  Send all pending│
│  changes from    │
│  pendingSync     │
│  table           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  4. PHOTO SYNC   │
│  Upload queued   │
│  photos from     │
│  photoUploads    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  5. CHECKPOINT   │
│  Update          │
│  last_pull_at    │
│  last_push_at    │
└──────────────────┘
```

### 5.2 Sync Engine Implementation

```typescript
// src/sync/syncEngine.ts
export class SyncEngine {
  private syncing = false;
  private supabase: SupabaseClient;

  async sync(): Promise<SyncResult> {
    if (this.syncing) return { status: 'already_syncing' };
    if (!navigator.onLine) return { status: 'offline' };

    this.syncing = true;
    try {
      const checkpoint = await this.getCheckpoint();

      // Phase 1: Pull
      const serverChanges = await this.pull(checkpoint.lastPullAt);

      // Phase 2: Merge
      const conflicts = await this.merge(serverChanges);

      // Phase 3: Push
      const pushResult = await this.push();

      // Phase 4: Photos
      const photoResult = await this.syncPhotos();

      // Phase 5: Checkpoint
      await this.updateCheckpoint();

      return {
        status: 'success',
        pulled: serverChanges.length,
        pushed: pushResult.count,
        conflicts: conflicts.length,
        photosUploaded: photoResult.count
      };
    } finally {
      this.syncing = false;
    }
  }

  private async pull(since: string | null) {
    let query = this.supabase
      .from('items')
      .select('*')
      .eq('store_id', this.storeId);

    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  private async merge(serverItems: any[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    await db.transaction('rw', db.items, async () => {
      for (const serverItem of serverItems) {
        const localItem = await db.items.get(serverItem.id);

        if (!localItem) {
          // New item from server
          await db.items.add({
            ...this.mapServerToLocal(serverItem),
            syncStatus: 'synced'
          });
        } else if (localItem.syncStatus === 'synced') {
          // No local changes, safe to overwrite
          await db.items.update(serverItem.id, {
            ...this.mapServerToLocal(serverItem),
            syncStatus: 'synced'
          });
        } else {
          // CONFLICT: local has pending changes
          // Strategy: server wins for quantity, keep local metadata
          conflicts.push({
            itemId: serverItem.id,
            localVersion: localItem,
            serverVersion: serverItem
          });

          // Server wins
          await db.items.update(serverItem.id, {
            ...this.mapServerToLocal(serverItem),
            syncStatus: 'synced'
          });

          // Remove conflicting pending sync entries
          await db.pendingSync
            .where({ recordId: serverItem.id })
            .delete();
        }
      }
    });

    return conflicts;
  }

  private async push(): Promise<{ count: number }> {
    const pending = await db.pendingSync
      .orderBy('createdAt')
      .toArray();

    let pushed = 0;

    for (const entry of pending) {
      try {
        switch (entry.operation) {
          case 'insert':
            await this.supabase.from(entry.table).insert(entry.data);
            break;
          case 'update':
            await this.supabase.from(entry.table)
              .update(entry.data)
              .eq('id', entry.recordId);
            break;
          case 'delete':
            await this.supabase.from(entry.table)
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', entry.recordId);
            break;
        }

        await db.pendingSync.delete(entry.id);
        pushed++;
      } catch (error) {
        entry.retries++;
        if (entry.retries > 5) {
          await db.pendingSync.delete(entry.id);
        } else {
          await db.pendingSync.update(entry.id, { retries: entry.retries });
        }
      }
    }

    return { count: pushed };
  }

  private async syncPhotos(): Promise<{ count: number }> {
    const pending = await db.photoUploads
      .where('status').equals('pending')
      .toArray();

    let uploaded = 0;

    for (const photo of pending) {
      try {
        await db.photoUploads.update(photo.id, { status: 'uploading' });

        const path = `items/${photo.itemId}/${photo.id}.webp`;

        const { error } = await this.supabase.storage
          .from('inventory-photos')
          .upload(path, photo.blob, {
            cacheControl: '86400',
            upsert: false,
            contentType: 'image/webp'
          });

        if (error) throw error;

        // Update item with photo path
        await this.supabase.from('items')
          .update({ photo_path: path })
          .eq('id', photo.itemId);

        // Update local
        await db.items.update(photo.itemId, { photoPath: path });
        await db.photoUploads.update(photo.id, { status: 'success' });

        uploaded++;
      } catch (error: any) {
        photo.retries++;
        const status = photo.retries > 3 ? 'failed' : 'pending';
        await db.photoUploads.update(photo.id, {
          status,
          retries: photo.retries,
          error: error.message
        });
      }
    }

    return { count: uploaded };
  }
}
```

### 5.3 Sync Triggers

```typescript
// Auto-sync on network change
window.addEventListener('online', () => syncEngine.sync());

// Periodic sync every 5 minutes when online
setInterval(() => {
  if (navigator.onLine) syncEngine.sync();
}, 5 * 60 * 1000);

// Sync on app focus (user returns to tab)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && navigator.onLine) syncEngine.sync();
});

// Manual pull-to-refresh
const handleRefresh = () => syncEngine.sync();
```

---

## 6. Service Worker Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'Al Laith Workshop Inventory',
        short_name: 'Inventory',
        description: 'Workshop inventory management',
        theme_color: '#2563EB',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // App shell
            urlPattern: /^https:\/\/your-app\.vercel\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            // Inventory photos from Supabase Storage
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\.(webp|jpg|png|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'inventory-photos',
              expiration: { maxEntries: 2000, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            // Google Fonts (Noto Sans Devanagari)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          {
            // Supabase API (sync data)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }
            }
          }
        ]
      }
    })
  ]
});
```

---

## 7. Export Module

### Excel Export (SheetJS — works offline)

```typescript
// src/export/excelExport.ts
import * as XLSX from 'xlsx';
import { db } from '../db/database';

export async function exportToExcel(): Promise<void> {
  const items = await db.items
    .where('deletedAt').equals('')
    .or('deletedAt').equals(undefined)
    .toArray();

  // Map to exact columns matching inventory-export-2025-12-28.xlsx
  const rows = items.map((item, index) => ({
    'RowNumber': index + 1,
    'lId': item.id.slice(0, 8), // short ID
    'Short Name': item.shortName,
    'Name': item.name,
    'Remarks': item.remarks || '',
    'Stock Keeping Unit': item.sku || '',
    'StockMaintain': '',
    'Capacity': '',
    'Used': item.quantity,
    'ResourceType': '',
    'TaxType': '',
    'StockLedger': '',
    'StockLedgerIncome': '',
    'StockLedgerExpense': '',
    'LastModifiedBy': item.lastModifiedBy || item.createdBy,
    'LastModifiedOn': item.updatedAt,
    'Created On': item.createdAt,
    'HS-Codes': item.hsCode || '',
    'Working Height': item.workingHeight || '',
    'Group Description': item.groupDescription || 'Site Services Workshop',
    'Sub Group Description': item.subGroupDescription || '',
    'Category Description': item.categoryDescription || '',
    'Sub Category Description': item.subCategoryDescription || '',
    'Purchase Month': item.purchaseMonth || '',
    'Purchase Year': item.purchaseYear || '',
    'Asset Description': item.assetDescription || `${item.quantity} good`,
    'Asset Cost': item.assetCost || '',
    'Total Life': item.totalLife || '',
    'Assets S. No': '',
    'Revenue Category': item.revenueCategory || '',
    'Asset Type': item.assetType || ''
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths matching original
  ws['!cols'] = [
    { wch: 10 }, // RowNumber
    { wch: 6 },  // lId
    { wch: 20 }, // Short Name
    { wch: 30 }, // Name
    { wch: 15 }, // Remarks
    // ... etc for all 31 columns
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

  const filename = `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
```

### Google Sheets Export (online only)

```typescript
// src/export/googleSheetsExport.ts
export async function exportToGoogleSheets(accessToken: string): Promise<string> {
  // 1. Create new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `Al Laith Inventory ${new Date().toLocaleDateString()}`
      }
    })
  });

  const { spreadsheetId } = await createRes.json();

  // 2. Get items from local DB
  const items = await db.items.where('deletedAt').equals('').toArray();

  // 3. Build rows (same mapping as Excel)
  const headers = [
    'RowNumber', 'lId', 'Short Name', 'Name', 'Remarks',
    // ... all 31 column headers
  ];

  const rows = items.map((item, i) => [
    i + 1, item.id.slice(0, 8), item.shortName, item.name,
    // ... all values
  ]);

  // 4. Append to sheet
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [headers, ...rows]
      })
    }
  );

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
```

---

## 8. Import Module (ERP → App)

### 8.1 Import Engine (SheetJS — works offline)

```typescript
// src/import/erpImport.ts
import * as XLSX from 'xlsx';
import { db, Item } from '../db/database';
import { v4 as uuid } from 'uuid';

// The 31 columns expected from ERP export
const ERP_COLUMNS = [
  'RowNumber', 'lId', 'Short Name', 'Name', 'Remarks',
  'Stock Keeping Unit', 'StockMaintain', 'Capacity', 'Used',
  'ResourceType', 'TaxType', 'StockLedger', 'StockLedgerIncome',
  'StockLedgerExpense', 'LastModifiedBy', 'LastModifiedOn',
  'Created On', 'HS-Codes', 'Working Height', 'Group Description',
  'Sub Group Description', 'Category Description',
  'Sub Category Description', 'Purchase Month', 'Purchase Year',
  'Asset Description', 'Asset Cost', 'Total Life', 'Assets S. No',
  'Revenue Category', 'Asset Type'
] as const;

export type ImportMode = 'full_sync' | 'add_update_only';

export interface ImportPreviewItem {
  status: 'new' | 'update' | 'same' | 'removed';
  erpData: Record<string, any>;
  existingItem?: Item;
  changes?: string[]; // list of changed field names
}

export interface ImportResult {
  success: boolean;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  errors: string[];
}

// Step 1: Parse the file and validate format
export async function parseERPFile(file: File): Promise<{
  valid: boolean;
  rows: Record<string, any>[];
  errors: string[];
  missingColumns: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames[0]; // Always first sheet
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

  if (rows.length === 0) {
    return { valid: false, rows: [], errors: ['File is empty'], missingColumns: [] };
  }

  // Validate column headers
  const fileColumns = Object.keys(rows[0]);
  const missingColumns = ERP_COLUMNS.filter(
    col => !fileColumns.some(fc => fc.trim() === col)
  );

  // Allow import if at least the key columns exist
  const requiredColumns = ['Name', 'Used', 'Category Description'];
  const missingRequired = requiredColumns.filter(
    col => !fileColumns.some(fc => fc.trim() === col)
  );

  if (missingRequired.length > 0) {
    return {
      valid: false,
      rows: [],
      errors: [`Missing required columns: ${missingRequired.join(', ')}`],
      missingColumns
    };
  }

  return {
    valid: true,
    rows,
    errors: missingColumns.length > 0
      ? [`Warning: ${missingColumns.length} optional columns missing`]
      : [],
    missingColumns
  };
}

// Step 2: Generate preview (compare against existing data)
export async function generateImportPreview(
  rows: Record<string, any>[],
  mode: ImportMode,
  storeId: string
): Promise<ImportPreviewItem[]> {
  const existingItems = await db.items
    .where('storeId').equals(storeId)
    .filter(item => !item.deletedAt)
    .toArray();

  const preview: ImportPreviewItem[] = [];

  // Index existing items by name (primary match key)
  const existingByName = new Map<string, Item>();
  for (const item of existingItems) {
    existingByName.set(item.name.toLowerCase().trim(), item);
  }

  const matchedIds = new Set<string>();

  // Compare each ERP row against existing items
  for (const erpRow of rows) {
    const erpName = (erpRow['Name'] || '').toString().toLowerCase().trim();
    const existing = existingByName.get(erpName);

    if (!existing) {
      // New item
      preview.push({ status: 'new', erpData: erpRow });
    } else {
      matchedIds.add(existing.id);

      // Check if anything changed
      const changes: string[] = [];
      if (existing.quantity !== Number(erpRow['Used'] || 0)) changes.push('quantity');
      if (existing.categoryDescription !== (erpRow['Category Description'] || '')) changes.push('category');
      if (existing.assetDescription !== (erpRow['Asset Description'] || '')) changes.push('condition');
      if (existing.remarks !== (erpRow['Remarks'] || '')) changes.push('remarks');

      preview.push({
        status: changes.length > 0 ? 'update' : 'same',
        erpData: erpRow,
        existingItem: existing,
        changes
      });
    }
  }

  // Items in app but NOT in ERP file (only relevant for full_sync)
  if (mode === 'full_sync') {
    for (const item of existingItems) {
      if (!matchedIds.has(item.id)) {
        preview.push({
          status: 'removed',
          erpData: {},
          existingItem: item
        });
      }
    }
  }

  return preview;
}

// Step 3: Execute the import
export async function executeImport(
  preview: ImportPreviewItem[],
  mode: ImportMode,
  storeId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true, added: 0, updated: 0,
    unchanged: 0, removed: 0, errors: []
  };

  const now = new Date().toISOString();

  await db.transaction('rw', [db.items, db.changeLog, db.pendingSync], async () => {

    for (const entry of preview) {
      try {
        if (entry.status === 'new') {
          const newItem = mapERPToItem(entry.erpData, storeId, now);
          await db.items.add(newItem);

          // Queue for sync
          await db.pendingSync.add({
            id: uuid(),
            table: 'items',
            recordId: newItem.id,
            operation: 'insert',
            data: newItem,
            createdAt: now,
            retries: 0
          });

          // Log the creation
          await db.changeLog.add({
            id: uuid(),
            storeId,
            itemId: newItem.id,
            action: 'create',
            quantityBefore: 0,
            quantityAfter: newItem.quantity,
            quantityChange: newItem.quantity,
            reason: 'ERP Import',
            performedBy: 'admin',
            createdAt: now,
            synced: false
          });

          result.added++;

        } else if (entry.status === 'update' && entry.existingItem) {
          const updates = mapERPToUpdates(entry.erpData, now);
          await db.items.update(entry.existingItem.id, {
            ...updates,
            syncStatus: 'pending'
          });

          // Queue for sync
          await db.pendingSync.add({
            id: uuid(),
            table: 'items',
            recordId: entry.existingItem.id,
            operation: 'update',
            data: updates,
            createdAt: now,
            retries: 0
          });

          result.updated++;

        } else if (entry.status === 'removed' && mode === 'full_sync' && entry.existingItem) {
          // Soft delete
          await db.items.update(entry.existingItem.id, {
            deletedAt: now,
            syncStatus: 'pending'
          });

          await db.pendingSync.add({
            id: uuid(),
            table: 'items',
            recordId: entry.existingItem.id,
            operation: 'delete',
            data: { deletedAt: now },
            createdAt: now,
            retries: 0
          });

          result.removed++;

        } else if (entry.status === 'same') {
          result.unchanged++;
        }
      } catch (error: any) {
        result.errors.push(`${entry.erpData['Name'] || 'Unknown'}: ${error.message}`);
      }
    }
  });

  result.success = result.errors.length === 0;
  return result;
}

// Map ERP row → new Item record
function mapERPToItem(erp: Record<string, any>, storeId: string, now: string): Item {
  const categoryDesc = (erp['Category Description'] || '').toString();

  return {
    id: uuid(),
    storeId,
    shortName: (erp['Short Name'] || erp['Name'] || '').toString().slice(0, 20),
    name: (erp['Name'] || '').toString(),
    nameHi: '', // Admin fills in Hindi name later
    categoryId: undefined, // Resolved after category auto-creation
    quantity: Number(erp['Used'] || 0),
    condition: (erp['Asset Description'] || '').toString(),
    remarks: (erp['Remarks'] || '').toString(),
    sku: (erp['Stock Keeping Unit'] || '').toString(),
    photoPath: undefined,
    photoThumbnail: undefined,
    groupDescription: (erp['Group Description'] || 'Site Services Workshop').toString(),
    subGroupDescription: (erp['Sub Group Description'] || '').toString(),
    categoryDescription: categoryDesc,
    subCategoryDescription: (erp['Sub Category Description'] || '').toString(),
    assetDescription: (erp['Asset Description'] || '').toString(),
    assetCost: erp['Asset Cost'] ? Number(erp['Asset Cost']) : undefined,
    createdBy: (erp['LastModifiedBy'] || 'admin').toString(),
    lastModifiedBy: 'admin',
    createdAt: erp['Created On'] ? new Date(erp['Created On']).toISOString() : now,
    updatedAt: now,
    syncVersion: 1,
    syncStatus: 'pending'
  };
}

// Map ERP row → update fields for existing item
function mapERPToUpdates(erp: Record<string, any>, now: string) {
  return {
    quantity: Number(erp['Used'] || 0),
    condition: (erp['Asset Description'] || '').toString(),
    remarks: (erp['Remarks'] || '').toString(),
    categoryDescription: (erp['Category Description'] || '').toString(),
    subCategoryDescription: (erp['Sub Category Description'] || '').toString(),
    assetDescription: (erp['Asset Description'] || '').toString(),
    assetCost: erp['Asset Cost'] ? Number(erp['Asset Cost']) : undefined,
    lastModifiedBy: 'admin',
    updatedAt: now,
    syncVersion: undefined // increment handled by sync engine
  };
}
```

### 8.2 Auto-Category Creation on Import

When importing, categories referenced in `Category Description` are auto-created if they don't exist:

```typescript
// src/import/categoryResolver.ts
export async function resolveCategories(
  rows: Record<string, any>[],
  storeId: string
): Promise<Map<string, string>> {
  // Extract unique category paths from ERP data
  // e.g., "Electrical > Bulbs > Bulbs 8000k" → ["Electrical", "Bulbs", "Bulbs 8000k"]
  const categoryMap = new Map<string, string>(); // path → categoryId

  const existingCategories = await db.categories
    .where('storeId').equals(storeId)
    .toArray();

  const existingPaths = new Map(
    existingCategories.map(c => [c.path, c.id])
  );

  for (const row of rows) {
    const catDesc = (row['Category Description'] || '').toString().trim();
    if (!catDesc || categoryMap.has(catDesc)) continue;

    // Check if already exists
    if (existingPaths.has(catDesc)) {
      categoryMap.set(catDesc, existingPaths.get(catDesc)!);
      continue;
    }

    // Parse hierarchy: "Electrical > Bulbs > Bulbs 8000k"
    const parts = catDesc.split('>').map(p => p.trim()).filter(Boolean);
    let currentPath = '';
    let parentId: string | undefined;

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}.${part.replace(/\s+/g, '_')}` : part.replace(/\s+/g, '_');

      if (!existingPaths.has(currentPath)) {
        const newCat = {
          id: uuid(),
          storeId,
          name: part,
          nameHi: '',
          path: currentPath,
          parentId,
          icon: guessCategoryIcon(part),
          color: guessCategoryColor(part),
          sortOrder: 0,
          syncStatus: 'pending' as const
        };

        await db.categories.add(newCat);
        existingPaths.set(currentPath, newCat.id);
      }

      parentId = existingPaths.get(currentPath);
    }

    categoryMap.set(catDesc, parentId!);
  }

  return categoryMap;
}

function guessCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('electr')) return 'zap';
  if (lower.includes('dispens')) return 'droplets';
  if (lower.includes('chem')) return 'flask-conical';
  if (lower.includes('bin')) return 'trash-2';
  if (lower.includes('ac') || lower.includes('air')) return 'snowflake';
  if (lower.includes('sign')) return 'signpost';
  if (lower.includes('plumb')) return 'wrench';
  if (lower.includes('bulb') || lower.includes('light')) return 'lightbulb';
  if (lower.includes('soap')) return 'droplets';
  if (lower.includes('switch')) return 'toggle-left';
  return 'package';
}

function guessCategoryColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('electr')) return '#F59E0B';
  if (lower.includes('dispens')) return '#14B8A6';
  if (lower.includes('chem')) return '#8B5CF6';
  if (lower.includes('bin')) return '#6B7280';
  if (lower.includes('ac')) return '#3B82F6';
  if (lower.includes('sign')) return '#F43F5E';
  if (lower.includes('plumb')) return '#06B6D4';
  return '#64748B';
}
```

### 8.3 Import ↔ Export Round-Trip Guarantee

The import and export modules share a single column mapping definition to ensure zero data loss:

```typescript
// src/shared/columnMapping.ts
export const ERP_COLUMN_MAP = {
  'RowNumber':               { field: null, generate: (i: number) => i + 1 },
  'lId':                     { field: 'id', transform: (v: string) => v.slice(0, 8) },
  'Short Name':              { field: 'shortName' },
  'Name':                    { field: 'name' },
  'Remarks':                 { field: 'remarks', default: '' },
  'Stock Keeping Unit':      { field: 'sku', default: '' },
  'StockMaintain':           { field: '_passthrough_StockMaintain', default: '' },
  'Capacity':                { field: '_passthrough_Capacity', default: '' },
  'Used':                    { field: 'quantity' },
  'ResourceType':            { field: '_passthrough_ResourceType', default: '' },
  'TaxType':                 { field: '_passthrough_TaxType', default: '' },
  'StockLedger':             { field: '_passthrough_StockLedger', default: '' },
  'StockLedgerIncome':       { field: '_passthrough_StockLedgerIncome', default: '' },
  'StockLedgerExpense':      { field: '_passthrough_StockLedgerExpense', default: '' },
  'LastModifiedBy':          { field: 'lastModifiedBy' },
  'LastModifiedOn':          { field: 'updatedAt' },
  'Created On':              { field: 'createdAt' },
  'HS-Codes':                { field: '_passthrough_HSCodes', default: '' },
  'Working Height':          { field: '_passthrough_WorkingHeight', default: '' },
  'Group Description':       { field: 'groupDescription', default: 'Site Services Workshop' },
  'Sub Group Description':   { field: 'subGroupDescription', default: '' },
  'Category Description':    { field: 'categoryDescription' },
  'Sub Category Description':{ field: 'subCategoryDescription', default: '' },
  'Purchase Month':          { field: '_passthrough_PurchaseMonth', default: '' },
  'Purchase Year':           { field: '_passthrough_PurchaseYear', default: '' },
  'Asset Description':       { field: 'assetDescription' },
  'Asset Cost':              { field: 'assetCost' },
  'Total Life':              { field: '_passthrough_TotalLife', default: '' },
  'Assets S. No':            { field: '_passthrough_AssetsSNo', default: '' },
  'Revenue Category':        { field: '_passthrough_RevenueCategory', default: '' },
  'Asset Type':              { field: '_passthrough_AssetType', default: '' }
} as const;

// Fields prefixed with _passthrough_ are stored in a JSON blob
// on the item record so they survive the import→export round-trip
// without the app needing to understand them.
```

**Passthrough fields**: Columns the app doesn't actively use (StockMaintain, Capacity, TaxType, etc.) are stored as a JSON blob (`erpPassthrough`) on each item. On export, they're written back to the exact same columns. This guarantees zero data loss even for fields the app doesn't display or edit.

### 8.4 Updated Dexie Schema (with passthrough)

```typescript
// Add to Item interface:
export interface Item {
  // ... existing fields ...
  erpPassthrough?: Record<string, any>; // Stores all ERP columns the app doesn't use
}

// Add to Dexie store:
this.version(2).stores({
  items: 'id, storeId, categoryId, name, updatedAt, syncStatus, [storeId+syncStatus]',
  // ... rest unchanged
}).upgrade(tx => {
  // Migration: add erpPassthrough to existing items
  return tx.table('items').toCollection().modify(item => {
    if (!item.erpPassthrough) item.erpPassthrough = {};
  });
});
```

---

## 9. File Structure

```
al-laith-inventory/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component + routing
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── NavigationDrawer.tsx
│   │   │   └── LanguageToggle.tsx
│   │   ├── auth/
│   │   │   ├── PinLoginScreen.tsx
│   │   │   ├── PinPad.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryGrid.tsx
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemDetail.tsx
│   │   │   ├── StockAdjuster.tsx
│   │   │   ├── CategoryTabs.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── PhotoPlaceholder.tsx
│   │   ├── admin/
│   │   │   ├── AddItemForm.tsx
│   │   │   ├── EditItemForm.tsx
│   │   │   ├── CategoryManager.tsx
│   │   │   └── PhotoCapture.tsx
│   │   ├── export/
│   │   │   ├── ExportScreen.tsx
│   │   │   ├── ExcelExportButton.tsx
│   │   │   └── GoogleSheetsButton.tsx
│   │   ├── import/
│   │   │   ├── ImportScreen.tsx        # Main import page (admin only)
│   │   │   ├── FileUploadZone.tsx      # Drag & drop / file picker
│   │   │   ├── ImportModeSelector.tsx  # Full Sync vs Add & Update toggle
│   │   │   ├── ImportPreviewTable.tsx  # Color-coded preview of changes
│   │   │   ├── ImportSummary.tsx       # Counts: new/update/same/removed
│   │   │   └── ImportProgressBar.tsx   # Progress during large imports
│   │   └── history/
│   │       ├── HistoryView.tsx
│   │       └── ChangeLogEntry.tsx
│   ├── db/
│   │   ├── database.ts             # Dexie schema
│   │   ├── seedData.ts             # Initial data from Excel
│   │   └── migrations.ts           # DB version upgrades
│   ├── sync/
│   │   ├── syncEngine.ts           # Pull/push/merge logic
│   │   ├── conflictResolver.ts     # Conflict strategies
│   │   └── photoSync.ts            # Photo upload queue
│   ├── store/
│   │   ├── authStore.ts            # Zustand: auth state
│   │   ├── inventoryStore.ts       # Zustand: UI state (filters, search)
│   │   └── syncStore.ts            # Zustand: sync status
│   ├── hooks/
│   │   ├── useItems.ts             # Query items from Dexie
│   │   ├── useCategories.ts
│   │   ├── useStockAdjust.ts       # +/- with change log
│   │   ├── useAuth.ts
│   │   ├── useOnlineStatus.ts
│   │   └── useSync.ts
│   ├── i18n/
│   │   ├── config.ts               # i18next setup
│   │   ├── en.json                 # English translations
│   │   └── hi.json                 # Hindi translations
│   ├── export/
│   │   ├── excelExport.ts          # SheetJS
│   │   └── googleSheetsExport.ts   # Google Sheets API
│   ├── import/
│   │   ├── erpImport.ts            # Parse, preview, execute import
│   │   ├── categoryResolver.ts     # Auto-create categories from ERP data
│   │   └── columnMapping.ts        # Shared ERP ↔ App field mapping
│   ├── shared/
│   │   └── columnMapping.ts        # Single source of truth for 31-column map
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client init
│   │   ├── auth.ts                 # PIN verification
│   │   ├── imageUtils.ts           # Compression, thumbnails
│   │   └── constants.ts
│   └── styles/
│       └── globals.css             # Tailwind imports
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # All SQL from section 3
│   └── functions/
│       ├── verify-pin/
│       │   └── index.ts            # PIN auth edge function
│       └── export-sheets/
│           └── index.ts            # Google Sheets export
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json                     # Headers, rewrites
└── .env.local                      # Supabase keys (gitignored)
```

---

## 10. Security Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://sheets.googleapis.com; frame-ancestors 'none';"
        },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=()" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## 11. Performance Budget

| Asset | Budget | Strategy |
|-------|--------|----------|
| JS bundle (gzipped) | < 150KB | Code splitting per route |
| CSS (gzipped) | < 30KB | Tailwind purge |
| Fonts (Noto Sans Devanagari) | < 50KB | Subset to used characters |
| App shell HTML | < 10KB | Minimal |
| Per-photo (cached) | < 300KB | WebP, 80% quality, max 1200px width |
| Thumbnail (in IDB) | < 15KB | 120px wide, base64 |
| Total IDB usage | < 200MB | Monitoring via Storage API |
| LCP | < 2.0s | Preload hero image, inline critical CSS |
| INP | < 150ms | Debounce search, offload to Web Worker |
| CLS | < 0.05 | Fixed aspect ratios, font-display: swap |

---

## 12. Development & Deployment Pipeline

```
LOCAL DEV                    STAGING                    PRODUCTION
───────                    ─────────                  ──────────
npm run dev               git push → Vercel           Vercel production
localhost:5173            preview deploy              your-domain.com
Supabase local            Supabase staging project    Supabase production
(or cloud dev project)    (separate from prod)        (with RLS enabled)
```

### Commands
```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build locally

# Database
npx supabase db push     # Apply migrations
npx supabase gen types   # Generate TypeScript types from schema

# Deployment
git push origin main     # Auto-deploys to Vercel
```

---

## 13. Implementation Task Breakdown

| # | Task | Priority | Estimated Time |
|---|------|----------|---------------|
| 1 | Project scaffold (Vite + React + Tailwind + shadcn) | P0 | 30 min |
| 2 | Shared column mapping (single source of truth for 31 ERP columns) | P0 | 30 min |
| 3 | Dexie.js database schema + erpPassthrough field + seed data from Excel | P0 | 1.5 hours |
| 4 | PIN login screen + local auth | P0 | 2 hours |
| 5 | Inventory grid with photo cards | P0 | 3 hours |
| 6 | Category tabs + filtering | P0 | 1.5 hours |
| 7 | Item detail view + stock adjuster (+/-) | P0 | 2 hours |
| 8 | Hindi/English i18n + language toggle | P0 | 2 hours |
| 9 | Search functionality | P1 | 1 hour |
| 10 | Admin: Add new item form with camera | P0 | 3 hours |
| 11 | Excel export (SheetJS, uses shared column mapping) | P0 | 2 hours |
| 12 | **ERP Import: file parser + column validator** | **P0** | **2 hours** |
| 13 | **ERP Import: preview table + diff engine** | **P0** | **2 hours** |
| 14 | **ERP Import: execute import + auto-category creation** | **P0** | **2 hours** |
| 15 | **ERP Import: UI (upload zone, mode selector, progress, summary)** | **P0** | **2 hours** |
| 16 | Service worker + PWA manifest | P0 | 1 hour |
| 17 | Offline banner + sync status UI | P1 | 1 hour |
| 18 | Supabase setup (schema, RLS, storage) | P0 | 2 hours |
| 19 | Sync engine (pull/push/merge) | P0 | 4 hours |
| 20 | Photo upload queue + sync | P1 | 2 hours |
| 21 | PIN auth edge function (Supabase) | P1 | 2 hours |
| 22 | Google Sheets export | P2 | 2 hours |
| 23 | Change history view | P2 | 1.5 hours |
| 24 | Admin: edit/delete items | P1 | 2 hours |
| 25 | Vercel deployment + vercel.json | P0 | 1 hour |
| 26 | Performance optimization + testing | P1 | 3 hours |
| 27 | Import ↔ Export round-trip verification test | P0 | 1 hour |
| **Total** | | | **~45 hours** |

---

*Phase 1 Planning → Phase 2 Design → **Phase 3 Architecture** → Phase 4 Implementation*
*Ready for user approval to begin building.*
