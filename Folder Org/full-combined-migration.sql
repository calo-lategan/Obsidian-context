-- ═══════════════════════════════════════════════════════════════════════════
-- PRE-MIGRATION CLEANUP
-- Drops all existing policies so CREATE POLICY statements don't conflict.
-- Safe to run on a fresh database (IF EXISTS handles missing policies).
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "categories_select_authenticated" ON categories;
DROP POLICY IF EXISTS "categories_insert_admin_manager" ON categories;
DROP POLICY IF EXISTS "categories_update_admin_manager" ON categories;
DROP POLICY IF EXISTS "categories_delete_admin_manager" ON categories;
DROP POLICY IF EXISTS "assets_select_authenticated" ON assets;
DROP POLICY IF EXISTS "assets_insert_admin_manager" ON assets;
DROP POLICY IF EXISTS "assets_update_admin_manager" ON assets;
DROP POLICY IF EXISTS "assets_delete_admin_manager" ON assets;
DROP POLICY IF EXISTS "clients_select_authenticated" ON clients;
DROP POLICY IF EXISTS "clients_insert_admin_manager" ON clients;
DROP POLICY IF EXISTS "clients_update_admin_manager" ON clients;
DROP POLICY IF EXISTS "clients_delete_admin_manager" ON clients;
DROP POLICY IF EXISTS "projects_select_authenticated" ON projects;
DROP POLICY IF EXISTS "projects_insert_admin_manager" ON projects;
DROP POLICY IF EXISTS "projects_update_admin_manager" ON projects;
DROP POLICY IF EXISTS "projects_delete_admin_manager" ON projects;
DROP POLICY IF EXISTS "bookings_select_authenticated" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_admin_manager_supervisor" ON bookings;
DROP POLICY IF EXISTS "bookings_update_admin_manager_supervisor" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_admin_manager" ON bookings;
DROP POLICY IF EXISTS "documents_select_authenticated" ON documents;
DROP POLICY IF EXISTS "documents_insert_admin_manager_supervisor" ON documents;
DROP POLICY IF EXISTS "documents_update_admin_manager_supervisor" ON documents;
DROP POLICY IF EXISTS "documents_delete_admin_manager" ON documents;
DROP POLICY IF EXISTS "users_select_authenticated" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "Authenticated users can read delivery_notes" ON delivery_notes;
DROP POLICY IF EXISTS "Authenticated users can read dn_line_items" ON dn_line_items;
DROP POLICY IF EXISTS "Authenticated users can read dn_signatures" ON dn_signatures;
DROP POLICY IF EXISTS "Authenticated users can insert delivery_notes" ON delivery_notes;
DROP POLICY IF EXISTS "Authenticated users can update delivery_notes" ON delivery_notes;
DROP POLICY IF EXISTS "Authenticated users can insert dn_line_items" ON dn_line_items;
DROP POLICY IF EXISTS "Authenticated users can update dn_line_items" ON dn_line_items;
DROP POLICY IF EXISTS "Authenticated users can insert dn_signatures" ON dn_signatures;
DROP POLICY IF EXISTS "Authenticated users can read return_notes" ON return_notes;
DROP POLICY IF EXISTS "Authenticated users can read rn_line_items" ON rn_line_items;
DROP POLICY IF EXISTS "Authenticated users can read rn_inspections" ON rn_inspections;
DROP POLICY IF EXISTS "Authenticated users can insert return_notes" ON return_notes;
DROP POLICY IF EXISTS "Authenticated users can update return_notes" ON return_notes;
DROP POLICY IF EXISTS "Authenticated users can insert rn_line_items" ON rn_line_items;
DROP POLICY IF EXISTS "Authenticated users can update rn_line_items" ON rn_line_items;
DROP POLICY IF EXISTS "Authenticated users can insert rn_inspections" ON rn_inspections;
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;
DROP POLICY IF EXISTS "quotes_select_authenticated" ON quotes;
DROP POLICY IF EXISTS "quotes_insert_authenticated" ON quotes;
DROP POLICY IF EXISTS "quotes_update_authenticated" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_authenticated" ON quotes;
DROP POLICY IF EXISTS "quote_line_items_select_authenticated" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_insert_authenticated" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_update_authenticated" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_items_delete_authenticated" ON quote_line_items;
DROP POLICY IF EXISTS "rate_card_select_authenticated" ON rate_card;
DROP POLICY IF EXISTS "rate_card_insert_authenticated" ON rate_card;
DROP POLICY IF EXISTS "rate_card_update_authenticated" ON rate_card;
DROP POLICY IF EXISTS "rate_card_delete_authenticated" ON rate_card;
DROP POLICY IF EXISTS "Admins can view all signup requests" ON signup_requests;
DROP POLICY IF EXISTS "Anyone can insert signup requests" ON signup_requests;
DROP POLICY IF EXISTS "Admins can update signup requests" ON signup_requests;
DROP POLICY IF EXISTS "Users can manage their own drafts" ON quote_drafts;
DROP POLICY IF EXISTS "security_events_admin_read" ON security_events;
DROP POLICY IF EXISTS "security_events_anyone_insert" ON security_events;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║  COMBINED MIGRATION — Site Services Web App                                ║
-- ║  Al Laith Projects Services LLC — Site Services Department                 ║
-- ║                                                                            ║
-- ║  Paste this entire file into the Supabase SQL Editor and click "Run".      ║
-- ║  Safe to run on a fresh Supabase project.                                  ║
-- ║  Uses IF NOT EXISTS / CREATE OR REPLACE where possible for idempotency.    ║
-- ║                                                                            ║
-- ║  Sources combined (in order):                                              ║
-- ║    1. supabase/schema.sql        — Core tables, enums, indexes, RLS        ║
-- ║    2. migrations/002_delivery_notes.sql  — Delivery Note Engine            ║
-- ║    3. migrations/003_return_notes.sql    — Return Note Engine              ║
-- ║    4. migrations/004_notifications.sql  — Shared notifications             ║
-- ║    5. migrations/005_quotes.sql         — Quote Engine                     ║
-- ║    6. supabase/seed.sql          — Sample data for dev/testing             ║
-- ║    7. migrations/006_auth_signup.sql    — Auth & signup approval         ║
-- ║    8. migrations/007_quote_enhancements.sql — VAT & draft save          ║
-- ║    9. migrations/008_admin_seed_user.sql — Admin account seed             ║
-- ║   10. migrations/009_rls_hardening.sql   — Force RLS on all tables       ║
-- ║   11. migrations/010_supabase_hardening.sql — Timeouts & indexes         ║
-- ║   12. migrations/011_security_hardening.sql — Security events & checks   ║
-- ║                                                                            ║
-- ║  Generated: 2026-03-16 (FULL — all migrations 002-011)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- uuid-ossp: Generates UUIDs for primary keys across all tables.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: ENUM TYPES (from schema.sql)
-- Define constrained value sets for statuses and roles.
-- These enums enforce data integrity at the database level.
-- ═══════════════════════════════════════════════════════════════════════════════

-- asset_status: Tracks the lifecycle state of each asset (plant number).
-- Maps directly to the Fleet Dashboard color-coded calendar cells.
DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM (
    'AVAILABLE',
    'QUOTE',
    'BOOKED',
    'ON HIRE',
    'SOLD TO KSA',
    'IN KSA',
    'SERVICE',
    'YARD',
    'REVISION QUOTES'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_status: Tracks the lifecycle of a project/job.
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'active',
    'completed',
    'quoted',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- document_type: Classifies files stored in Google Drive.
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'quote',
    'delivery-note',
    'purchase-order',
    'return-note',
    'invoice',
    'presentation',
    'msra',
    'catalog'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_role: Role-based access control levels.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'admin',
    'manager',
    'supervisor',
    'operator'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: CORE TABLES (from schema.sql)
-- categories, assets, clients, projects, bookings, documents, users
-- ═══════════════════════════════════════════════════════════════════════════════

-- TABLE: categories
-- Asset categories group plant numbers on the Fleet Dashboard.
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: assets
-- Individual trackable items identified by plant number.
CREATE TABLE IF NOT EXISTS assets (
  plant_number TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  current_status asset_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: clients
-- Customer/company records for quoting, invoicing, and project tracking.
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: projects
-- Jobs/events that group bookings, documents, and financial data.
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status project_status NOT NULL DEFAULT 'quoted',
  job_number TEXT,
  start_date DATE,
  end_date DATE,
  value DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: bookings
-- Asset assignments to projects for specific date ranges.
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id TEXT NOT NULL REFERENCES assets(plant_number) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status asset_status NOT NULL DEFAULT 'BOOKED',
  client_name TEXT,
  project_name TEXT,
  job_number TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  logistics_in_days INTEGER NOT NULL DEFAULT 0,
  logistics_out_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: documents
-- Metadata for files stored in Google Drive.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type document_type NOT NULL,
  file_name TEXT NOT NULL,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: users
-- Application users with role-based access control.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: CORE INDEXES (from schema.sql)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(current_status);
CREATE INDEX IF NOT EXISTS idx_bookings_asset ON bookings(asset_id);
CREATE INDEX IF NOT EXISTS idx_bookings_project ON bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: CORE RLS POLICIES (from schema.sql)
-- v1 Policy: All authenticated users can SELECT all data.
-- Only admin and manager roles can INSERT, UPDATE, DELETE (core tables).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ═══ categories RLS ═══

DO $$ BEGIN
  CREATE POLICY "categories_select_authenticated"
    ON categories FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categories_insert_admin_manager"
    ON categories FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categories_update_admin_manager"
    ON categories FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "categories_delete_admin_manager"
    ON categories FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ assets RLS ═══

DO $$ BEGIN
  CREATE POLICY "assets_select_authenticated"
    ON assets FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "assets_insert_admin_manager"
    ON assets FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "assets_update_admin_manager"
    ON assets FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "assets_delete_admin_manager"
    ON assets FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ clients RLS ═══

DO $$ BEGIN
  CREATE POLICY "clients_select_authenticated"
    ON clients FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clients_insert_admin_manager"
    ON clients FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clients_update_admin_manager"
    ON clients FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "clients_delete_admin_manager"
    ON clients FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ projects RLS ═══

DO $$ BEGIN
  CREATE POLICY "projects_select_authenticated"
    ON projects FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects_insert_admin_manager"
    ON projects FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects_update_admin_manager"
    ON projects FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "projects_delete_admin_manager"
    ON projects FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ bookings RLS ═══

DO $$ BEGIN
  CREATE POLICY "bookings_select_authenticated"
    ON bookings FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bookings_insert_admin_manager_supervisor"
    ON bookings FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'supervisor'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bookings_update_admin_manager_supervisor"
    ON bookings FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'supervisor'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "bookings_delete_admin_manager"
    ON bookings FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ documents RLS ═══

DO $$ BEGIN
  CREATE POLICY "documents_select_authenticated"
    ON documents FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "documents_insert_admin_manager_supervisor"
    ON documents FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'supervisor'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "documents_update_admin_manager_supervisor"
    ON documents FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'supervisor'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "documents_delete_admin_manager"
    ON documents FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══ users RLS ═══

DO $$ BEGIN
  CREATE POLICY "users_select_authenticated"
    ON users FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_insert_admin"
    ON users FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_update_admin"
    ON users FOR UPDATE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "users_delete_admin"
    ON users FOR DELETE TO authenticated
    USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: DELIVERY NOTE ENGINE (from migrations/002_delivery_notes.sql)
-- Tables: delivery_notes, dn_line_items, dn_signatures
-- ═══════════════════════════════════════════════════════════════════════════════

-- Delivery note workflow status
DO $$ BEGIN
  CREATE TYPE dn_status AS ENUM (
    'draft',
    'yard-checked',
    'in-transit',
    'delivered',
    'confirmed',
    'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signature role for DN verification
DO $$ BEGIN
  CREATE TYPE dn_signer_role AS ENUM (
    'yard-team',
    'driver',
    'client'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dn_number TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  booking_id UUID,
  client_name TEXT NOT NULL DEFAULT '',
  status dn_status NOT NULL DEFAULT 'draft',
  delivery_date DATE NOT NULL,
  delivery_address TEXT,
  site_contact_name TEXT,
  site_contact_phone TEXT,
  driver_name TEXT,
  vehicle_registration TEXT,
  notes TEXT,
  yard_checked_by TEXT,
  yard_checked_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dn_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  asset_id TEXT,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  yard_quantity_checked INTEGER,
  client_quantity_received INTEGER,
  condition_at_loading TEXT,
  condition_at_delivery TEXT,
  is_missing BOOLEAN NOT NULL DEFAULT FALSE,
  is_damaged BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dn_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  signer_role dn_signer_role NOT NULL,
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(delivery_note_id, signer_role)
);

-- Delivery Note indexes
CREATE INDEX IF NOT EXISTS idx_dn_project ON delivery_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_dn_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_dn_date ON delivery_notes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_dn_items_dn ON dn_line_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_dn_signatures_dn ON dn_signatures(delivery_note_id);

-- Delivery Note RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read delivery_notes"
    ON delivery_notes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read dn_line_items"
    ON dn_line_items FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read dn_signatures"
    ON dn_signatures FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert delivery_notes"
    ON delivery_notes FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update delivery_notes"
    ON delivery_notes FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert dn_line_items"
    ON dn_line_items FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update dn_line_items"
    ON dn_line_items FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert dn_signatures"
    ON dn_signatures FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: RETURN NOTE ENGINE (from migrations/003_return_notes.sql)
-- Tables: return_notes, rn_line_items, rn_inspections
-- ═══════════════════════════════════════════════════════════════════════════════

-- Return note workflow status
DO $$ BEGIN
  CREATE TYPE rn_status AS ENUM (
    'draft',
    'client-signed',
    'yard-inspected',
    'confirmed',
    'discrepancy'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS return_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  delivery_note_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  project_name TEXT NOT NULL DEFAULT '',
  status rn_status NOT NULL DEFAULT 'draft',
  return_date DATE NOT NULL,
  return_method TEXT,
  client_signature TEXT,
  client_signatory_name TEXT,
  client_signed_at TIMESTAMPTZ,
  yard_inspected_by TEXT,
  yard_inspected_at TIMESTAMPTZ,
  yard_notes TEXT,
  qc_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  qc_notification_sent_at TIMESTAMPTZ,
  document_id UUID,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rn_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_note_id UUID NOT NULL REFERENCES return_notes(id) ON DELETE CASCADE,
  dn_line_item_id UUID,
  asset_id TEXT,
  description TEXT NOT NULL,
  quantity_sent INTEGER NOT NULL DEFAULT 0,
  quantity_returned INTEGER NOT NULL DEFAULT 0,
  quantity_yard_confirmed INTEGER,
  condition TEXT,
  condition_notes TEXT,
  has_discrepancy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rn_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_note_id UUID NOT NULL REFERENCES return_notes(id) ON DELETE CASCADE,
  inspector_name TEXT NOT NULL,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_condition TEXT NOT NULL,
  notes TEXT,
  maintenance_start_date DATE,
  maintenance_end_date DATE,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Return Note indexes
CREATE INDEX IF NOT EXISTS idx_rn_project ON return_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_rn_delivery_note ON return_notes(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_rn_status ON return_notes(status);
CREATE INDEX IF NOT EXISTS idx_rn_date ON return_notes(return_date);
CREATE INDEX IF NOT EXISTS idx_rn_items_rn ON rn_line_items(return_note_id);
CREATE INDEX IF NOT EXISTS idx_rn_inspections_rn ON rn_inspections(return_note_id);

-- Return Note RLS
ALTER TABLE return_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rn_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rn_inspections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read return_notes"
    ON return_notes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read rn_line_items"
    ON rn_line_items FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read rn_inspections"
    ON rn_inspections FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert return_notes"
    ON return_notes FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update return_notes"
    ON return_notes FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert rn_line_items"
    ON rn_line_items FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update rn_line_items"
    ON rn_line_items FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert rn_inspections"
    ON rn_inspections FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: NOTIFICATIONS (from migrations/004_notifications.sql)
-- Cross-engine notification system.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  target_role TEXT,
  target_user_id TEXT,
  reference_id UUID,
  reference_type TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Notification RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read notifications"
    ON notifications FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert notifications"
    ON notifications FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update notifications"
    ON notifications FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: QUOTE ENGINE (from migrations/005_quotes.sql)
-- Tables: quotes, quote_line_items, rate_card
-- ═══════════════════════════════════════════════════════════════════════════════

-- Quote lifecycle status
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft',
    'pending',
    'finalised',
    'cancelled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Supported currencies
DO $$ BEGIN
  CREATE TYPE currency_code AS ENUM (
    'AED',
    'SAR',
    'USD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT NOT NULL UNIQUE,
  revision_number INTEGER NOT NULL DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  job_number TEXT,
  title TEXT NOT NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  currency currency_code NOT NULL DEFAULT 'AED',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  logistics_in_days INTEGER NOT NULL DEFAULT 0,
  logistics_out_days INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  notes TEXT,
  created_by UUID,
  finalised_by UUID,
  finalised_at TIMESTAMPTZ,
  drive_file_id TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  asset_id TEXT,
  description TEXT NOT NULL,
  category_label TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  rate_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (rate_type IN ('daily', 'weekly', 'monthly', 'flat')),
  unit_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  rate_periods DECIMAL(8,2) NOT NULL DEFAULT 1,
  mob_demob_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_applicable BOOLEAN NOT NULL DEFAULT true,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_cross_hire BOOLEAN NOT NULL DEFAULT false,
  supplier_name TEXT,
  supplier_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_card (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  daily_rate DECIMAL(12,2),
  weekly_rate DECIMAL(12,2),
  monthly_rate DECIMAL(12,2),
  mob_demob_rate DECIMAL(12,2),
  currency currency_code NOT NULL DEFAULT 'AED',
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_name, description, client_id)
);

-- Quote Engine indexes
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_project ON quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_parent ON quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_job_number ON quotes(job_number);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_asset ON quote_line_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_rate_card_client ON rate_card(client_id);
CREATE INDEX IF NOT EXISTS idx_rate_card_category ON rate_card(category_name);

-- Quote Engine RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_card ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "quotes_select_authenticated"
    ON quotes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quotes_insert_authenticated"
    ON quotes FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quotes_update_authenticated"
    ON quotes FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quotes_delete_authenticated"
    ON quotes FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quote_line_items_select_authenticated"
    ON quote_line_items FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quote_line_items_insert_authenticated"
    ON quote_line_items FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quote_line_items_update_authenticated"
    ON quote_line_items FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "quote_line_items_delete_authenticated"
    ON quote_line_items FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "rate_card_select_authenticated"
    ON rate_card FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "rate_card_insert_authenticated"
    ON rate_card FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "rate_card_update_authenticated"
    ON rate_card FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "rate_card_delete_authenticated"
    ON rate_card FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: TRIGGERS (from migrations/005_quotes.sql)
-- Auto-update updated_at timestamp on row modifications.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Shared trigger function for updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to quotes table
DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply to rate_card table
DROP TRIGGER IF EXISTS trg_rate_card_updated_at ON rate_card;
CREATE TRIGGER trg_rate_card_updated_at
  BEFORE UPDATE ON rate_card
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply to delivery_notes table
DROP TRIGGER IF EXISTS trg_delivery_notes_updated_at ON delivery_notes;
CREATE TRIGGER trg_delivery_notes_updated_at
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply to return_notes table
DROP TRIGGER IF EXISTS trg_return_notes_updated_at ON return_notes;
CREATE TRIGGER trg_return_notes_updated_at
  BEFORE UPDATE ON return_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: SEED DATA (from seed.sql)
-- Sample categories, clients, projects, assets, bookings, and users.
-- Uses ON CONFLICT DO NOTHING so re-running is safe.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══ CATEGORIES ═══

INSERT INTO categories (id, name, display_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'MIXED ABLUTION',     1),
  ('a0000000-0000-0000-0000-000000000002', 'FEMALE ABLUTION',    2),
  ('a0000000-0000-0000-0000-000000000003', 'MALE ABLUTION',      3),
  ('a0000000-0000-0000-0000-000000000004', 'TOILET TRAILER',     4),
  ('a0000000-0000-0000-0000-000000000005', 'POD ABLUTION',       5),
  ('a0000000-0000-0000-0000-000000000006', 'OPO',                6),
  ('a0000000-0000-0000-0000-000000000007', 'DRS',                7),
  ('a0000000-0000-0000-0000-000000000008', 'FLEXILOO PUMP',      8),
  ('a0000000-0000-0000-0000-000000000009', 'FLEXILOO TOILET',    9),
  ('a0000000-0000-0000-0000-000000000010', 'MESS',              10),
  ('a0000000-0000-0000-0000-000000000011', 'CHEMICAL TOILET',   11),
  ('a0000000-0000-0000-0000-000000000012', 'STORAGE',           12),
  ('a0000000-0000-0000-0000-000000000013', 'WATER TANK',        13)
ON CONFLICT (id) DO NOTHING;

-- ═══ CLIENTS ═══

INSERT INTO clients (id, name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'RCS'),
  ('b0000000-0000-0000-0000-000000000002', 'DWTC'),
  ('b0000000-0000-0000-0000-000000000003', 'ARTIST IN MOTION'),
  ('b0000000-0000-0000-0000-000000000004', 'EMJ EVENTS'),
  ('b0000000-0000-0000-0000-000000000005', 'USHUAIA'),
  ('b0000000-0000-0000-0000-000000000006', 'WICKED TENT'),
  ('b0000000-0000-0000-0000-000000000007', 'AMPLIFY'),
  ('b0000000-0000-0000-0000-000000000008', 'PGA GROUP')
ON CONFLICT (id) DO NOTHING;

-- ═══ PROJECTS ═══

INSERT INTO projects (id, name, client_id, status, job_number, start_date, end_date) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'WORLD TRIATHLON',
    'b0000000-0000-0000-0000-000000000001', 'active', '60601',
    '2026-03-14', '2026-04-01'),
  ('c0000000-0000-0000-0000-000000000002', 'ARAB HEALTH 2026',
    'b0000000-0000-0000-0000-000000000002', 'quoted', '60599',
    '2026-06-01', '2026-06-14'),
  ('c0000000-0000-0000-0000-000000000003', 'EMIRATES PALACE HOTEL AUH',
    'b0000000-0000-0000-0000-000000000003', 'quoted', NULL,
    '2026-04-10', '2026-04-23'),
  ('c0000000-0000-0000-0000-000000000004', 'DFC DUBAI',
    'b0000000-0000-0000-0000-000000000004', 'active', NULL,
    '2026-03-20', '2026-05-15'),
  ('c0000000-0000-0000-0000-000000000005', 'DUBAI HARBOUR',
    'b0000000-0000-0000-0000-000000000005', 'active', '60214/60480',
    '2024-10-15', '2028-10-15'),
  ('c0000000-0000-0000-0000-000000000006', 'MUSHRIF PALACE ABU DHABI',
    'b0000000-0000-0000-0000-000000000006', 'active', NULL,
    '2026-02-26', '2026-05-29'),
  ('c0000000-0000-0000-0000-000000000007', 'GOLF BUGGY EVENT DUBAI',
    'b0000000-0000-0000-0000-000000000007', 'active', '60571',
    '2026-03-10', '2026-03-20'),
  ('c0000000-0000-0000-0000-000000000008', 'CREEK DUBAI',
    'b0000000-0000-0000-0000-000000000008', 'active', '60571',
    '2026-03-01', '2026-06-30')
ON CONFLICT (id) DO NOTHING;

-- ═══ ASSETS ═══

INSERT INTO assets (plant_number, description, category_id, current_status) VALUES
  -- MIXED ABLUTION
  ('4DR.ABL.16.1', '4 Door Ablution 16ft Unit 1',
    'a0000000-0000-0000-0000-000000000001', 'QUOTE'),
  ('4DR.ABL.16.2', '4 Door Ablution 16ft Unit 2',
    'a0000000-0000-0000-0000-000000000001', 'AVAILABLE'),
  ('4DR.ABL.16.3', '4 Door Ablution 16ft Unit 3',
    'a0000000-0000-0000-0000-000000000001', 'AVAILABLE'),
  ('4DR.ABL.20.1', '4 Door Ablution 20ft Unit 1',
    'a0000000-0000-0000-0000-000000000001', 'AVAILABLE'),
  ('ABL.10.2', 'Ablution 10ft Unit 2',
    'a0000000-0000-0000-0000-000000000001', 'QUOTE'),
  -- FEMALE ABLUTION
  ('ABL.F.20.2', 'Female Ablution 20ft Unit 2',
    'a0000000-0000-0000-0000-000000000002', 'QUOTE'),
  ('ABL.F.20.3', 'Female Ablution 20ft Unit 3',
    'a0000000-0000-0000-0000-000000000002', 'QUOTE'),
  ('ABL.F.40.05', 'Female Ablution 40ft Unit 5',
    'a0000000-0000-0000-0000-000000000002', 'BOOKED'),
  ('ABL.F.40.06', 'Female Ablution 40ft Unit 6',
    'a0000000-0000-0000-0000-000000000002', 'BOOKED'),
  ('ABL.F.40.07', 'Female Ablution 40ft Unit 7',
    'a0000000-0000-0000-0000-000000000002', 'SOLD TO KSA'),
  -- MALE ABLUTION
  ('ABL.M.20.1', 'Male Ablution 20ft Unit 1',
    'a0000000-0000-0000-0000-000000000003', 'QUOTE'),
  ('ABL.M.40.05', 'Male Ablution 40ft Unit 5',
    'a0000000-0000-0000-0000-000000000003', 'BOOKED'),
  ('ABL.M.40.06', 'Male Ablution 40ft Unit 6',
    'a0000000-0000-0000-0000-000000000003', 'BOOKED'),
  -- TOILET TRAILER
  ('ABL.T.4D.01', 'Toilet Trailer 4 Door Unit 1',
    'a0000000-0000-0000-0000-000000000004', 'QUOTE'),
  ('ABL.T.4D.02', 'Toilet Trailer 4 Door Unit 2',
    'a0000000-0000-0000-0000-000000000004', 'QUOTE'),
  ('ABL.T.4D.03', 'Toilet Trailer 4 Door Unit 3',
    'a0000000-0000-0000-0000-000000000004', 'AVAILABLE'),
  -- POD ABLUTION
  ('D.ABL.10.2', 'Pod Ablution 10ft Unit 2',
    'a0000000-0000-0000-0000-000000000005', 'AVAILABLE'),
  ('D.ABL.10.6', 'Pod Ablution 10ft Unit 6',
    'a0000000-0000-0000-0000-000000000005', 'BOOKED'),
  -- OPO
  ('CAN.02', 'Cabin Unit 2',
    'a0000000-0000-0000-0000-000000000006', 'AVAILABLE'),
  ('CAN.03', 'Cabin Unit 3',
    'a0000000-0000-0000-0000-000000000006', 'BOOKED'),
  -- DRS
  ('DR.2.T.32.1', 'Dressing Room 2 Toilet 32ft Unit 1',
    'a0000000-0000-0000-0000-000000000007', 'AVAILABLE'),
  ('DR.2.T.32.6', 'Dressing Room 2 Toilet 32ft Unit 6',
    'a0000000-0000-0000-0000-000000000007', 'SOLD TO KSA'),
  ('DR.3.32.1', 'Dressing Room 3 32ft Unit 1',
    'a0000000-0000-0000-0000-000000000007', 'IN KSA'),
  -- FLEXILOO PUMP
  ('FLX.PU.002', 'FlexiLoo Pump Unit 2',
    'a0000000-0000-0000-0000-000000000008', 'ON HIRE'),
  ('FLX.PU.003', 'FlexiLoo Pump Unit 3',
    'a0000000-0000-0000-0000-000000000008', 'ON HIRE'),
  -- FLEXILOO TOILET
  ('FLX.T.001', 'FlexiLoo Toilet Unit 1',
    'a0000000-0000-0000-0000-000000000009', 'AVAILABLE'),
  ('FLX.T.002', 'FlexiLoo Toilet Unit 2',
    'a0000000-0000-0000-0000-000000000009', 'ON HIRE'),
  -- MESS
  ('MESS.12.01', 'Mess Hall 12ft Unit 1',
    'a0000000-0000-0000-0000-000000000010', 'AVAILABLE'),
  ('MESS.12.02', 'Mess Hall 12ft Unit 2',
    'a0000000-0000-0000-0000-000000000010', 'BOOKED'),
  -- CHEMICAL TOILET
  ('PL.001', 'Portaloo Unit 1',
    'a0000000-0000-0000-0000-000000000011', 'AVAILABLE'),
  ('PL.002', 'Portaloo Unit 2',
    'a0000000-0000-0000-0000-000000000011', 'ON HIRE'),
  -- STORAGE
  ('STR.20.01', 'Storage Container 20ft Unit 1',
    'a0000000-0000-0000-0000-000000000012', 'AVAILABLE'),
  ('STR.20.02', 'Storage Container 20ft Unit 2',
    'a0000000-0000-0000-0000-000000000012', 'BOOKED'),
  -- WATER TANK
  ('WT.01', 'Water Tank Unit 1',
    'a0000000-0000-0000-0000-000000000013', 'AVAILABLE'),
  ('WT.02', 'Water Tank Unit 2',
    'a0000000-0000-0000-0000-000000000013', 'ON HIRE')
ON CONFLICT (plant_number) DO NOTHING;

-- ═══ BOOKINGS ═══

INSERT INTO bookings (id, asset_id, project_id, status, client_name, project_name, job_number, start_date, end_date, logistics_in_days, logistics_out_days) VALUES
  ('d0000000-0000-0000-0000-000000000001',
    '4DR.ABL.16.1', 'c0000000-0000-0000-0000-000000000001',
    'QUOTE', 'RCS', 'WORLD TRIATHLON', '60601',
    '2026-03-14', '2026-04-01', 1, 1),
  ('d0000000-0000-0000-0000-000000000002',
    'ABL.10.2', 'c0000000-0000-0000-0000-000000000002',
    'QUOTE', 'DWTC', 'ARAB HEALTH 2026', '60599',
    '2026-06-01', '2026-06-14', 2, 1),
  ('d0000000-0000-0000-0000-000000000003',
    'ABL.F.20.2', 'c0000000-0000-0000-0000-000000000003',
    'QUOTE', 'ARTIST IN MOTION', 'EMIRATES PALACE HOTEL AUH', NULL,
    '2026-04-10', '2026-04-23', 1, 1),
  ('d0000000-0000-0000-0000-000000000004',
    'ABL.F.20.3', 'c0000000-0000-0000-0000-000000000004',
    'QUOTE', 'EMJ EVENTS', 'DFC DUBAI', NULL,
    '2026-03-20', '2026-04-26', 2, 1),
  ('d0000000-0000-0000-0000-000000000005',
    'ABL.F.40.05', 'c0000000-0000-0000-0000-000000000005',
    'BOOKED', 'USHUAIA', 'DUBAI HARBOUR', '60214/60480',
    '2024-10-15', '2028-10-15', 3, 3),
  ('d0000000-0000-0000-0000-000000000006',
    'ABL.F.40.06', 'c0000000-0000-0000-0000-000000000005',
    'BOOKED', 'USHUAIA', 'DUBAI HARBOUR', '60214/60480',
    '2024-10-15', '2028-10-15', 3, 3),
  ('d0000000-0000-0000-0000-000000000007',
    'ABL.F.40.07', NULL,
    'SOLD TO KSA', NULL, NULL, NULL,
    '2023-01-01', '2028-12-31', 0, 0),
  ('d0000000-0000-0000-0000-000000000008',
    'ABL.M.20.1', 'c0000000-0000-0000-0000-000000000003',
    'QUOTE', 'ARTIST IN MOTION', 'EMIRATES PALACE HOTEL AUH', NULL,
    '2026-04-10', '2026-04-23', 1, 1),
  ('d0000000-0000-0000-0000-000000000009',
    'ABL.M.40.05', 'c0000000-0000-0000-0000-000000000005',
    'BOOKED', 'USHUAIA', 'DUBAI HARBOUR', '60214/60480',
    '2024-10-15', '2028-10-15', 3, 3),
  ('d0000000-0000-0000-0000-000000000010',
    'ABL.M.40.06', 'c0000000-0000-0000-0000-000000000005',
    'BOOKED', 'USHUAIA', 'DUBAI HARBOUR', '60214/60480',
    '2024-10-15', '2028-10-15', 3, 3),
  ('d0000000-0000-0000-0000-000000000011',
    'ABL.T.4D.01', 'c0000000-0000-0000-0000-000000000001',
    'QUOTE', 'RCS', 'WORLD TRIATHLON', NULL,
    '2026-03-14', '2026-04-01', 1, 1),
  ('d0000000-0000-0000-0000-000000000012',
    'ABL.T.4D.02', 'c0000000-0000-0000-0000-000000000001',
    'QUOTE', 'RCS', 'WORLD TRIATHLON', NULL,
    '2026-03-14', '2026-04-01', 1, 1),
  ('d0000000-0000-0000-0000-000000000013',
    'D.ABL.10.6', 'c0000000-0000-0000-0000-000000000005',
    'BOOKED', 'USHUAIA', 'DUBAI HARBOUR', '60214/60480',
    '2024-10-15', '2028-10-15', 3, 3),
  ('d0000000-0000-0000-0000-000000000014',
    'CAN.03', 'c0000000-0000-0000-0000-000000000006',
    'BOOKED', 'WICKED TENT', 'MUSHRIF PALACE ABU DHABI', NULL,
    '2026-02-26', '2026-05-29', 2, 2),
  ('d0000000-0000-0000-0000-000000000015',
    'DR.2.T.32.6', NULL,
    'SOLD TO KSA', NULL, NULL, NULL,
    '2023-03-01', '2028-03-01', 0, 0),
  ('d0000000-0000-0000-0000-000000000016',
    'DR.3.32.1', NULL,
    'IN KSA', NULL, NULL, NULL,
    '2023-01-01', '2028-12-31', 0, 0),
  ('d0000000-0000-0000-0000-000000000017',
    'FLX.PU.002', 'c0000000-0000-0000-0000-000000000006',
    'ON HIRE', 'WICKED TENT', 'MUSHRIF PALACE ABU DHABI', NULL,
    '2026-02-26', '2026-05-29', 1, 1),
  ('d0000000-0000-0000-0000-000000000018',
    'FLX.PU.003', 'c0000000-0000-0000-0000-000000000006',
    'ON HIRE', 'WICKED TENT', 'MUSHRIF PALACE ABU DHABI', NULL,
    '2026-02-26', '2026-05-29', 1, 1),
  ('d0000000-0000-0000-0000-000000000019',
    'FLX.T.002', 'c0000000-0000-0000-0000-000000000006',
    'ON HIRE', 'WICKED TENT', 'MUSHRIF PALACE ABU DHABI', NULL,
    '2026-02-26', '2026-05-29', 1, 1),
  ('d0000000-0000-0000-0000-000000000020',
    'MESS.12.02', 'c0000000-0000-0000-0000-000000000004',
    'BOOKED', 'EMJ EVENTS', 'DFC DUBAI', NULL,
    '2026-03-20', '2026-05-15', 2, 2),
  ('d0000000-0000-0000-0000-000000000021',
    'PL.002', 'c0000000-0000-0000-0000-000000000007',
    'ON HIRE', 'AMPLIFY', 'GOLF BUGGY EVENT DUBAI', '60571',
    '2026-03-10', '2026-03-20', 1, 1),
  ('d0000000-0000-0000-0000-000000000022',
    'STR.20.02', 'c0000000-0000-0000-0000-000000000008',
    'BOOKED', 'PGA GROUP', 'CREEK DUBAI', '60571',
    '2026-03-01', '2026-06-30', 2, 2),
  ('d0000000-0000-0000-0000-000000000023',
    'WT.02', 'c0000000-0000-0000-0000-000000000001',
    'ON HIRE', 'RCS', 'WORLD TRIATHLON', '60601',
    '2026-03-14', '2026-04-01', 1, 1)
ON CONFLICT (id) DO NOTHING;

-- ═══ USERS ═══

INSERT INTO users (id, email, name, role) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'admin@allaith.com', 'Admin User', 'admin'),
  ('e0000000-0000-0000-0000-000000000002', 'manager@allaith.com', 'Site Manager', 'manager'),
  ('e0000000-0000-0000-0000-000000000003', 'supervisor@allaith.com', 'Yard Supervisor', 'supervisor'),
  ('e0000000-0000-0000-0000-000000000004', 'operator@allaith.com', 'Field Operator', 'operator')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: VERIFICATION
-- Shows all tables created by this migration.
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║  ADDITIONAL MIGRATIONS (006-011) — Added 2026-03-16                         ║
-- ║  Append to the base combined migration above.                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- supabase/migrations/006_auth_signup.sql
-- Auth & Signup migration for the Site Services web application.
-- Adds account status tracking to app_users and a signup_requests table
-- for admin-approved account registration.
--
-- Written by: Auth system, Admin Settings (signup approval workflow).
-- Read by: Auth module (status checks), Settings engine (pending signups list).

-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTER TABLE: users (app_users)
-- Add a status column so admins can suspend or deny user accounts.
-- Existing users default to 'active' so nothing breaks.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'pending', 'denied', 'suspended'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: signup_requests
-- Holds pending account registration requests submitted via the /signup page.
-- Admins review these in the Settings engine Users tab and approve or deny.
--
-- Flow:
-- 1. User fills out /signup form -> Supabase Auth user created + row inserted here
-- 2. Admin sees the request in Settings > Users > Pending Signups
-- 3. Admin clicks Approve -> status='approved', app_users row created with role
-- 4. Admin clicks Deny -> status='denied', no app_users row created
--
-- Read by: Settings engine (pending signup list).
-- Written by: Signup page (insert), Settings engine (approve/deny updates).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Email used for registration (matches the Supabase Auth user email)
  email TEXT NOT NULL,
  -- Full name provided during signup
  full_name TEXT NOT NULL,
  -- The role the user is requesting (admin must approve)
  role_requested TEXT NOT NULL CHECK (role_requested IN ('operator', 'supervisor', 'manager')),
  -- Approval workflow status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Which admin reviewed this request (FK to users table)
  reviewed_by UUID REFERENCES users(id),
  -- When the review happened
  reviewed_at TIMESTAMPTZ,
  -- Optional admin notes about the approval/denial decision
  notes TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES: signup_requests
-- Admins can read and update all requests.
-- Anyone (including unauthenticated via anon key) can insert a signup request.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view all signup requests in the Settings engine
CREATE POLICY "Admins can view all signup requests"
  ON signup_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone can submit a signup request (the signup form runs before the user has a role)
CREATE POLICY "Anyone can insert signup requests"
  ON signup_requests FOR INSERT
  WITH CHECK (true);

-- Only admins can approve or deny signup requests
CREATE POLICY "Admins can update signup requests"
  ON signup_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- 007_quote_enhancements.sql
-- Adds VAT configuration columns to quotes table, creates quote_drafts table
-- for server-side auto-save, and adds vat_exempt column to quote line items.

-- Add VAT columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN DEFAULT true;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 5.00;

-- Quote drafts table for auto-save
CREATE TABLE IF NOT EXISTS quote_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  quote_number TEXT,
  form_data JSONB NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quote_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own drafts" ON quote_drafts
  FOR ALL USING (auth.uid() = user_id);

-- Add vat_exempt to quote line items
ALTER TABLE quote_line_items ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN DEFAULT false;


-- 008_admin_seed_user.sql
-- Seeds the admin user (calo.lategan@allaith.com) into both auth.users and app users table.
-- Password: 1234 (hashed with bcrypt via pgcrypto)
--
-- Run in Supabase SQL Editor AFTER combined-migration.sql and migrations 002-007.
-- This creates a real login-able user, not just an app_users row.
--
-- SAFE TO RE-RUN: Deletes existing entries before inserting.

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTH USER: Create Supabase Auth entry so the user can sign in with email/password
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  admin_uid UUID := 'e0000000-0000-0000-0000-000000000099';
BEGIN
  -- Remove existing entries if re-running this migration
  DELETE FROM auth.identities WHERE user_id = admin_uid;
  DELETE FROM auth.users WHERE id = admin_uid;
  DELETE FROM auth.users WHERE email = 'calo.lategan@allaith.com';
  DELETE FROM users WHERE email = 'calo.lategan@allaith.com';

  -- Insert into Supabase Auth (auth.users)
  -- raw_app_meta_data and raw_user_meta_data are REQUIRED by Supabase Auth
  -- provider = 'email' tells Supabase this user authenticates via email/password
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    admin_uid,
    '00000000-0000-0000-0000-000000000000',
    'calo.lategan@allaith.com',
    crypt('1234', gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Calo Lategan", "email": "calo.lategan@allaith.com"}'::jsonb,
    FALSE,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- IDENTITY: Required by Supabase Auth for email provider login
  -- Without this row, signInWithPassword will fail
  -- ═══════════════════════════════════════════════════════════════════════════

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_uid,
    'calo.lategan@allaith.com',
    jsonb_build_object(
      'sub', admin_uid::text,
      'email', 'calo.lategan@allaith.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- APP USER: Create the application-level user record with admin role
  -- This row is what the app reads for RBAC (role-based access control)
  -- ═══════════════════════════════════════════════════════════════════════════

  INSERT INTO users (id, email, name, role) VALUES
    (admin_uid, 'calo.lategan@allaith.com', 'Calo Lategan', 'admin');

END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 009_rls_hardening.sql
-- Force Row Level Security on ALL public tables.
--
-- By default, table owners (typically the service_role) bypass RLS even
-- when RLS is enabled. FORCE ROW LEVEL SECURITY ensures that RLS policies
-- are applied to ALL roles, including the table owner. This prevents
-- accidental data leaks if a service_role connection is exposed.
--
-- Safe to run multiple times — ALTER TABLE ... FORCE ROW LEVEL SECURITY
-- is idempotent.
--
-- Connected to: All Supabase tables in the public schema.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- Enable RLS if not already enabled (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Force RLS for table owners too (prevents service_role bypass)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'RLS forced on table: %', t;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 010_supabase_hardening.sql
-- Supabase Configuration Hardening — Timeouts, Indexes, Performance
--
-- PURPOSE: Harden the Supabase PostgreSQL instance against resource
-- exhaustion and slow queries. Adds query timeouts to prevent runaway
-- statements, kills stale transactions, and creates indexes that
-- accelerate the RLS policy subqueries used on every authenticated request.
--
-- CONTEXT: Every RLS policy in this app does:
--   SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN (...)
-- The users.id PK index handles the id lookup, but adding a composite
-- index on (id, role) turns the role filter into an index-only scan
-- instead of a heap fetch + filter. With 5-10 users this is negligible
-- today, but it's free insurance and good practice.
--
-- Safe to run multiple times — all statements are idempotent.
-- Run this in the Supabase SQL Editor manually.
--
-- Connected to: All RLS policies, all authenticated queries.
-- Depends on: 009_rls_hardening.sql (RLS must be enabled first)
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: QUERY TIMEOUTS
-- Prevent long-running queries from hogging database connections.
-- These apply to ALL new sessions (existing sessions keep their settings
-- until they reconnect).
-- ═══════════════════════════════════════════════════════════════════════════

-- 30-second hard cap on any single SQL statement.
-- Protects against: accidental full-table scans, missing WHERE clauses,
-- infinite recursive CTEs, or any query that takes too long.
-- If a legitimate report needs more time, it should use a dedicated
-- service_role connection with an explicit SET statement_timeout.
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Kill any session that has been idle inside an open transaction for 60s.
-- Protects against: forgotten BEGIN without COMMIT, client disconnects
-- that leave locks held, or app bugs that open transactions and never
-- close them. These zombie transactions block autovacuum and can cause
-- table bloat over time.
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '60s';


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: RLS POLICY PERFORMANCE INDEXES
-- The users table is queried on every single authenticated request via
-- RLS policy subqueries. These indexes ensure those lookups are as fast
-- as possible.
-- ═══════════════════════════════════════════════════════════════════════════

-- Composite index: covers the exact RLS pattern
--   WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager')
-- PostgreSQL can satisfy this entirely from the index without touching
-- the heap (index-only scan), since both columns are in the index.
-- The PK index on (id) alone would require a heap fetch to check role.
CREATE INDEX IF NOT EXISTS idx_users_id_role ON users(id, role);

-- Email lookup index: used by login flows, user search, and the UNIQUE
-- constraint already creates an implicit index — but an explicit one
-- makes the intent clear and ensures it survives any future schema changes
-- that might drop the UNIQUE constraint without adding an index.
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Role-only index: useful for admin queries like "list all managers" or
-- dashboard widgets that count users by role. Also supports any future
-- RLS policies that filter by role without an id condition.
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: FOREIGN KEY INDEXES FOR JOIN PERFORMANCE
-- PostgreSQL does NOT automatically create indexes on foreign key columns.
-- These indexes speed up JOINs, CASCADE deletes, and WHERE filters on
-- columns that reference other tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- quotes.created_by references auth.uid() — used to filter "my quotes"
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);

-- delivery_notes.created_by — used to filter "my delivery notes"
CREATE INDEX IF NOT EXISTS idx_dn_created_by ON delivery_notes(created_by);

-- return_notes.created_by — used to filter "my return notes"
CREATE INDEX IF NOT EXISTS idx_rn_created_by ON return_notes(created_by);

-- notifications.target_user_id already has an index (from 004_notifications),
-- but notifications.created_by does not
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: VERIFICATION
-- Log what we did so the admin can confirm in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✓ 010_supabase_hardening.sql applied successfully';
  RAISE NOTICE '  - statement_timeout = 30s';
  RAISE NOTICE '  - idle_in_transaction_session_timeout = 60s';
  RAISE NOTICE '  - idx_users_id_role (composite for RLS)';
  RAISE NOTICE '  - idx_users_email';
  RAISE NOTICE '  - idx_users_role';
  RAISE NOTICE '  - idx_quotes_created_by';
  RAISE NOTICE '  - idx_dn_created_by';
  RAISE NOTICE '  - idx_rn_created_by';
  RAISE NOTICE '  - idx_notifications_created_by';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 011_security_hardening.sql
-- Security audit hardening: security event logging, RLS re-verification,
-- and business-logic constraints on financial tables.
--
-- Safe to run multiple times — all statements are idempotent (IF NOT EXISTS,
-- DO $$ with EXCEPTION handlers, ADD CONSTRAINT IF NOT EXISTS pattern).
--
-- Connected to: All public tables (RLS), quote_line_items (constraints),
--               new security_events table (audit logging).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: SECURITY EVENTS TABLE
-- Centralised audit log for security-relevant events (failed logins,
-- rate-limit hits, suspicious payloads). Edge middleware logs via the
-- anon key; only admins can read entries.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ip_address TEXT,
  path TEXT,
  method TEXT,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index on created_at for time-range queries (dashboard, alerts)
CREATE INDEX IF NOT EXISTS idx_security_events_created
  ON security_events(created_at DESC);

-- Index on severity for filtering high-priority events
CREATE INDEX IF NOT EXISTS idx_security_events_severity
  ON security_events(severity);

-- Index on event_type for grouping (e.g., 'rate_limit', 'auth_failure')
CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON security_events(event_type);

-- RLS: enable and force for the security_events table
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;

-- Policy: only admins can SELECT security events
DO $$ BEGIN
  CREATE POLICY "security_events_admin_read"
    ON security_events FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy: anyone (including anon key from Edge middleware) can INSERT
-- This allows the rate-limiting middleware to log events without
-- requiring an authenticated session.
DO $$ BEGIN
  CREATE POLICY "security_events_anyone_insert"
    ON security_events FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: RE-VERIFY RLS ON ALL PUBLIC TABLES
-- Re-runs the same logic as migration 009 to catch any tables created
-- after that migration ran. Fully idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'RLS verified on table: %', t;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: BUSINESS-LOGIC CONSTRAINTS ON QUOTE LINE ITEMS
-- Prevents negative/zero quantities and negative rates at the database
-- level. Even if application validation is bypassed, the DB rejects
-- invalid financial data.
-- ═══════════════════════════════════════════════════════════════════════════

-- Quantity must be a positive integer (you cannot deliver 0 or -3 generators)
DO $$ BEGIN
  ALTER TABLE quote_line_items
    ADD CONSTRAINT positive_quantity CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint positive_quantity already exists — skipping.';
END $$;

-- Unit rate must be non-negative (zero is valid for complimentary items)
DO $$ BEGIN
  ALTER TABLE quote_line_items
    ADD CONSTRAINT non_negative_rate CHECK (unit_rate >= 0);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint non_negative_rate already exists — skipping.';
END $$;

-- Rate periods must be positive (at least 1 day/week/month)
DO $$ BEGIN
  ALTER TABLE quote_line_items
    ADD CONSTRAINT positive_rate_periods CHECK (rate_periods > 0);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint positive_rate_periods already exists — skipping.';
END $$;

-- Mob/demob fee must be non-negative
DO $$ BEGIN
  ALTER TABLE quote_line_items
    ADD CONSTRAINT non_negative_mob_demob CHECK (mob_demob_fee >= 0);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Constraint non_negative_mob_demob already exists — skipping.';
END $$;

