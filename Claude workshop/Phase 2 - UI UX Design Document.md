# Al Laith Inventory App — Phase 2: UI/UX Design Document

---

## 1. Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Picture-first** | Photos occupy 65-75% of every card. Grid is the default view, not tables. |
| **Thumb-friendly** | All touch targets 48x48px minimum. +/- buttons 56px. No tiny icons. |
| **Multilingual** | Hindi (Devanagari) + English. Toggle always visible bottom-left. No text-only navigation. |
| **Offline-aware** | Subtle banner when offline. All features work. No blocking modals. |
| **Speed** | Skeleton cards while loading. Virtual scroll for 500+ items. LCP < 2s. |
| **Minimal cognitive load** | Category colors + icons. Big numbers. One action per screen. |

---

## 2. Typography

### Font Stack
```css
--font-latin: 'Inter', system-ui, -apple-system, sans-serif;
--font-hindi: 'Noto Sans Devanagari', 'Mukta', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Scale (Mobile-First)
| Element | English | Hindi | Weight |
|---------|---------|-------|--------|
| Page title | 20px | 22px | 700 |
| Card item name | 14px | 16px | 600 |
| Quantity badge | 24px | 24px | 800 |
| Category label | 12px | 14px | 500 |
| Body text | 14px | 16px | 400 |
| Button text | 14px | 16px | 600 |
| Caption | 12px | 13px | 400 |

**Hindi needs ~10-15% larger font size** due to Devanagari script complexity and headline stroke.

**Line height**: 1.5 for Latin, 1.6 for Devanagari (more vertical space needed).

---

## 3. Color System

### Category Colors (8 Primary)
| Category | Color | Hex | Icon |
|----------|-------|-----|------|
| Electrical | Amber | #F59E0B | ⚡ |
| Dispensers | Teal | #14B8A6 | 🧴 |
| Chemicals | Purple | #8B5CF6 | 🧪 |
| Bins | Gray | #6B7280 | 🗑️ |
| AC | Blue | #3B82F6 | ❄️ |
| Signs | Rose | #F43F5E | 🚻 |
| Plumbing | Cyan | #06B6D4 | 🔧 |
| Other | Slate | #64748B | 📦 |

### Status Colors
| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| In Stock | Green | #10B981 | Quantity > minimum |
| Low Stock | Amber | #F59E0B | Quantity ≤ minimum but > 0 |
| Out of Stock | Red | #EF4444 | Quantity = 0 |
| Synced | Green dot | #10B981 | Item synced to server |
| Pending Sync | Orange dot | #F97316 | Changes waiting to upload |
| Offline | Slate | #475569 | Banner background |

### Surface Colors
| Surface | Light Mode | Dark Mode (future) |
|---------|-----------|-------------------|
| Background | #F8FAFC | #0F172A |
| Card | #FFFFFF | #1E293B |
| Card hover | #F1F5F9 | #334155 |
| Border | #E2E8F0 | #334155 |
| Primary | #2563EB | #3B82F6 |
| Primary text | #FFFFFF | #FFFFFF |

---

## 4. Screen-by-Screen Wireframes

### 4.1 PIN Login Screen
```
┌─────────────────────────────────┐
│                                 │
│         [Al Laith Logo]         │
│                                 │
│    Workshop Inventory System    │
│    कार्यशाला सूची प्रणाली        │
│                                 │
│     ┌─────────────────────┐     │
│     │  ● ● ● ○ ○ ○       │     │
│     │  Enter your PIN     │     │
│     │  अपना पिन दर्ज करें    │     │
│     └─────────────────────┘     │
│                                 │
│     ┌───┐ ┌───┐ ┌───┐         │
│     │ 1 │ │ 2 │ │ 3 │         │
│     └───┘ └───┘ └───┘         │
│     ┌───┐ ┌───┐ ┌───┐         │
│     │ 4 │ │ 5 │ │ 6 │         │
│     └───┘ └───┘ └───┘         │
│     ┌───┐ ┌───┐ ┌───┐         │
│     │ 7 │ │ 8 │ │ 9 │         │
│     └───┘ └───┘ └───┘         │
│           ┌───┐ ┌───┐         │
│           │ 0 │ │ ⌫ │         │
│           └───┘ └───┘         │
│                                 │
│  [हिंदी]                        │
└─────────────────────────────────┘
```
- Custom numeric keypad (no system keyboard)
- PIN dots fill as digits entered
- Haptic vibration on each tap
- 5 failed attempts → 15 min lockout with countdown
- Language toggle visible even on login

### 4.2 Main Inventory Grid (Home)
```
┌─────────────────────────────────────────────┐
│ 📡 Offline — changes will sync when online  │ ← Only shows when offline
├─────────────────────────────────────────────┤
│  [☰]  Al Laith Inventory    [📤] [👤Admin]  │
│  ┌─────────────────────────────────────────┐ │
│  │ 🔍 Search items / आइटम खोजें...         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌────┐ │
│  │ All ││⚡Elec││🧴Disp││🧪Chem││🗑Bins││❄AC │ │
│  └─────┘└─────┘└─────┘└─────┘└─────┘└────┘ │
│  (horizontally scrollable pill tabs)          │
│                                               │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌──────┐ │ │
│  │ │       │ │  │ │       │ │  │ │      │ │ │
│  │ │ PHOTO │ │  │ │ PHOTO │ │  │ │PHOTO │ │ │
│  │ │       │ │  │ │       │ │  │ │      │ │ │
│  │ └───────┘ │  │ └───────┘ │  │ └──────┘ │ │
│  │ LED Bulb  │  │ Dbl Plug  │  │ Soap Dis │ │
│  │ 8000K 12w │  │           │  │ Plain    │ │
│  │ ⚡Electrical│  │ ⚡Electrical│  │🧴Dispens│ │
│  │  ┌──┐     │  │  ┌──┐     │  │  ┌──┐   │ │
│  │  │239│ ●  │  │  │13│ ●   │  │  │11│ ● │ │
│  │  └──┘     │  │  └──┘     │  │  └──┘   │ │
│  └───────────┘  └───────────┘  └──────────┘ │
│                                               │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌──────┐ │ │
│  │ │  📷   │ │  │ │       │ │  │ │      │ │ │
│  │ │  No   │ │  │ │ PHOTO │ │  │ │PHOTO │ │ │
│  │ │ Photo │ │  │ │       │ │  │ │      │ │ │
│  │ └───────┘ │  │ └───────┘ │  │ └──────┘ │ │
│  │ Door Arm  │  │ Sign Box  │  │ 1/2 Sw   │ │
│  │ Geeyes    │  │ Female    │  │          │ │
│  │ ⬜Other    │  │ 🚻Signs   │  │⚡Electri │ │
│  │  ┌──┐     │  │  ┌──┐     │  │  ┌──┐   │ │
│  │  │ 5│ ●   │  │  │ 2│ ⚠   │  │  │13│ ● │ │
│  │  └──┘     │  │  └──┘     │  │  └──┘   │ │
│  └───────────┘  └───────────┘  └──────────┘ │
│                                               │
│  [हिंदी]                    [+ Add Item]     │
│  (always visible)            (admin only)     │
└─────────────────────────────────────────────┘

● = synced (green dot)
⚠ = low stock (amber)
🔴 = out of stock (red badge)
```

**Card Component Spec:**
- Card width: responsive (calc((100vw - 48px) / 3) on mobile = ~104px)
- Photo area: 4:3 aspect ratio, `object-fit: cover`, rounded-t-lg
- Text area: item name (14px, 2 lines max, truncate), category pill (10px)
- Quantity badge: bottom-left overlay, 24px bold, colored circle background
- Sync status: tiny 8px dot bottom-right
- Tap → navigate to Item Detail

**No Photo Placeholder:**
- Light gray (#F1F5F9) background
- Camera icon (32px) centered
- Dashed 2px border (#CBD5E1)

### 4.3 Item Detail View
```
┌─────────────────────────────────────────────┐
│  [← Back]        8000K 12w LED Bulb         │
│                  8000K 12w एलईडी बल्ब         │
├─────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │                                         │ │
│  │            [ LARGE PHOTO ]              │ │
│  │            (swipeable if multiple)      │ │
│  │                                         │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│   ○ ○ ● ○  (photo pagination dots)          │
│                                               │
│  ┌──────────────────────────────────────┐    │
│  │  ⚡ Electrical > Bulbs > 8000K       │    │
│  │  Condition: 239 good                  │    │
│  │  स्थिति: 239 अच्छा                      │    │
│  └──────────────────────────────────────┘    │
│                                               │
│         STOCK ADJUSTMENT                      │
│         स्टॉक समायोजन                          │
│                                               │
│   ┌─────────┐            ┌─────────┐         │
│   │         │            │         │         │
│   │    −    │   [ 239 ]  │    +    │         │
│   │         │            │         │         │
│   └─────────┘            └─────────┘         │
│   (56x56px, red)  (32px bold)  (56x56px, green)│
│                                               │
│   Reason / कारण:                              │
│   ┌─────────────────────────────────────┐    │
│   │  Used on site / साइट पर उपयोग   ▼   │    │
│   └─────────────────────────────────────┘    │
│   Options: Used on site, Received new,        │
│   Damaged, Returned, Adjustment               │
│                                               │
│   ┌──────────────┐  ┌──────────────────┐     │
│   │ 📋 History   │  │ ✏️ Edit (admin)  │     │
│   │    इतिहास     │  │   संपादित करें     │     │
│   └──────────────┘  └──────────────────┘     │
│                                               │
│  [हिंदी]                                      │
└─────────────────────────────────────────────┘
```

**+/- Button Spec:**
- Size: 56x56px (exceeds 48px min)
- Minus: Red background (#EF4444), white "−" icon, 28px
- Plus: Green background (#10B981), white "+" icon, 28px
- Quantity display: 32px, bold, centered between buttons
- Haptic vibration: 10ms on tap
- Long-press: hold to increment/decrement continuously (200ms interval)
- Quantity animates on change (scale bounce 1.0 → 1.2 → 1.0, 150ms)

### 4.4 Admin: Add New Item
```
┌─────────────────────────────────────────────┐
│  [← Cancel]      Add New Item                │
│                  नया आइटम जोड़ें                │
├─────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │        📷 Tap to take photo             │ │
│  │        फोटो लेने के लिए टैप करें           │ │
│  │                                         │ │
│  │    [🖼️ Gallery]  or  [📸 Camera]        │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Item Name (EN) *                             │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  आइटम का नाम (HI)                             │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Category / श्रेणी *                           │
│  ┌─────────────────────────────────────────┐ │
│  │  ⚡ Electrical                      ▼   │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Subcategory / उपश्रेणी                       │
│  ┌─────────────────────────────────────────┐ │
│  │  💡 Bulbs                           ▼   │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Initial Quantity / प्रारंभिक मात्रा *          │
│  ┌──────────┐                                 │
│  │  0       │                                 │
│  └──────────┘                                 │
│                                               │
│  Condition / स्थिति                             │
│  ┌─────────────────────────────────────────┐ │
│  │  Good / अच्छा                       ▼   │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │          💾 Save Item / सेव करें         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [हिंदी]                                      │
└─────────────────────────────────────────────┘
```

- Camera opens natively via `<input type="file" accept="image/*" capture="environment">`
- Photo preview shows immediately after capture
- Category dropdown cascades: select parent → subcategory options update
- Form validates: name required, quantity ≥ 0, category required
- Save → immediate local write → background sync

### 4.5 Export Screen
```
┌─────────────────────────────────────────────┐
│  [← Back]          Export / निर्यात           │
├─────────────────────────────────────────────┤
│                                               │
│  Export your full inventory as a spreadsheet  │
│  अपनी पूरी सूची स्प्रेडशीट के रूप में निर्यात करें │
│                                               │
│  Items to export: 43                          │
│  Last synced: 2 minutes ago                   │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │   📊 Export as Excel (.xlsx)            │ │
│  │   एक्सेल के रूप में निर्यात करें             │ │
│  │                                         │ │
│  │   Downloads file to your device         │ │
│  │   Works offline ✓                       │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │   📋 Export to Google Sheets            │ │
│  │   Google शीट में निर्यात करें               │ │
│  │                                         │ │
│  │   Creates a new Google Sheet            │ │
│  │   Requires internet ⚠️                  │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Export includes all 31 columns matching      │
│  your existing spreadsheet layout.            │
│                                               │
│  [हिंदी]                                      │
└─────────────────────────────────────────────┘
```

### 4.6 Import from ERP (Admin Only)
```
┌─────────────────────────────────────────────┐
│  [← Back]      Import from ERP               │
│                ERP से आयात करें                │
├─────────────────────────────────────────────┤
│                                               │
│  Upload your ERP inventory export (.xlsx)     │
│  अपना ERP इन्वेंटरी एक्सपोर्ट अपलोड करें        │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │     📁 Tap to select file               │ │
│  │     फ़ाइल चुनने के लिए टैप करें            │ │
│  │                                         │ │
│  │     Accepts: .xlsx, .xls                │ │
│  │     Works offline ✓                     │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ── After file selected: ──                   │
│                                               │
│  ✅ File loaded: inventory-export-2025-12.xlsx│
│  📊 Found: 43 items in 12 categories         │
│                                               │
│  Import Mode / आयात मोड:                     │
│  ┌─────────────────────────────────────────┐ │
│  │  ○  Full Sync / पूर्ण सिंक               │ │
│  │     Add new items, update existing,     │ │
│  │     mark missing as removed             │ │
│  │                                         │ │
│  │  ●  Add & Update Only / जोड़ें और अपडेट  │ │
│  │     Add new, update existing,           │ │
│  │     keep items not in file              │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ── Preview (scrollable table): ──            │
│  ┌─────────────────────────────────────────┐ │
│  │ Status │ Name           │ Qty │ Category│ │
│  │────────┼────────────────┼─────┼─────────│ │
│  │ 🆕 NEW │ Al laith sign  │  4  │ Signs   │ │
│  │ 🔄 UPD │ LED Bulb 8000K │ 239 │ Electr  │ │
│  │ 🔄 UPD │ Double plug    │  13 │ Electr  │ │
│  │ ✅ SAME│ Smoke alarm    │  27 │ Electr  │ │
│  │ 🆕 NEW │ New Item XYZ   │  10 │ Bins    │ │
│  │  ...   │  ...           │ ... │  ...    │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Summary:                                     │
│  🆕 5 new items will be added                 │
│  🔄 12 items will be updated                  │
│  ✅ 26 items unchanged                        │
│  ⚠️ 0 items missing from file (Full Sync only)│
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │        📥 Import 43 Items               │ │
│  │           43 आइटम आयात करें              │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [हिंदी]                                      │
└─────────────────────────────────────────────┘
```

**Import UX Rules:**
- Admin only — button hidden for workers
- File picker accepts `.xlsx` and `.xls` only
- After file upload: parse immediately client-side (SheetJS), no server needed
- Show preview table with color-coded status per row (NEW / UPDATE / SAME / REMOVED)
- Summary counts shown before confirm button
- Import mode choice: "Full Sync" vs "Add & Update Only" — selectable each time
- Column mapping: auto-detect columns by header name matching the 31-column ERP format
- If column headers don't match → show error: "This file doesn't match the ERP export format"
- Progress bar during import (especially for large files)
- Success toast: "Imported 43 items (5 new, 12 updated, 26 unchanged)"
- All imported items get `syncStatus: 'pending'` → auto-sync to Supabase when online
- Photos are NOT part of import (ERP doesn't have photos) — admin adds photos after import
- Works fully offline: parsed and stored in IndexedDB, syncs later

**Import → Export Round-Trip Guarantee:**
- Import reads the exact 31-column ERP format
- Export writes the exact same 31 columns
- This means: ERP → Import to App → Workers adjust stock → Export → Update ERP
- Zero data loss on fields the app doesn't actively use (they pass through as-is)

### 4.7 Change History View
```
┌─────────────────────────────────────────────┐
│  [← Back]    History: LED Bulb 8000K         │
├─────────────────────────────────────────────┤
│                                               │
│  Today                                        │
│  ├─ 10:30 AM  +5  (Received new) — Admin    │
│  ├─ 09:15 AM  -2  (Used on site) — Worker   │
│                                               │
│  Yesterday                                    │
│  ├─ 04:45 PM  -1  (Damaged) — Worker        │
│  ├─ 08:00 AM  +10 (Received new) — Admin    │
│                                               │
│  Dec 26                                       │
│  ├─ 02:30 PM  -3  (Used on site) — Worker   │
│  └─ 11:00 AM  Item created (qty: 239)       │
│                                               │
│  [हिंदी]                                      │
└─────────────────────────────────────────────┘
```

---

## 5. Component Tree

```
App
├── AuthGuard
│   ├── PinLoginScreen
│   │   ├── PinPad (custom numeric keypad)
│   │   └── LanguageToggle
│   └── AuthenticatedApp
│       ├── OfflineBanner
│       ├── Header
│       │   ├── MenuButton (hamburger → drawer)
│       │   ├── AppTitle
│       │   ├── ExportButton
│       │   └── UserBadge (Admin/Worker indicator)
│       ├── SearchBar
│       ├── CategoryTabs (horizontal scroll pills)
│       ├── InventoryGrid
│       │   ├── ItemCard (repeated)
│       │   │   ├── ItemPhoto / PhotoPlaceholder
│       │   │   ├── ItemName
│       │   │   ├── CategoryBadge
│       │   │   ├── QuantityBadge
│       │   │   └── SyncStatusDot
│       │   └── VirtualScrollContainer (for 500+ items)
│       ├── ItemDetailSheet (bottom sheet / full page)
│       │   ├── PhotoCarousel
│       │   ├── ItemMetadata
│       │   ├── StockAdjuster
│       │   │   ├── MinusButton
│       │   │   ├── QuantityDisplay
│       │   │   └── PlusButton
│       │   ├── ReasonDropdown
│       │   ├── HistoryButton
│       │   └── EditButton (admin only)
│       ├── AddItemForm (admin only, full page)
│       │   ├── PhotoCapture
│       │   ├── NameInput (EN + HI)
│       │   ├── CategoryCascader
│       │   ├── QuantityInput
│       │   └── ConditionSelect
│       ├── ExportScreen
│       │   ├── ExcelExportButton
│       │   └── GoogleSheetsExportButton
│       ├── ImportScreen (admin only)
│       │   ├── FileUploadZone
│       │   ├── ImportModeSelector (Full Sync / Add & Update)
│       │   ├── ImportPreviewTable
│       │   │   └── ImportPreviewRow (status badge + item data)
│       │   ├── ImportSummary (counts: new/update/same/removed)
│       │   ├── ColumnMappingValidator
│       │   └── ImportProgressBar
│       ├── HistoryView
│       │   └── ChangeLogEntry (repeated)
│       ├── NavigationDrawer
│       │   ├── InventoryLink
│       │   ├── ExportLink
│       │   ├── ImportLink (admin only)
│       │   ├── SettingsLink (admin: manage PINs)
│       │   └── LogoutButton
│       └── LanguageToggle (fixed bottom-left, all screens)
└── ServiceWorkerRegistration
```

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Grid Columns | Card Width |
|------------|-------|-------------|-----------|
| Mobile S | 320px | 2 | ~148px |
| Mobile M | 375px | 2 | ~176px |
| Mobile L | 425px | 3 | ~125px |
| Tablet | 768px | 4 | ~172px |
| Laptop | 1024px | 5 | ~180px |
| Desktop | 1440px | 6 | ~208px |

Grid gap: 8px (mobile), 12px (tablet+), 16px (desktop)
Padding: 16px (mobile), 24px (tablet+)

---

## 7. Interaction Patterns

### Gestures
- **Tap card** → Open item detail (bottom sheet on mobile, side panel on desktop)
- **Long-press card** → Quick +/- overlay without opening detail (shortcut)
- **Swipe left on history item** → Delete entry (admin only)
- **Pull-to-refresh** → Trigger manual sync
- **Swipe between photos** → Photo carousel in detail view

### Animations
- Card tap: scale(0.97) → scale(1.0), 100ms ease-out
- Quantity change: number scale(1.0) → scale(1.3) → scale(1.0), 200ms spring
- Category tab selection: underline slides, 150ms ease
- Sync status dot: pulse opacity when syncing (0.4 → 1.0, 1s loop)
- Offline banner: slide down from top, 300ms ease-out
- Page transitions: fade + slide-up, 200ms

### Loading States
- Initial load: skeleton cards (gray boxes matching card layout)
- Photo loading: blur-up technique (tiny 20px base64 → full photo fade-in)
- Sync in progress: small spinner in header, green check on complete
- Export generating: progress bar with percentage

---

## 8. Accessibility

- All interactive elements have `aria-label` in current language
- Color is never the sole indicator (always paired with icon or text)
- Focus visible outlines on all focusable elements (3px solid #2563EB)
- Screen reader announces quantity changes ("Quantity updated to 240")
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Skip to content link on every page
- Reduced motion: respect `prefers-reduced-motion` (disable animations)

---

*Next: Phase 3 Architecture Document*
