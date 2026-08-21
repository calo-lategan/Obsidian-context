# SITE SERVICES — IMPLEMENTATION PLAN V7 (FINAL)
## Claude Code Execution-Ready | 2026-03-23

---

## OVERVIEW

This plan covers ALL remaining fixes and features for the Site Services webapp. It is designed for Claude Code to execute phase-by-phase, committing after each complete phase. Modularity testing is done LAST and ONLY as a copy-test (never delete actual engine directories).

**Reference Documents:**
- `REVIEW-NOTES-FULL-AUDIT.md` — element-by-element test status
- `CHANGE-PLAN-V6-COMPLETE.md` — original plan with corrections
- `Site-Services-Maintenance-2026.xlsx` — maintenance sheet structure to replicate

---

## MAINTENANCE ENGINE REDESIGN — DETAILED SPECIFICATION

### What the Excel Sheet Does

The uploaded `Site-Services-Maintenance-2026.xlsx` has **15 sheets**, each representing an asset category. Each sheet is a **maintenance inspection checklist** where:

- Each **row** = one physical asset (identified by Plant No.)
- Each **column** = a maintenance item (boolean True/False = needs work / OK)
- Each category has **different checklist columns** specific to that asset type
- Some categories have additional tracking columns (Parts Ordered/Received/Installed, Completion Date, Cost)

### Sheet Structure Summary

| Sheet | Rows | Category | Key Checklist Columns |
|-------|------|----------|----------------------|
| DRS | 12 | Cabins | Flooring, Walls, Ceiling, Fittings, Mirror, Washbasin, Toilet, Door, Door keys, Shower, Lights, Windows, Interior paint, Exterior paint, ACs |
| Ablution | 60+ | Ablution | Flooring, Walls, Ceiling, Window, WC, Urinal, Interior paint, Exterior paint, Mirror, Washbasin, Lights, Exhaust Fan, Door, Door keys |
| Shower unit | 5 | Cabins | Flooring, Walls, Ceiling, Fittings, Mirror, Washbasin, Lights, Shower, Shower Curtain, AC, Doors, Electrical, WC, Interior paint, Exterior paint |
| Messhall | 10 | Cabins | Flooring, Walls, Ceiling, Fittings, AC, Window Tint, Roof, Lights, Door |
| Cabins | 270+ | Cabins | Flooring, Walls, Ceiling, Interior paint, Exterior paint, AC, Window, Blinds, Lights, Door, Door keys |
| Flatpack | 5 | Containers | Flooring, Walls, Ceiling, AC, Lights |
| Flexiloo | 230 | Sanitation | Flooring, Counter tops, Lights, Mirror, Fittings, Ceilings, Walls, Doors, WC/urinal, Basin |
| NEW Flexiloos | 98 | Sanitation | Ply Cutting, Cutting Sunmica, Gluing Sunmica, Groves for Hinges, Ply frame assy, Cutting Alu. Frame, Assembly, WC Fitting, Vanity fitting, Lighting, Door frame, Door panel, Snags, Testing, Completion Date |
| Portaloo | 107 | Portaloo | Interior fittings, Flush lever, Door lock, Branding |
| Ezgo | 90 | Golf Buggy | Parts Ordered/Received/Installed, Tyres, Batteries, + 20 specific part columns (Brake Cable, Brake Drum, etc.), Telematics, Polish |
| Clubcar | 95 | Golf Buggy | Inspection, Parts Ordered/Received/Installed, Tyres, Batteries, Telematics, Polish |
| Polaris | 22 | Polaris | Problems, Work to be done, Cost |
| Kawasaki | 12 | Kawasaki | (Minimal — just Make, Type, Plant No.) |
| Summary | 42 | Activities | Activities, Status, Progress, Comments |
| New Flatpack | 103 | Cabin | Floor, Column, Roof, Plan panel, Window panel, Window curtain, Door Panel, Electric DB, Socket, Lighting, Assembly |

### Fleet Dashboard ↔ Maintenance Integration

**Critical architectural point:** The maintenance checklist items ARE the same assets shown in the fleet dashboard. They share the same `assets` table (keyed by `plant_number`). The `current_status` column on `assets` is the single source of truth for availability.

**Data flow when maintenance happens:**

```
1. Asset currently status = 'AVAILABLE' on fleet dashboard
2. User puts asset into maintenance → status changes to 'SERVICE'
3. Fleet dashboard shows SERVICE color (red) → asset CANNOT be booked
4. Maintenance checklist tracks all repair items (booleans) + dates
5. When all work done → user toggles "Maintenance Complete Confirmed"
6. This sets:
   a. maintenance_checklist_records.maintenance_confirmed = true
   b. maintenance_checklist_records.actual_end_date = NOW()
   c. assets.current_status = 'AVAILABLE' (via Supabase function)
7. Fleet dashboard immediately reflects: asset is AVAILABLE again
```

**Every day the "confirmed" toggle is NOT set, the asset stays in SERVICE status on the fleet dashboard. No one can accidentally book it.**

### Database Schema Design

Three new tables (plus a Supabase function for the status sync):

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: maintenance_templates
-- Defines the checklist columns for each asset category type.
-- Each row = one tab in the Excel sheet (DRS, Ablution, Cabins, etc.)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,           -- e.g., 'drs', 'ablution', 'cabins'
  category_label TEXT NOT NULL,                -- e.g., 'DRS', 'Ablution', 'Cabins'
  description TEXT,                            -- e.g., 'Dressing Room / Shower units'
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Column definitions: array of objects defining each checklist field
  -- Format: [
  --   { "key": "flooring", "label": "Flooring", "type": "boolean" },
  --   { "key": "walls", "label": "Walls", "type": "boolean" },
  --   { "key": "completion_date", "label": "Completion Date", "type": "date" },
  --   { "key": "cost", "label": "Cost", "type": "number" },
  --   { "key": "problems", "label": "Problems", "type": "text" }
  -- ]
  columns JSONB NOT NULL DEFAULT '[]',
  -- Asset identification columns (which fields identify the asset in this category)
  asset_columns JSONB NOT NULL DEFAULT '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_templates_order ON maintenance_templates(display_order);

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: maintenance_checklist_records
-- Stores the actual checklist data per asset per inspection cycle.
-- Each row = one asset's maintenance status.
-- The checklist_data JSONB mirrors the boolean columns from the Excel.
--
-- FLEET INTEGRATION COLUMNS:
--   maintenance_status  → 'available' or 'service' (mirrors assets.current_status)
--   expected_start_date → when maintenance is planned to begin
--   expected_end_date   → when maintenance is planned to end
--   actual_start_date   → when maintenance actually started
--   actual_end_date     → auto-set when maintenance_confirmed toggled ON
--   maintenance_confirmed → boolean toggle: when ON, sets asset to AVAILABLE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS maintenance_checklist_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES maintenance_templates(id) ON DELETE CASCADE,

  -- Links to the fleet's assets table (plant_number is the FK)
  asset_id TEXT NOT NULL,                       -- plant_number from assets table

  -- Asset metadata (denormalized for display without JOIN)
  asset_category TEXT,                          -- e.g., 'Cabins', 'Sanitation'
  asset_description TEXT,                       -- e.g., 'Toilet Shower', 'Flexiloo WC'
  asset_size TEXT,                              -- e.g., '32''', '20x8', 'EAWC'

  -- ══ FLEET INTEGRATION: Status tracking ══
  maintenance_status TEXT NOT NULL DEFAULT 'available'
    CHECK (maintenance_status IN ('available', 'service')),
    -- 'available' = asset is available (no active maintenance)
    -- 'service'   = asset is under maintenance (blocked from booking)

  -- ══ FLEET INTEGRATION: Date tracking ══
  expected_start_date DATE,                     -- planned maintenance start
  expected_end_date DATE,                       -- planned maintenance end
  actual_start_date DATE,                       -- when maintenance actually began
  actual_end_date DATE,                         -- auto-set on maintenance_confirmed = true

  -- ══ FLEET INTEGRATION: Completion confirmation ══
  maintenance_confirmed BOOLEAN NOT NULL DEFAULT false,
    -- When toggled TRUE:
    --   1. actual_end_date = CURRENT_DATE (if not already set)
    --   2. maintenance_status = 'available'
    --   3. assets.current_status = 'AVAILABLE' (via trigger function)
    -- When toggled FALSE (re-opening maintenance):
    --   1. actual_end_date = NULL
    --   2. maintenance_status = 'service'
    --   3. assets.current_status = 'SERVICE' (via trigger function)

  -- The actual checklist: keys match the template columns
  -- e.g., { "flooring": true, "walls": false, "ceiling": true }
  checklist_data JSONB NOT NULL DEFAULT '{}',

  -- Free-text comments (last column in every Excel sheet)
  comments TEXT,

  -- Year of inspection (allows historical tracking)
  inspection_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,

  -- Tracking fields
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One checklist record per asset per template per year
  UNIQUE(template_id, asset_id, inspection_year)
);

CREATE INDEX idx_maint_checklist_template ON maintenance_checklist_records(template_id);
CREATE INDEX idx_maint_checklist_asset ON maintenance_checklist_records(asset_id);
CREATE INDEX idx_maint_checklist_year ON maintenance_checklist_records(inspection_year);
CREATE INDEX idx_maint_checklist_status ON maintenance_checklist_records(maintenance_status);
CREATE INDEX idx_maint_checklist_confirmed ON maintenance_checklist_records(maintenance_confirmed)
  WHERE maintenance_confirmed = false;  -- Fast lookup for "still under maintenance"

-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGER: Sync maintenance_confirmed ↔ assets.current_status
--
-- This is the CRITICAL integration point between maintenance and fleet.
-- When maintenance_confirmed is toggled:
--   TRUE  → asset becomes 'AVAILABLE', actual_end_date set
--   FALSE → asset becomes 'SERVICE', actual_end_date cleared
--
-- Uses input-based integration: writes to shared `assets` table,
-- fleet dashboard reads it independently. No cross-engine code import.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_maintenance_to_fleet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.maintenance_confirmed = true AND
     (OLD.maintenance_confirmed = false OR OLD.maintenance_confirmed IS NULL) THEN
    -- Maintenance just confirmed complete
    NEW.actual_end_date = COALESCE(NEW.actual_end_date, CURRENT_DATE);
    NEW.maintenance_status = 'available';
    -- Update the fleet asset to AVAILABLE
    UPDATE assets SET current_status = 'AVAILABLE'
    WHERE plant_number = NEW.asset_id;
  ELSIF NEW.maintenance_confirmed = false AND OLD.maintenance_confirmed = true THEN
    -- Maintenance re-opened (un-confirmed)
    NEW.actual_end_date = NULL;
    NEW.maintenance_status = 'service';
    -- Update the fleet asset back to SERVICE
    UPDATE assets SET current_status = 'SERVICE'
    WHERE plant_number = NEW.asset_id;
  END IF;

  -- When maintenance_status changes to 'service' (without confirm toggle)
  -- e.g., user explicitly sets asset to service mode
  IF NEW.maintenance_status = 'service' AND
     (OLD.maintenance_status = 'available' OR OLD.maintenance_status IS NULL) AND
     NEW.maintenance_confirmed = OLD.maintenance_confirmed THEN
    NEW.actual_start_date = COALESCE(NEW.actual_start_date, CURRENT_DATE);
    UPDATE assets SET current_status = 'SERVICE'
    WHERE plant_number = NEW.asset_id;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maint_fleet_sync
  BEFORE UPDATE ON maintenance_checklist_records
  FOR EACH ROW EXECUTE FUNCTION sync_maintenance_to_fleet();

-- Also handle INSERT (new record with status='service' should set asset to SERVICE)
CREATE OR REPLACE FUNCTION sync_maintenance_insert_to_fleet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.maintenance_status = 'service' THEN
    NEW.actual_start_date = COALESCE(NEW.actual_start_date, CURRENT_DATE);
    UPDATE assets SET current_status = 'SERVICE'
    WHERE plant_number = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maint_fleet_sync_insert
  BEFORE INSERT ON maintenance_checklist_records
  FOR EACH ROW EXECUTE FUNCTION sync_maintenance_insert_to_fleet();

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: maintenance_activities (Summary sheet)
-- Tracks high-level maintenance activities and their progress.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS maintenance_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL,
  status DECIMAL(3,2) NOT NULL DEFAULT 0,       -- 0.00 to 1.00 (progress %)
  progress_notes TEXT,
  comments TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_checklist_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_activities ENABLE ROW LEVEL SECURITY;

-- Read access: all authenticated users
CREATE POLICY "maintenance_templates_select" ON maintenance_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "maintenance_checklist_select" ON maintenance_checklist_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "maintenance_activities_select" ON maintenance_activities
  FOR SELECT TO authenticated USING (true);

-- Write access: admin, manager, supervisor
CREATE POLICY "maintenance_templates_insert" ON maintenance_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "maintenance_templates_update" ON maintenance_templates
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "maintenance_checklist_insert" ON maintenance_checklist_records
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "maintenance_checklist_update" ON maintenance_checklist_records
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "maintenance_activities_insert" ON maintenance_activities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "maintenance_activities_update" ON maintenance_activities
  FOR UPDATE TO authenticated USING (true);

-- Anon access (development mode)
CREATE POLICY "maintenance_templates_anon_select" ON maintenance_templates
  FOR SELECT TO anon USING (true);
CREATE POLICY "maintenance_checklist_anon_select" ON maintenance_checklist_records
  FOR SELECT TO anon USING (true);
CREATE POLICY "maintenance_activities_anon_select" ON maintenance_activities
  FOR SELECT TO anon USING (true);
CREATE POLICY "maintenance_templates_anon_write" ON maintenance_templates
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "maintenance_checklist_anon_write" ON maintenance_checklist_records
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "maintenance_activities_anon_write" ON maintenance_activities
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

### Seed Data for Templates

```sql
-- ═══════════════════════════════════════════════════════════════════════
-- SEED: maintenance_templates (one per Excel sheet)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO maintenance_templates (category_key, category_label, description, display_order, columns, asset_columns) VALUES

('drs', 'DRS', 'Dressing Room / Shower Units', 1,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"fittings","label":"Fittings","type":"boolean"},{"key":"mirror","label":"Mirror","type":"boolean"},{"key":"washbasin","label":"Washbasin","type":"boolean"},{"key":"toilet","label":"Toilet","type":"boolean"},{"key":"door","label":"Door","type":"boolean"},{"key":"door_keys","label":"Door Keys","type":"boolean"},{"key":"shower","label":"Shower","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"windows","label":"Windows","type":"boolean"},{"key":"interior_paint","label":"Interior Paint","type":"boolean"},{"key":"exterior_paint","label":"Exterior Paint","type":"boolean"},{"key":"acs","label":"ACs","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('ablution', 'Ablution', 'Ablution Trailers & Blocks', 2,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"window","label":"Window","type":"boolean"},{"key":"wc","label":"WC","type":"boolean"},{"key":"urinal","label":"Urinal","type":"boolean"},{"key":"interior_paint","label":"Interior Paint","type":"boolean"},{"key":"exterior_paint","label":"Exterior Paint","type":"boolean"},{"key":"mirror","label":"Mirror","type":"boolean"},{"key":"washbasin","label":"Washbasin","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"exhaust_fan","label":"Exhaust Fan","type":"boolean"},{"key":"door","label":"Door","type":"boolean"},{"key":"door_keys","label":"Door Keys","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('shower_unit', 'Shower Unit', 'Shower Cabin Units', 3,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"fittings","label":"Fittings","type":"boolean"},{"key":"mirror","label":"Mirror","type":"boolean"},{"key":"washbasin","label":"Washbasin","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"shower","label":"Shower","type":"boolean"},{"key":"shower_curtain","label":"Shower Curtain","type":"boolean"},{"key":"ac","label":"AC","type":"boolean"},{"key":"doors","label":"Doors","type":"boolean"},{"key":"electrical","label":"Electrical","type":"boolean"},{"key":"wc","label":"WC","type":"boolean"},{"key":"interior_paint","label":"Interior Paint","type":"boolean"},{"key":"exterior_paint","label":"Exterior Paint","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('messhall', 'Messhall', 'Mess Hall Containers', 4,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"fittings","label":"Fittings","type":"boolean"},{"key":"ac","label":"AC","type":"boolean"},{"key":"window_tint","label":"Window Tint","type":"boolean"},{"key":"roof","label":"Roof","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"door","label":"Door","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('cabins', 'Cabins', 'Office & Accommodation Cabins', 5,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"interior_paint","label":"Interior Paint","type":"boolean"},{"key":"exterior_paint","label":"Exterior Paint","type":"boolean"},{"key":"ac","label":"AC","type":"boolean"},{"key":"window","label":"Window","type":"boolean"},{"key":"blinds","label":"Blinds","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"door","label":"Door","type":"boolean"},{"key":"door_keys","label":"Door Keys","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('flatpack', 'Flatpack', 'Flatpack Containers', 6,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"ceiling","label":"Ceiling","type":"boolean"},{"key":"ac","label":"AC","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('flexiloo', 'Flexiloo', 'Flexiloo Sanitation Units', 7,
 '[{"key":"flooring","label":"Flooring","type":"boolean"},{"key":"counter_tops","label":"Counter Tops","type":"boolean"},{"key":"lights","label":"Lights","type":"boolean"},{"key":"mirror","label":"Mirror","type":"boolean"},{"key":"fittings","label":"Fittings","type":"boolean"},{"key":"ceilings","label":"Ceilings","type":"boolean"},{"key":"walls","label":"Walls","type":"boolean"},{"key":"doors","label":"Doors","type":"boolean"},{"key":"wc_urinal","label":"WC / Urinal","type":"boolean"},{"key":"basin","label":"Basin","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"size","label":"Size"},{"key":"plant_no","label":"Plant No."}]'),

('new_flexiloos', 'NEW Flexiloos', 'New Flexiloo Production Tracking', 8,
 '[{"key":"ply_cutting","label":"Ply Cutting","type":"boolean"},{"key":"cutting_sunmica","label":"Cutting Sunmica","type":"boolean"},{"key":"gluing_sunmica","label":"Gluing Sunmica","type":"boolean"},{"key":"groves_for_hinges","label":"Groves for Hinges","type":"boolean"},{"key":"ply_frame_assy","label":"Ply Frame Assy","type":"boolean"},{"key":"cutting_alu_frame","label":"Cutting Alu. Frame","type":"boolean"},{"key":"assembly","label":"Assembly","type":"boolean"},{"key":"wc_fitting","label":"WC Fitting","type":"boolean"},{"key":"vanity_fitting","label":"Vanity Fitting","type":"boolean"},{"key":"lighting","label":"Lighting","type":"boolean"},{"key":"door_frame","label":"Door Frame","type":"boolean"},{"key":"door_panel","label":"Door Panel","type":"boolean"},{"key":"snags","label":"Snags","type":"boolean"},{"key":"testing","label":"Testing","type":"boolean"},{"key":"completion_date","label":"Completion Date","type":"date"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"plant_no","label":"Plant Number"},{"key":"size","label":"Size"}]'),

('portaloo', 'Portaloo', 'Portable Toilets', 9,
 '[{"key":"interior_fittings","label":"Interior Fittings","type":"boolean"},{"key":"flush_lever","label":"Flush Lever","type":"boolean"},{"key":"door_lock","label":"Door Lock","type":"boolean"},{"key":"branding","label":"Branding","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"spec","label":"Spec"},{"key":"type","label":"Type"},{"key":"plant_no","label":"Plant No."}]'),

('ezgo', 'EZGO', 'EZGO Golf Buggies', 10,
 '[{"key":"parts_ordered","label":"Parts Ordered","type":"boolean"},{"key":"parts_received","label":"Parts Received","type":"boolean"},{"key":"parts_installed","label":"Parts Installed","type":"boolean"},{"key":"tyres","label":"Tyres","type":"boolean"},{"key":"batteries","label":"Batteries","type":"boolean"},{"key":"brake_cable_assy","label":"Brake Cable Assy","type":"boolean"},{"key":"brake_drum","label":"Brake Drum","type":"boolean"},{"key":"spring_bush","label":"Spring Bush","type":"boolean"},{"key":"speed_sensor","label":"Speed Sensor","type":"boolean"},{"key":"head_light_assy","label":"Head Light Assy","type":"boolean"},{"key":"horn_switch","label":"Horn Switch","type":"boolean"},{"key":"steering_box_assy","label":"Steering Box Assy","type":"boolean"},{"key":"windshield","label":"Windshield","type":"boolean"},{"key":"accelerator_pedal_assy","label":"Accelerator Pedal Assy","type":"boolean"},{"key":"front_bumper","label":"Front Bumper","type":"boolean"},{"key":"horn","label":"Horn","type":"boolean"},{"key":"kingpin","label":"Kingpin","type":"boolean"},{"key":"front_arm_bush","label":"Front Arm Bush","type":"boolean"},{"key":"rear_axle","label":"Rear Axle","type":"boolean"},{"key":"tow_hitch","label":"Tow Hitch","type":"boolean"},{"key":"mud_guard_lh","label":"Mud Guard LH","type":"boolean"},{"key":"front_bumper_guard","label":"Front Bumper Guard","type":"boolean"},{"key":"canopy","label":"Canopy","type":"boolean"},{"key":"battery_cable","label":"Battery Cable","type":"boolean"},{"key":"telematics","label":"Telematics","type":"boolean"},{"key":"polish","label":"Polish","type":"boolean"}]',
 '[{"key":"type","label":"Type"},{"key":"brand","label":"Brand"},{"key":"spec","label":"Spec"},{"key":"plant_no","label":"Plant No."}]'),

('clubcar', 'Clubcar', 'Club Car Golf Buggies', 11,
 '[{"key":"inspection","label":"Inspection","type":"boolean"},{"key":"parts_ordered","label":"Parts Ordered","type":"boolean"},{"key":"parts_received","label":"Parts Received","type":"boolean"},{"key":"parts_installed","label":"Parts Installed","type":"boolean"},{"key":"tyres","label":"Tyres","type":"boolean"},{"key":"batteries","label":"Batteries","type":"boolean"},{"key":"telematics","label":"Telematics","type":"boolean"},{"key":"polish","label":"Polish","type":"boolean"}]',
 '[{"key":"type","label":"Type"},{"key":"brand","label":"Brand"},{"key":"spec","label":"Spec"},{"key":"plant_no","label":"Plant No."}]'),

('polaris', 'Polaris', 'Polaris Utility Vehicles', 12,
 '[{"key":"problems","label":"Problems","type":"text"},{"key":"work_to_be_done","label":"Work to be Done","type":"text"},{"key":"cost","label":"Cost","type":"number"}]',
 '[{"key":"make","label":"Make"},{"key":"type","label":"Type"},{"key":"plant_no","label":"Plant No."}]'),

('kawasaki', 'Kawasaki', 'Kawasaki Gators', 13,
 '[]',
 '[{"key":"make","label":"Make"},{"key":"type","label":"Type"},{"key":"plant_no","label":"Plant No."}]'),

('new_flatpack', 'New Flatpack', 'New Flatpack Production Tracking', 14,
 '[{"key":"floor","label":"Floor","type":"boolean"},{"key":"column","label":"Column","type":"boolean"},{"key":"roof","label":"Roof","type":"boolean"},{"key":"plan_panel","label":"Plan Panel","type":"boolean"},{"key":"window_panel","label":"Window Panel","type":"boolean"},{"key":"window_curtain","label":"Window Curtain","type":"boolean"},{"key":"door_panel","label":"Door Panel","type":"boolean"},{"key":"electric_db","label":"Electric DB","type":"boolean"},{"key":"socket","label":"Socket","type":"boolean"},{"key":"lighting","label":"Lighting","type":"boolean"},{"key":"assembly","label":"Assembly","type":"boolean"}]',
 '[{"key":"category","label":"Category"},{"key":"description","label":"Description"},{"key":"plant_no","label":"Plant Number"},{"key":"size","label":"Size"}]');
```

### UI Design — Maintenance Engine

The redesigned maintenance page replicates the Excel workbook structure WITH fleet integration columns:

```
/maintenance
├── Tab bar: [DRS] [Ablution] [Shower Unit] [Messhall] [Cabins] [Flatpack] ... [Summary]
├── Active tab → table view:
│   ├── FIXED LEFT COLUMNS (always visible):
│   │   ├── Status indicator (Available ● / Service 🔴)
│   │   ├── Plant No. (linked to fleet dashboard)
│   │   ├── Description
│   │   └── Size
│   ├── SCROLLABLE CHECKLIST COLUMNS (from template):
│   │   ├── [Boolean checkboxes for each maintenance item]
│   │   └── Comments (text)
│   ├── FIXED RIGHT COLUMNS (fleet integration):
│   │   ├── Expected Start Date (date picker)
│   │   ├── Expected End Date (date picker)
│   │   ├── Actual Start Date (auto-set when status → SERVICE, editable)
│   │   ├── Actual End Date (auto-set on confirm, editable)
│   │   └── ✅ Maintenance Complete Confirmed (toggle)
│   │        └── ON TOGGLE: sets asset to AVAILABLE on fleet dashboard
│   │        └── Shows duration badge: "12 days" (actual_start → actual_end)
│   └── Empty state: "No assets in this category" + "Import from Excel" button
├── Filter bar:
│   ├── Search (plant no / description)
│   ├── Year selector (2025, 2026, ...)
│   ├── Status filter: All | Available | Under Service | Confirmed Complete
│   └── "Show only needing work" toggle (hides all-false rows)
├── Actions: Import from Excel, Export to Excel, + Add Asset, Bulk Set Service
├── Summary tab: Activities table with progress bars
└── KPI strip: Total assets | Under Service | Completed | Avg Duration
```

### Fleet Dashboard Integration (Visual)

```
FLEET DASHBOARD                          MAINTENANCE PAGE
┌─────────────────────┐                  ┌──────────────────────────┐
│ Asset: FLX.WC.87    │                  │ FLX.WC.87                │
│ Status: ●AVAILABLE  │   ← reads →     │ Status: Available        │
│ Calendar: [white]   │   assets table   │ Confirmed: ✅            │
└─────────────────────┘                  └──────────────────────────┘

User clicks "Set to Service" on maintenance page:
  → maintenance_checklist_records.maintenance_status = 'service'
  → trigger fires → assets.current_status = 'SERVICE'
  → fleet dashboard auto-shows red SERVICE cell
  → asset CANNOT be booked by anyone

User toggles "Maintenance Complete Confirmed":
  → maintenance_checklist_records.maintenance_confirmed = true
  → trigger fires → actual_end_date = today
  → trigger fires → assets.current_status = 'AVAILABLE'
  → fleet dashboard auto-shows white AVAILABLE cell
  → asset CAN be booked again
```

**Component Breakdown:**

| Component | File | Purpose |
|-----------|------|---------|
| MaintenancePage | maintenance-list.tsx (REPLACE) | Tab container + filter bar |
| CategoryTab | category-tab.tsx (NEW) | Single category's checklist table |
| ChecklistTable | checklist-table.tsx (NEW) | Dynamic table from template columns |
| ChecklistCell | checklist-cell.tsx (NEW) | Boolean toggle / text input / date picker |
| SummaryTab | summary-tab.tsx (NEW) | Activities with progress bars |
| ImportExcel | import-excel.tsx (NEW) | Upload .xlsx → parse → bulk upsert |
| ExportExcel | export-excel.tsx (NEW) | Export current view to .xlsx |

**Keep existing files that are still useful:**
- `maintenance-status-badge.tsx` — reuse for status indicators
- `hooks/use-maintenance-mutations.ts` — adapt for checklist mutations
- `lib/types.ts` — replace with new types
- `lib/constants.ts` — update with template configs

**Remove / replace:**
- `maintenance-form.tsx` — replaced by inline checklist editing
- `maintenance-detail.tsx` — replaced by CategoryTab view
- `lib/sample-data.ts` — replaced by template seed data

### Data Flow

```
1. Page loads → fetch maintenance_templates (all categories)
2. User clicks tab → fetch maintenance_checklist_records WHERE template_id = selected AND inspection_year = selected
3. User toggles checkbox → UPSERT maintenance_checklist_records with updated checklist_data JSONB
4. Import Excel → parse .xlsx → map sheets to templates → bulk UPSERT records
5. Export Excel → fetch all records for year → generate .xlsx matching original format
```

### Existing Tables to KEEP

The existing `maintenance_records` and `maintenance_parts` tables stay in place. They serve a different purpose (individual work orders / reactive maintenance). The new tables are for the **annual inspection checklist** system from the Excel sheet.

So the maintenance engine will have TWO views:
1. **Checklist View** (new, default) — replicates the Excel sheet
2. **Work Orders View** (existing) — individual maintenance records with parts tracking

---

## PHASE-BY-PHASE EXECUTION PLAN

### PHASE 0: Full Codebase Audit + Pre-flight (30 min) `effort: medium`

**This phase is MANDATORY. Claude Code must read everything before writing anything.**

#### Step 0a: Git & Build Pre-flight
```bash
cd /path/to/site-services-app
git status                  # Must be clean
git pull origin main        # Get latest
git log --oneline -20       # Understand recent commit history
npm run build               # Verify clean build passes BEFORE any changes
```

#### Step 0b: Read ALL Project Rules
```bash
# MANDATORY — read these FIRST:
# 1. Project-level CLAUDE.md (if exists)
# 2. Site Services SKILL.md (23 DOs, 14 DON'Ts, architecture rules)
# Search for them:
find . -name "CLAUDE.md" -o -name "SKILL.md" | head -10
# Read both completely before proceeding
```

#### Step 0c: Read Full Codebase — Every Engine, Every File

Claude Code MUST read through the entire project and note what exists, what's working, what's incomplete. This builds the context needed to avoid breaking things.

**Read order:**

1. **Project root config:** package.json, next.config.*, tsconfig.json, tailwind.config.*
2. **Shared infrastructure (ALL files):**
   - `src/shared/engine-registry.ts` → which engines registered
   - `src/shared/types/database.ts` → ALL database types
   - `src/shared/db/client.ts` → Supabase client
   - `src/shared/company-info.ts` → company details for PDFs
   - `src/shared/pdf-templates/` → ALL PDF templates
   - `src/shared/document-workflow/` → auto-generate DN/RN
   - `src/lib/supabase/client.ts` → Supabase singleton
3. **App routes:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/*/page.tsx`, `src/app/components/`
4. **Every engine directory (read EVERY file in each):**
   fleet-dashboard, quote, delivery-notes, return-notes, purchase-orders, invoices, maintenance, water-delivery, workshop-stock, msra, projects, catalog, presentations, process, settings
5. **All database migrations (in order, 002 through 015):**
   Read ALL of `supabase/migrations/` — especially `012_v10_schema.sql` (main schema, 800+ lines)

#### Step 0d: Create Progress Checklist

After reading everything, create `CLAUDE-PROGRESS-CHECKLIST.md` at project root. This file tracks progress and gets updated after EVERY phase.

**The checklist must contain:**

```markdown
# Claude Code — Progress Checklist
## Generated: [date] | Last Updated: [date]

## CODEBASE AUDIT RESULTS

### Engine Status (from code reading)
| Engine | Files | Route | DB Tables | CRUD | Issues Found |
|--------|-------|-------|-----------|------|-------------|
| fleet-dashboard | ✅ read | works | exists | partial | modal buttons dead, filter +New Quote dead |
| quote | ✅ read | works | exists | partial | Unknown Client, AED 0, no year filter |
| [... every engine ...] | | | | | |

### Migration Status
| Migration | Read | Tables Created | Notes |
|-----------|------|---------------|-------|
| 002-015 | ✅ | [list tables] | |
| 016 | PENDING | maintenance_templates, checklist_records, activities | NEW |

### Outstanding Issues Found During Audit
- [ ] Issue 1: [description + file path]
- [ ] Issue 2: ...

## PHASE COMPLETION TRACKING

### Phase 1: Fix 4 Broken Pages
- [ ] Read invoices engine — identify error cause
- [ ] Read catalog engine — identify error cause
- [ ] Read presentations engine — identify error cause
- [ ] Read process engine — identify error cause
- [ ] Fix each with graceful error handling
- [ ] npm run build passes
- [ ] Committed

### Phase 2: Wire Fleet Cell Click Actions
- [ ] Read create-modal.tsx
- [ ] Read filter-bar.tsx
- [ ] Add onClick handlers to 4 modal buttons
- [ ] Wire filter +New Quote to /quotes/new
- [ ] npm run build passes
- [ ] Committed

### Phase 3: Fix Quotes Page
- [ ] Fix Unknown Client (add JOIN)
- [ ] Fix AED 0 total
- [ ] Add year/month filter
- [ ] Wire +New Quote button
- [ ] Fix Preview button (PDF preview not save)
- [ ] npm run build passes
- [ ] Committed

### Phase 4: PDF Template Fixes
- [ ] Fix logo, company name, phone, Section Total color
- [ ] npm run build passes
- [ ] Committed

### Phase 5: Maintenance Engine Redesign
- [ ] Create migration 016
- [ ] Update types
- [ ] Create hooks (templates, checklist with fleet sync, activities)
- [ ] Replace list with tabbed checklist view
- [ ] Create category-tab, checklist-table, checklist-cell
- [ ] Fleet integration columns:
  - [ ] maintenance_status (Available/Service) toggle
  - [ ] expected_start_date / expected_end_date pickers
  - [ ] actual_start_date (auto/editable)
  - [ ] actual_end_date (auto on confirm)
  - [ ] maintenance_confirmed toggle → syncs to fleet dashboard
- [ ] Create summary-tab, import-excel, work-orders-tab
- [ ] Verify trigger sync_maintenance_to_fleet() logic
- [ ] npm run build passes
- [ ] Committed

### Phase 6: Unify Dashboard Stats
- [ ] Fix Active Projects count
- [ ] Fix Pending Quotes consistency
- [ ] Fix On Hire % consistency
- [ ] npm run build passes
- [ ] Committed

### Phase 7: Missing Creation Buttons
- [ ] DN, RN, PO, Water, Workshop creation forms + buttons
- [ ] Verify MSRA creation
- [ ] npm run build passes
- [ ] Committed

### Phase 8: Cross-Engine Data Wiring
- [ ] Verify quote finalise → bookings
- [ ] Verify quote finalise → auto-generate DN/RN
- [ ] Implement cancel cascade, DN/RN status updates, project aggregation
- [ ] npm run build passes
- [ ] Committed

### Phase 9: Settings & UI Polish
- [ ] Fix Tailwind interpolation, focus rings, disabled states
- [ ] Verify Settings persist to Supabase
- [ ] npm run build passes
- [ ] Committed

### Phase 10: Modularity Copy-Test (VERIFY ONLY — NO DELETES)
- [ ] Copy-test each of 15 engines (cp to /tmp, mv out, build, mv back)
- [ ] Record results — all 15 must pass
- [ ] NO COMMIT (verification only)

### Phase 11: Final Build + Push
- [ ] npm run build — 0 errors
- [ ] npx tsc --noEmit — 0 type errors
- [ ] Commit + push to main
- [ ] Record Supabase changes made
- [ ] Update this checklist to COMPLETE

## SUPABASE CHANGES LOG
| Phase | Change | Table | Details |
|-------|--------|-------|---------|
| (filled in as work progresses) | | | |

## NOTES FOR NEXT SESSION
- Where I stopped:
- What's left:
- Any blockers:
```

#### Step 0e: Verify
```bash
# Confirm checklist was created
head -5 CLAUDE-PROGRESS-CHECKLIST.md
# Confirm build still passes
npm run build
```

**Only proceed to Phase 1 after ALL of Step 0 is complete.**

---

### PHASE 1: Fix 4 Broken Engine Pages (45 min) `effort: medium`

**Target:** Invoices, Catalog, Presentations, Process pages all show error state.

**Root cause:** Each engine's hook queries a Supabase table that either doesn't exist or has RLS issues.

**Files to modify:**
- `src/engines/invoices/hooks/use-invoices.ts`
- `src/engines/catalog/hooks/use-catalog.ts`
- `src/engines/presentations/hooks/use-presentations.ts`
- `src/engines/process/hooks/use-processes.ts`

**Fix pattern for each:**
1. Read the hook file
2. Identify the Supabase query
3. Add graceful error handling + fallback to empty array (NOT sample data in production)
4. Ensure the error boundary catches cleanly

**Verification:** All 4 pages load without error, showing empty state instead of error state.

**Commit:**
```bash
git add src/engines/invoices/ src/engines/catalog/ src/engines/presentations/ src/engines/process/
git commit -m "fix: graceful error handling for invoices, catalog, presentations, process pages"
```

---

### PHASE 2: Wire Fleet Cell Click Actions (1.5 hr) `effort: high`

**Target:** The 4 dead buttons in `create-modal.tsx` need onClick handlers.

**File:** `src/engines/fleet-dashboard/components/create-modal.tsx`

**Implementation:**
1. Add `useRouter` from `next/navigation`
2. Wire each button:
   - **New Quote** → `/quotes/new?asset={plantNumber}&date={date}`
   - **New Booking** → create booking record in Supabase, refresh fleet
   - **Schedule Service** → `/maintenance?action=new&asset={plantNumber}&date={date}`
   - **Mark In KSA** → update asset status to 'SOLD TO KSA' in Supabase, refresh fleet

3. Update `OptionButton` to accept `onClick` prop
4. Pass `data.asset` and `data.date` to each handler

**Also fix:** `filter-bar.tsx` → wire the "+ New Quote" button to navigate to `/quotes/new`

**Verification:** Click each button in the modal → navigates or triggers action correctly.

**Commit:**
```bash
git add src/engines/fleet-dashboard/
git commit -m "feat: wire fleet cell click actions (quote, booking, service, KSA navigation)"
```

---

### PHASE 3: Fix Quotes Page Issues (1.5 hr) `effort: high`

**Target:** Unknown Client, AED 0 total, missing year/month filter, dead "+ New Quote" button.

**Files:**
- `src/engines/quote/hooks/use-quotes.ts` — fix client JOIN
- `src/engines/quote/components/quote-list.tsx` — add year/month filter, fix button
- `src/engines/quote/components/quote-detail.tsx` — add client picker, date range editor, job number field

**Fixes:**
1. **Unknown Client** — add `.select('*, clients(name)')` JOIN in the quotes query
2. **AED 0 total** — verify `grand_total` column is populated; if not, compute from line items
3. **Year/Month filter** — add dropdown filters above the quotes table
4. **"+ New Quote" button** — wire to `/quotes/new`
5. **Search** — implement client-side search across quote number, title, client name
6. **Preview button** — fix to open PDF preview instead of saving
7. **Date range validation** — prevent end_date before start_date (RP-0596 has this bug)

**Commit:**
```bash
git add src/engines/quote/
git commit -m "fix: quotes page - client names, totals, year/month filter, search, preview"
```

---

### PHASE 4: PDF Template Fixes (45 min) `effort: medium`

**Target:** 4 fixes to match reference RP-0596 exactly.

**Files:**
- `src/shared/pdf-templates/quote-template.tsx`
- `src/shared/company-info.ts`

**Fixes:**
1. **Logo** — verify logo image path and rendering
2. **Company name** — ensure "AL LAITH PROJECTS SERVICES L.L.C" appears correctly
3. **Phone number** — fix to "+971 4443 6360" (verify in company-info.ts)
4. **Section Total color** — remove any colored background, use white with thin border

**Commit:**
```bash
git add src/shared/company-info.ts src/shared/pdf-templates/
git commit -m "fix: PDF template - logo, company name, phone, section total styling"
```

---

### PHASE 5: Maintenance Engine Redesign (3 hr) `effort: max` ← MOST CRITICAL PHASE

**Target:** Replicate Excel sheet structure as described above.

**Sub-steps:**

#### 5a. Create new Supabase migration file
- File: `supabase/migrations/016_maintenance_checklists.sql`
- Contains: `maintenance_templates`, `maintenance_checklist_records`, `maintenance_activities` tables + RLS + seed data
- Does NOT drop existing `maintenance_records` or `maintenance_parts` tables

#### 5b. Update types
- File: `src/engines/maintenance/lib/types.ts` — add new types for templates, checklist records, activities
- Keep existing types for work orders

#### 5c. Create new hooks
- `src/engines/maintenance/hooks/use-maintenance-templates.ts` — fetch all templates
- `src/engines/maintenance/hooks/use-maintenance-checklist.ts` — fetch/update checklist records for a template+year
- `src/engines/maintenance/hooks/use-maintenance-activities.ts` — fetch/update summary activities
- `src/engines/maintenance/hooks/use-import-excel.ts` — parse uploaded .xlsx into records

#### 5d. Create new components
- `src/engines/maintenance/components/maintenance-list.tsx` — REPLACE with tabbed checklist view
- `src/engines/maintenance/components/category-tab.tsx` — single category table
- `src/engines/maintenance/components/checklist-table.tsx` — dynamic table renderer
- `src/engines/maintenance/components/checklist-cell.tsx` — boolean/text/date/number cell
- `src/engines/maintenance/components/summary-tab.tsx` — activities progress view
- `src/engines/maintenance/components/import-excel.tsx` — Excel upload + parse
- `src/engines/maintenance/components/export-excel.tsx` — download as .xlsx
- `src/engines/maintenance/components/work-orders-tab.tsx` — existing maintenance records (moved from old list)

#### 5e. Update constants
- `src/engines/maintenance/lib/constants.ts` — update with new tab configs

#### 5f. Update index
- `src/engines/maintenance/index.ts` — export new components

**Commit:**
```bash
git add src/engines/maintenance/ supabase/migrations/016_maintenance_checklists.sql
git commit -m "feat: maintenance engine redesign - checklist system replicating Excel structure"
```

---

### PHASE 6: Unify Dashboard Stats (45 min) `effort: medium`

**Target:** Fix mismatches between Home dashboard and Fleet dashboard.

**Fixes:**
1. **Active Projects: 0** — fix query in dashboard to count projects with status='active'
2. **Pending Quotes mismatch** — unify quote counting logic
3. **On Hire % mismatch** — both pages should use same source of truth

**Files:**
- `src/app/components/dashboard-client.tsx`
- `src/app/page.tsx`
- Shared query hooks

**Commit:**
```bash
git add src/app/
git commit -m "fix: unify dashboard stats - active projects, pending quotes, on-hire percentage"
```

---

### PHASE 7: Missing Creation Buttons & Forms (2 hr) `effort: high`

**Target:** Wire creation mechanisms for engines that currently have dead or missing buttons.

| Engine | Current State | Fix |
|--------|--------------|-----|
| Delivery Notes | No "+ New DN" button | Add button → creation form |
| Return Notes | No "+ New RN" button | Add button → creation form |
| Purchase Orders | No "+ New PO" button | Add button → creation form |
| Water Delivery | No "+ Schedule Delivery" button | Add button → creation form |
| Workshop Stock | No "+ Add Item" button | Add button → creation form |
| Maintenance | "+ New Record" dead | Already fixed in Phase 5 (work orders tab) |
| MSRA | "+ New MSRA" untested | Verify and fix if needed |

**Pattern for each:** Add a form component similar to the existing `maintenance-form.tsx` pattern (modal or page), wire the button to open it, implement Supabase insert mutation.

**Commit:**
```bash
git add src/engines/delivery-notes/ src/engines/return-notes/ src/engines/purchase-orders/ src/engines/water-delivery/ src/engines/workshop-stock/ src/engines/msra/
git commit -m "feat: add creation forms for DN, RN, PO, water delivery, workshop stock, MSRA"
```

---

### PHASE 8: Cross-Engine Data Wiring (1.5 hr) `effort: high`

**Target:** Connect engines through shared Supabase tables (input-based integration).

**Connections to implement:**
1. Quote finalise → create bookings (CODE EXISTS, verify it works)
2. Quote finalise → auto-generate DN/RN (CODE EXISTS, verify)
3. Quote cancel → cascade cancel bookings
4. DN completion → update booking status
5. RN completion → update booking status + notify for QC
6. Project page → aggregate assets count from bookings
7. Project page → aggregate value from quotes

**Commit:**
```bash
git add src/shared/ src/engines/
git commit -m "feat: wire cross-engine data flows (cancel cascade, DN/RN status, project aggregation)"
```

---

### PHASE 9: Settings & UI Polish (45 min) `effort: medium`

**Target:** Fix remaining settings issues and UI polish.

**Fixes:**
- Fix dynamic Tailwind class interpolation (use static classes or style maps)
- Ensure all buttons have proper focus rings
- Add disabled states where appropriate
- Verify Settings save to Supabase (not just Zustand)

**Commit:**
```bash
git add src/engines/settings/
git commit -m "fix: settings UI polish and persistence"
```

---

### PHASE 10: Modularity Copy-Test (15 min) `effort: medium`

**IMPORTANT: This is a READ-ONLY test. Do NOT delete actual engine directories.**

```bash
# Copy-test each engine (copy to temp, remove from src, build, restore)
for engine in fleet-dashboard quote delivery-notes return-notes purchase-orders invoices maintenance water-delivery workshop-stock msra projects catalog presentations process settings; do
  echo "=== Testing: $engine ==="
  cp -r "src/engines/$engine" "/tmp/${engine}-backup"
  mv "src/engines/$engine" "/tmp/${engine}-removed"
  npm run build 2>&1 | tail -5
  mv "/tmp/${engine}-removed" "src/engines/$engine"
  rm -rf "/tmp/${engine}-backup"
  echo ""
done
```

**If any engine removal causes build failure:** Fix the import chain to restore isolation. The engine registry dynamically imports engines, so removal should never break the build.

**No commit needed for this phase — it's verification only.**

---

### PHASE 11: Final Build + Commit + Push (10 min) `effort: medium`

```bash
# 1. Clean build
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Commit any remaining changes
git add -A
git commit -m "chore: final build verification — all phases complete"

# 4. Push to main
git push origin main
```

---

## SUPABASE CHANGES REPORT

### New Tables Created (Migration 016)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `maintenance_templates` | Defines checklist columns per category | id, category_key, category_label, description, display_order, columns (JSONB), asset_columns (JSONB), is_active |
| `maintenance_checklist_records` | Per-asset checklist + fleet integration | id, template_id, **asset_id** (FK→assets.plant_number), asset_category, asset_description, asset_size, **maintenance_status** ('available'/'service'), **expected_start_date**, **expected_end_date**, **actual_start_date**, **actual_end_date**, **maintenance_confirmed** (boolean), checklist_data (JSONB), comments, inspection_year |
| `maintenance_activities` | Summary activities tracking | id, activity_name, status (decimal 0-1), progress_notes, comments, display_order, is_active |

### New Indexes

- `idx_maint_templates_order` on maintenance_templates(display_order)
- `idx_maint_checklist_template` on maintenance_checklist_records(template_id)
- `idx_maint_checklist_asset` on maintenance_checklist_records(asset_id)
- `idx_maint_checklist_year` on maintenance_checklist_records(inspection_year)
- `idx_maint_checklist_status` on maintenance_checklist_records(maintenance_status)
- `idx_maint_checklist_confirmed` on maintenance_checklist_records(maintenance_confirmed) WHERE false — fast lookup for assets still under maintenance

### New Triggers & Functions (FLEET INTEGRATION)

| Trigger | Function | When | What It Does |
|---------|----------|------|-------------|
| `trg_maint_fleet_sync` | `sync_maintenance_to_fleet()` | BEFORE UPDATE on maintenance_checklist_records | When `maintenance_confirmed` toggled TRUE → sets `actual_end_date`, `maintenance_status='available'`, updates `assets.current_status='AVAILABLE'`. When toggled FALSE → clears `actual_end_date`, sets `maintenance_status='service'`, updates `assets.current_status='SERVICE'`. When `maintenance_status` changed to 'service' → sets `actual_start_date`, updates `assets.current_status='SERVICE'` |
| `trg_maint_fleet_sync_insert` | `sync_maintenance_insert_to_fleet()` | BEFORE INSERT on maintenance_checklist_records | If new record has `maintenance_status='service'` → sets `actual_start_date`, updates `assets.current_status='SERVICE'` |

**These triggers are the only cross-table writes in the system.** They follow input-based integration: the maintenance engine writes to `maintenance_checklist_records`, the trigger syncs to `assets`, and the fleet dashboard reads `assets` independently. No engine code imports another engine.

### New RLS Policies

- SELECT for authenticated + anon on all 3 new tables
- INSERT/UPDATE for authenticated on all 3 new tables
- ALL for anon on all 3 new tables (development mode)

### Existing Tables Modified

| Table | Change | Mechanism |
|-------|--------|-----------|
| `assets` | `current_status` updated to 'SERVICE' or 'AVAILABLE' | Via `sync_maintenance_to_fleet()` trigger — no schema change needed, column already exists with CHECK constraint that includes 'SERVICE' and 'AVAILABLE' |

### Existing Tables NOT Modified (Schema)

- `maintenance_records` — kept as-is for work orders (separate feature)
- `maintenance_parts` — kept as-is for work order parts
- All other existing tables unchanged

### Tables That May Need Schema Changes (from other phases)

| Table | Change | Phase |
|-------|--------|-------|
| `quotes` | Verify `client_id` FK is properly set | Phase 3 |
| `assets` | Status update function for KSA marking from fleet modal | Phase 2 |
| `bookings` | May need cancel cascade trigger | Phase 8 |

---

## HOW TO RESET AND RE-RUN ALL MIGRATIONS

### Option A: Full Reset (Development Only)

```bash
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Run this to drop everything:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

# 3. Re-run migrations in order:
# Go to SQL Editor and paste each file, one by one, in order:
#   001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016

# 4. Run seed data:
#   Paste contents of supabase/seed.sql
#   Then paste the maintenance_templates seed data from migration 016
```

### Option B: Reset via Supabase CLI

```bash
# If you have Supabase CLI installed:
supabase db reset          # Drops all, re-runs migrations + seed
supabase db push           # Pushes local migrations to remote
```

### Option C: Incremental (Add New Migration Only)

```bash
# If existing schema is correct and you only need the new maintenance tables:
# Go to SQL Editor → paste only migration 016_maintenance_checklists.sql
# This is non-destructive — it only adds new tables, doesn't touch existing ones
```

### Migration File Locations

```
supabase/migrations/
├── 001_*.sql          (if exists)
├── 002_delivery_notes.sql
├── 003_return_notes.sql
├── 004_notifications.sql
├── 005_quotes.sql
├── 006_auth_signup.sql
├── 007_quote_enhancements.sql
├── 008_admin_seed_user.sql
├── 009_rls_hardening.sql
├── 010_supabase_hardening.sql
├── 011_security_hardening.sql
├── 012_v10_schema.sql         ← Main schema (1500 lines)
├── 013_fleet_seed.sql
├── 014_soft_delete.sql
├── 015_fix_users_rls.sql
└── 016_maintenance_checklists.sql  ← NEW (this plan)
```

### Verifying Migrations Ran Correctly

```sql
-- Check all tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check maintenance templates are seeded:
SELECT category_key, category_label, display_order,
       jsonb_array_length(columns) as num_columns
FROM maintenance_templates
ORDER BY display_order;

-- Check RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'maintenance%';
```

---

## GOOGLE DRIVE API KEY — NOTED FOR LATER

Per user instruction: "thats fine ill integrate later... maybe its best i should be able to add in the api key but that needs to be kept and stored securely"

**Current state:** Settings → System tab has Google Drive section with "Not Connected" status and Drive Root Folder ID input.

**When ready to implement:**
1. API key should be stored as a Supabase secret (vault) or environment variable, NOT in the database
2. The Settings UI should have a secure input for the API key that writes to server-side env
3. Connection test button should verify the key works before saving
4. Follows DON'T #13: "Don't store sensitive data in the web app database"

---

## EXECUTION SUMMARY

| Phase | Description | Effort | Est. Time | Commit |
|-------|------------|--------|-----------|--------|
| 0 | Full codebase audit + pre-flight + create progress checklist | **Medium** | 30 min | — |
| 1 | Fix 4 broken pages | **Medium** | 45 min | ✅ |
| 2 | Wire fleet cell click actions | **High** | 1.5 hr | ✅ |
| 3 | Fix quotes page | **High** | 1.5 hr | ✅ |
| 4 | PDF template fixes | **Medium** | 45 min | ✅ |
| 5 | Maintenance engine redesign | **Max** | 3 hr | ✅ |
| 6 | Unify dashboard stats | **Medium** | 45 min | ✅ |
| 7 | Missing creation buttons | **High** | 2 hr | ✅ |
| 8 | Cross-engine wiring | **High** | 1.5 hr | ✅ |
| 9 | Settings & UI polish | **Medium** | 45 min | ✅ |
| 10 | Modularity copy-test | **Medium** | 15 min | — (verify only) |
| 11 | Final build + push | **Medium** | 10 min | ✅ |
| **TOTAL** | | | **~13.5 hr** | **9 commits** |

### Effort Level Guide

Claude Code should set its effort/thinking level based on the phase:

| Effort | When to Use | Phases |
|--------|------------|--------|
| **Medium** | Reading files, small targeted fixes, config changes, verification steps. The code pattern is clear and low-risk. | 0, 1, 4, 6, 9, 10, 11 |
| **High** | New feature development, multi-file architecture changes, creating new components from scratch. Mistakes are expensive but patterns exist to follow. | 2, 3, 7, 8 |
| **Max** | New database triggers that auto-modify other tables, the fleet↔maintenance sync function, any SQL that writes to `assets.current_status` from a trigger. A bug here silently corrupts fleet data for every asset — max reasoning is justified. | 5 |

**Rule:** If unsure, go one level up. Medium → High. High → Max. Better to spend tokens than ship a fleet-corrupting bug.

**Per-phase instructions for Claude Code:**

```
# At the START of each phase, set effort:
# Phase 0:  medium
# Phase 1:  medium
# Phase 2:  high
# Phase 3:  high
# Phase 4:  medium
# Phase 5:  max       ← DB triggers that auto-modify fleet data
# Phase 6:  medium
# Phase 7:  high
# Phase 8:  high
# Phase 9:  medium
# Phase 10: medium
# Phase 11: medium
```

### Priority if Time-Constrained
1. Phase 5 (Maintenance redesign) — user's primary ask — **MAX effort**
2. Phase 2 (Fleet cell clicks) — core workflow — **HIGH effort**
3. Phase 3 (Quotes fixes) — visible bugs — **HIGH effort**
4. Phase 1 (Broken pages) — user-facing errors — **MEDIUM effort**
5. Everything else in order
