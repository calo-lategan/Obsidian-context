# COMPLETE REVIEW NOTES — SITE SERVICES WEBAPP
## Every Element Tested + Code Audit Cross-Reference
### Audited: 2026-03-23 | Live URL: ss-workshop-stock-app-az9p-calos-projects-df7b646d.vercel.app

---

## REVIEW STATUS LEGEND
- ✅ TESTED & WORKS
- ⚠️ TESTED & PARTIALLY WORKS (has issues)
- ❌ TESTED & BROKEN
- 🔲 NOT YET TESTED (needs manual verification)

---

## PAGE 1: HOME DASHBOARD (`/`)

### KPI Cards (top row)
| Element | Value Shown | Connected To | Status |
|---------|------------|-------------|--------|
| TOTAL ASSETS | 763 | `assets` table count | ✅ Correct |
| ON HIRE | 28% (216 assets) | `assets.current_status = 'on_hire'` | ⚠️ Doesn't match Fleet "Booked: 123" |
| AVAILABLE | 72% (547 assets) | `assets.current_status = 'available'` | ✅ |
| UNDER SERVICE | 0 | `assets.current_status = 'service'` | ✅ (no service records exist) |
| ACTIVE PROJECTS | 0 | Query returns 0 | ❌ Projects page shows 6 ACTIVE projects |
| PENDING QUOTES | 1 | Bookings with status quote | ⚠️ Inconsistent with fleet "Quoting: 0" |

### Dashboard Tabs
| Tab | Status | Content |
|-----|--------|---------|
| Status | ✅ WORKS | KPI cards + Active Projects + Quick Actions + Recent Activity + System Status |
| Revenue | ✅ WORKS | Total Revenue AED 0, Highest/Most Frequent Client = AMPLIFY EVENTS, Revenue by Month chart, Top 10 Quotes table |
| Utilization | ✅ WORKS | Overall 0%, Today 0%, Year-over-Year comparison, Utilization by Category table (all 34 categories with booked/total days) |

### Quick Action Buttons
| Button | Navigates To | Status |
|--------|-------------|--------|
| New Quote | `/quotes` | ✅ WORKS (link to quotes list, not a create form) |
| New Booking | `/fleet` | ✅ WORKS (link to fleet, not a booking form) |
| Check Availability | `/fleet` | ✅ WORKS |

### Other Elements
| Element | Status | Notes |
|---------|--------|-------|
| Active Projects section | ❌ Shows "No Active Projects" | But Projects page has 6 active — query broken |
| "View all →" link | 🔲 Not tested | Should link to /projects |
| Recent Activity section | ⚠️ Shows "No Recent Activity" | Activity log not implemented |
| System Status (15 engines) | ⚠️ All show green | Are these real health checks or hardcoded? |

---

## PAGE 2: FLEET DASHBOARD (`/fleet`)

### KPI Cards
| Element | Value | Status |
|---------|-------|--------|
| Total: 763 | Sum of all categories | ✅ |
| Available: 547 | Rows with no bookings | ✅ |
| Booked: 123 | Rows with booking status | ✅ |
| Quoting: 0 | Rows with quote status | ⚠️ Inconsistent with Home "Pending Quotes: 1" |
| Util: 28% | (total-available)/total | ✅ |

### Filter/Nav Bar
| Element | Status | Notes |
|---------|--------|-------|
| Search bar | 🔲 Not tested | Client-side filter |
| All Categories dropdown | 🔲 Not tested | 34 categories |
| All Statuses dropdown | 🔲 Not tested | Quote/Booked/On Hire/etc |
| Time range buttons (30D/60D/90D/6M/1Y/2Y) | 🔲 Not tested | Calendar date range |
| 60D button selected by default | ✅ Visible | Mar 2026 — Apr 2026 shown |
| Today / << / < / > / >> | 🔲 Not tested | Calendar navigation |
| "+ New Quote" button | ❌ DEAD | No onClick handler in filter-bar.tsx |
| 763 assets / refresh button | 🔲 Not tested | Top-right corner |

### Calendar Grid
| Element | Status | Notes |
|---------|--------|-------|
| Category collapse arrows | 🔲 Not tested | Toggle category rows |
| MIXED ABLUTION (38) header | ✅ Visible | Category with count |
| All 763 asset rows | ✅ Render | Plant numbers + descriptions correct |
| Calendar cells (clickable) | ✅ Opens modal | CREATE modal appears with asset name + date |
| Cell color coding | ⚠️ All cells appear white/empty | No bookings to show colors — untestable |
| Horizontal scrollbar | ✅ Visible | For date range navigation |

### Create Modal (appears on cell click)
| Element | Status | Notes |
|---------|--------|-------|
| Modal title "NEW RECORD" | ✅ Shows | With asset ID + date |
| "New Quote — Create a quote for this date" | ❌ DEAD | Has hover state (blue border) but no onClick |
| "New Booking — Book this asset for a client" | ❌ DEAD | Same — no onClick handler |
| "Schedule Service — Maintenance or service" | ❌ DEAD | Same |
| "Mark In KSA — Ship to KSA" | ❌ DEAD | Same |
| "Cancel" button | ✅ WORKS | Closes modal |

### Color Legend (top-right)
| Color | Label | Status |
|-------|-------|--------|
| Pink | Quote | ✅ Visible |
| Cyan | Booked | ✅ Visible |
| Orange | KSA | ✅ Visible |
| Green | Yard | ✅ Visible |
| Red | Issues | ✅ Visible |
| Yellow | Logistics | ✅ Visible |

---

## PAGE 3: QUOTES (`/quotes`)

### List View
| Element | Status | Notes |
|---------|--------|-------|
| "Quotes 2" heading with count | ✅ | Shows 2 quotes |
| Search bar "Search quotes, clients..." | 🔲 Not tested | Does it search client name + job number? |
| All Statuses dropdown | ✅ Visible | Draft/Pending Review/Finalised/Cancelled/Expired |
| Year/Month filter | ❌ MISSING | User specifically requested this |
| "+ New Quote" button | ❌ DEAD | Clicked 3x, nothing happens, no navigation |

### Quote Table
| Column | RP-0596 | RP-0001 | Status |
|--------|---------|---------|--------|
| QUOTE # | RP-0596 | RP-0001 | ✅ |
| TITLE | Quote RP-0596 | test 2 | ✅ |
| CLIENT | Unknown Client | Unknown Client | ❌ Not joining clients table |
| STATUS | Finalised (green) | Draft (yellow) | ✅ |
| TOTAL | AED 0.00 | AED 50,820.00 | ⚠️ RP-0596 shows 0 |
| DATE RANGE | 1 Dec 2024 — 11 Feb 2024 | 17 Mar 2026 — 17 Mar 2026 | ❌ RP-0596 end before start |
| REV | R1 | — | ✅ |
| CREATED | 17 Mar 2026 | 17 Mar 2026 | ✅ |
| PDF download | Download icon | Download icon | 🔲 Not tested |
| Row click → detail | ✅ WORKS | Navigated to /quotes/[id] |

### Quote Detail View (RP-0001)
| Element | Status | Notes |
|---------|--------|-------|
| Back to Quotes link | ✅ WORKS | |
| Quote # + Status badge | ✅ "RP-0001 Draft" | |
| Title "test 2" | ✅ | |
| Client display "Unknown Client" | ❌ No client picker/selector | Can't change client |
| Currency "AED" | ✅ Shown | |
| Date range "17 Mar 2026 — 17 Mar 2026" | ⚠️ Displayed but not editable | No date picker to change |
| Job Number field | ❌ MISSING | Not visible anywhere on detail page |

### Line Items Table
| Column | Status | Notes |
|--------|--------|-------|
| DESCRIPTION | ✅ Editable text input | |
| CATEGORY | ✅ Editable text input | |
| QTY | ✅ Editable number input | |
| RATE TYPE | ✅ Dropdown (Monthly) | |
| UNIT RATE | ✅ Editable number | |
| PERIODS | ✅ Editable number | |
| MOB/DEMOB | ✅ Editable number | |
| TOTAL | ✅ Auto-calculated | |
| EXEMPT checkbox | ✅ | |
| X-HIRE checkbox | ✅ | Red checked on 20ft Storage |
| Cross-hire row (Supplier/Cost) | ✅ Shows when X-HIRE checked | |
| Delete row (trash icon) | ✅ Visible | 🔲 Not tested |
| "+ Add Fleet Item" button | 🔲 Not tested | |
| "+ Add Manual Item" button | 🔲 Not tested | |
| Subtotal | ✅ AED 48,400.00 | |
| VAT (5%) | ✅ AED 2,420.00 | |
| Grand Total | ✅ AED 50,820.00 | |

### Action Buttons
| Button | Status | Notes |
|--------|--------|-------|
| Save Draft | 🔲 Not tested | |
| Preview | ⚠️ Shows "Quote updated successfully" toast | Does NOT open PDF preview — behaves like Save |
| Finalise | 🔲 Not tested | Should create bookings + DN + RN |

### Signatures Section
| Element | Status | Notes |
|---------|--------|-------|
| Authorized By | ✅ "No admin signature captured yet." | |
| Client Acceptance | ✅ "Client signature available after quote is sent for review." | |

---

## PAGE 4: PROJECTS (`/projects`)

### List View
| Element | Status | Notes |
|---------|--------|-------|
| Status dropdown (All/Active/Completed/Quoted/Cancelled) | ✅ | |
| 8 project rows visible | ✅ | |
| Project Name column | ✅ | |
| Client column | ✅ | RCS, DWTC, ARTIST IN MOTION, EMJ EVENTS, USHUAIA, WICKED TENT, AMPLIFY, PGA GROUP |
| Status column | ✅ | 6 Active, 2 Quoted |
| Assets column | ❌ All show 0 | Not aggregating from bookings |
| Date Range column | ✅ | Correct date ranges |
| Value column | ❌ All show AED 0 | Not aggregating from quotes/invoices |
| Row click → detail | ✅ WORKS | Navigated to /projects/[id] |

### Project Detail View (WORLD TRIATHLON)
| Element | Status | Notes |
|---------|--------|-------|
| Back to Projects link | ✅ | |
| Project name + client | ✅ WORLD TRIATHLON / RCS | |
| Job number | ✅ 68681 | |
| Date range | ✅ 14 Mar 2026 — 01 Apr 2026 | |
| Status badge | ✅ Active (green) | |
| Documents tab | ✅ "No documents yet" | |
| Assets tab | ✅ "No assets assigned" | |
| Timeline tab | ✅ "Project Created — 17 Mar 2026, 14:39" | |
| Financials tab | ✅ Shows 4 cards: Quote Value, PO Value, Invoiced Amount, Outstanding Balance (all AED 0) | |

---

## PAGE 5: DELIVERY NOTES (`/delivery-notes`)
| Element | Status | Notes |
|---------|--------|-------|
| Search bar | ✅ Visible | |
| Status dropdown (All/Draft/Yard Checked/In Transit/Delivered/Confirmed/Disputed) | ✅ | |
| "+ New DN" button | ❌ MISSING | No creation mechanism |
| Empty state message | ✅ "No delivery notes found" | |

## PAGE 6: RETURN NOTES (`/return-notes`)
| Element | Status | Notes |
|---------|--------|-------|
| Status dropdown (All/Draft/Issued/Returned/Inspected/Closed) | ✅ | |
| "+ New RN" button | ❌ MISSING | No creation mechanism |
| Count badge shows "0" | ✅ | |

## PAGE 7: PURCHASE ORDERS (`/purchase-orders`)
| Element | Status | Notes |
|---------|--------|-------|
| Status dropdown (All/Pending/Confirmed/Completed) | ✅ | |
| "+ New PO" button | ❌ MISSING | No creation mechanism |

## PAGE 8: INVOICES (`/invoices`)
| Element | Status | Notes |
|---------|--------|-------|
| ENTIRE PAGE | ❌ ERROR | "Unable to load invoices" |
| Root cause | Code audit needed | Hook query fails — likely missing table or RLS issue |

## PAGE 9: MAINTENANCE (`/maintenance`)
| Element | Status | Notes |
|---------|--------|-------|
| Search bar "Search assets, technicians..." | ✅ Visible | |
| All Statuses dropdown (Scheduled/In Progress/Completed) | ✅ | |
| All Types dropdown (Scheduled/Reactive/QC Inspection) | ✅ | |
| "+ New Record" button | ❌ DEAD | Clicked via ref — page refreshed, no form appeared |
| Count badge "0" | ✅ | |

## PAGE 10: WATER DELIVERY (`/water-delivery`)
| Element | Status | Notes |
|---------|--------|-------|
| Status dropdown (Draft/Scheduled/In Transit/Delivered/Closed/Cancelled) | ✅ | |
| "+ Schedule Delivery" button | ❌ MISSING | No creation mechanism |

## PAGE 11: WORKSHOP STOCK (`/workshop-stock`)
| Element | Status | Notes |
|---------|--------|-------|
| Category dropdown (Consumables/Spare Parts/Tools/Safety Equipment/Electrical/Plumbing) | ✅ | |
| "+ Add Item" button | ❌ MISSING | No creation mechanism |

## PAGE 12: CATALOG (`/catalog`)
| Element | Status | Notes |
|---------|--------|-------|
| ENTIRE PAGE | ❌ ERROR | "Unable to load catalog" |

## PAGE 13: PRESENTATIONS (`/presentations`)
| Element | Status | Notes |
|---------|--------|-------|
| ENTIRE PAGE | ❌ ERROR | "Unable to load presentations" |

## PAGE 14: MSRA (`/msra`)
| Element | Status | Notes |
|---------|--------|-------|
| Status dropdown (Draft/Submitted/Approved/Rejected) | ✅ | |
| "+ New MSRA" button | 🔲 Not tested | Need to verify if it opens a form |
| Count badge "0" | ✅ | |

## PAGE 15: PROCESS (`/process`)
| Element | Status | Notes |
|---------|--------|-------|
| ENTIRE PAGE | ❌ ERROR | "Unable to load process workflows" |

## PAGE 16: ADMIN SETTINGS (`/settings`)

### Settings Tabs
| Tab | Status | Notes |
|-----|--------|-------|
| Users | ✅ | Shows "0 users total" — table empty (data may have been reset) |
| Rate Card | ✅ | Full rate card with categories, codes, unit rates, period, currency, delete buttons |
| Clients | ✅ | 8 clients (AMPLIFY, ARTIST IN MOTION, DWTC, EMJ EVENTS, PGA GROUP, RCS, USHUAIA, WICKED TENT), search bar, Add Client button, Deactivate per row |
| Data Import | ✅ | Document Type dropdown, file upload area (PDF/Excel/Word/CSV), "Enter Data Manually" button |
| System | ✅ | Service connections, Google Drive config, App Info, Document Generation radios, toggle switches, Save Configuration |

### Users Tab Detail
| Element | Status | Notes |
|---------|--------|-------|
| User table (Name/Email/Role/Status/Created) | ✅ Renders | But 0 users shown |
| Role dropdown per user | ✅ (Administrator/Manager/Supervisor/Operator) | |
| Status dropdown per user | ✅ (Active/Inactive/Suspended) | |
| "Add User" button | 🔲 Not tested | Does it open a form? |
| Role Permissions section | ✅ | 4 role tabs, 14 engines, Visible in Sidebar + Can Access checkboxes |
| "Add Role" button | 🔲 Not tested | |
| "Save Permissions" button | 🔲 Not tested | Does it persist to Supabase? |

### Rate Card Tab Detail
| Element | Status | Notes |
|---------|--------|-------|
| Categories shown | ✅ | Ablution Units(6), Chemical Toilets(1), Dressing Rooms(1), Flexiloo(2), Mess Halls(1), Mobilisation(1), OPO Cabins+ |
| Inline editing | 🔲 Not tested | "Click any cell to edit inline" |
| "Add Item" button | 🔲 Not tested | |
| "Delete" buttons per row | 🔲 Not tested | Red outlined buttons |

### System Tab Detail
| Element | Status | Notes |
|---------|--------|-------|
| Supabase Database status | ✅ Connected (green) | |
| Google Drive API | ❌ Not Connected | |
| Google OAuth | ❌ Not Connected | |
| Gmail API | ❌ Not Connected | |
| Drive Root Folder ID input | ✅ Visible | Empty |
| Test Connection button | 🔲 Not tested | |
| Filing Structure (20 folders) collapsible | 🔲 Not tested | |
| Generate DN on (Quote Finalisation / Logistics In Date) | ✅ Radio buttons | Quote Finalisation selected |
| Generate RN on (Quote Finalisation / Logistics Out Date) | ✅ Radio buttons | Quote Finalisation selected |
| Auto-generate Purchase Order toggle | ✅ OFF | |
| Auto-generate Invoice on Return toggle | ✅ OFF | |
| Require MSRA Before Delivery toggle | ✅ ON | |
| Require Dual Verification on Delivery toggle | ✅ ON | |
| Toggle positioning | ✅ OK in current layout | Not pushed too far right (was previously reported as issue — may have been fixed) |
| Save Configuration button | 🔲 Not tested | |

---

## CROSS-CUTTING ISSUES

### 1. Stats Mismatch Between Pages
- Home "On Hire 28% (216)" vs Fleet "Booked: 123" — **different data sources**
- Home "Active Projects: 0" vs Projects page shows 6 Active — **query broken**
- Home "Pending Quotes: 1" vs Fleet "Quoting: 0" — **different data sources**

### 2. Quote-Client Linkage Broken
- Settings → Clients tab has 8 clients
- Quotes list shows "Unknown Client" for all quotes
- Quote detail has no client picker/selector

### 3. Missing CRUD Operations
- 5 engines have no creation button: DN, RN, PO, Water Delivery, Workshop Stock
- 1 engine has dead creation button: Maintenance "+ New Record"
- 2 engines have dead creation button: Fleet "+ New Quote", Quotes "+ New Quote"

### 4. Four Broken Pages
- Invoices, Catalog, Presentations, Process all show error state

### 5. PDF Generation
- Preview button saves instead of previewing
- PDF download from quotes list — not verified
- Quote PDF needs pixel-perfect match to reference (4 fixes: logo, company name, phone, Section Total color)

### 6. No Data Flow Between Engines
- Quote finalise → bookings: CODE EXISTS ✅
- Quote finalise → auto-generate DN/RN: CODE EXISTS ✅
- All other cross-engine connections: NOT IMPLEMENTED

---

## ELEMENTS STILL NOT TESTED (🔲)
1. Fleet search bar filtering
2. Fleet category/status dropdowns
3. Fleet time range buttons (30D-2Y)
4. Fleet Today/navigation buttons
5. Quotes search bar functionality
6. Quotes PDF download button
7. Quote detail "Save Draft" button
8. Quote detail "Finalise" button
9. Quote detail "+ Add Fleet Item" button
10. Quote detail "+ Add Manual Item" button
11. Quote detail delete row (trash icon)
12. MSRA "+ New MSRA" button
13. Settings "Add User" button functionality
14. Settings "Add Role" button
15. Settings "Save Permissions" button
16. Settings Rate Card "Add Item" button
17. Settings Rate Card inline editing
18. Settings Rate Card "Delete" buttons
19. Settings "Test Connection" button
20. Settings "Filing Structure" collapsible
21. Settings "Save Configuration" button
22. Settings Data Import file upload
23. Settings Data Import "Enter Data Manually" button
24. Home "View all →" link
25. System Status green dots — real health checks?
26. ~~Revenue tab — does RP-0596 show client correctly here?~~ ✅ CONFIRMED: Shows "AMPLIFY EVENTS MANAGEMENT" — JOIN works in Revenue tab but NOT in quotes list page
