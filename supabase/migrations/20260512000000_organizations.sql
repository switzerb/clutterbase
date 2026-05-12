-- ── Organizations ─────────────────────────────────────────────────────────────
--
-- Every piece of data (items, people, tags, family units) belongs to exactly
-- one organization. Users are assigned an organization_id in their JWT
-- app_metadata (alongside role). All RLS policies enforce this boundary.
--
-- Setup after running this migration:
--   1. Create your first org:
--        INSERT INTO organizations (name) VALUES ('Your Family Name') RETURNING id;
--   2. Assign existing tag_categories to that org:
--        UPDATE tag_categories SET organization_id = '<org-id>';
--   3. Set organization_id (and role if not done) on your admin user via the
--      Supabase Auth dashboard → Users → Edit user → app_metadata:
--        { "role": "admin", "organization_id": "<org-id>" }

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read own org"
  ON organizations FOR SELECT TO authenticated
  USING (id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID);

-- Helper: returns the calling user's organization_id from their JWT.
-- STABLE + SECURITY DEFINER so it's inlineable and always reads the real JWT.
CREATE OR REPLACE FUNCTION org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'organization_id')::UUID
$$;

-- ── Add organization_id to core tables ───────────────────────────────────────

ALTER TABLE people         ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE family_units   ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE tag_categories ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE items          ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- tag_categories previously had a global UNIQUE(name); now uniqueness is per org.
ALTER TABLE tag_categories DROP CONSTRAINT tag_categories_name_key;
ALTER TABLE tag_categories ADD CONSTRAINT tag_categories_org_name_key
  UNIQUE (organization_id, name);

CREATE INDEX people_organization_id_idx         ON people         (organization_id);
CREATE INDEX family_units_organization_id_idx   ON family_units   (organization_id);
CREATE INDEX tag_categories_organization_id_idx ON tag_categories (organization_id);
CREATE INDEX items_organization_id_idx          ON items          (organization_id);

-- ── Update RLS policies to scope by organization ──────────────────────────────

-- people
DROP POLICY "authenticated users can read people"   ON people;
DROP POLICY "authenticated users can insert people" ON people;
DROP POLICY "authenticated users can update people" ON people;
DROP POLICY "admins can delete people"              ON people;

CREATE POLICY "org members can read people"
  ON people FOR SELECT TO authenticated USING (organization_id = org_id());

CREATE POLICY "org members can insert people"
  ON people FOR INSERT TO authenticated WITH CHECK (organization_id = org_id());

CREATE POLICY "org members can update people"
  ON people FOR UPDATE TO authenticated USING (organization_id = org_id());

CREATE POLICY "org admins can delete people"
  ON people FOR DELETE TO authenticated
  USING (organization_id = org_id() AND is_admin());

-- family_units
DROP POLICY "authenticated users can read family_units"   ON family_units;
DROP POLICY "authenticated users can insert family_units" ON family_units;
DROP POLICY "authenticated users can update family_units" ON family_units;
DROP POLICY "admins can delete family_units"              ON family_units;

CREATE POLICY "org members can read family_units"
  ON family_units FOR SELECT TO authenticated USING (organization_id = org_id());

CREATE POLICY "org members can insert family_units"
  ON family_units FOR INSERT TO authenticated WITH CHECK (organization_id = org_id());

CREATE POLICY "org members can update family_units"
  ON family_units FOR UPDATE TO authenticated USING (organization_id = org_id());

CREATE POLICY "org admins can delete family_units"
  ON family_units FOR DELETE TO authenticated
  USING (organization_id = org_id() AND is_admin());

-- tag_categories
DROP POLICY "authenticated users can read tag_categories" ON tag_categories;
DROP POLICY "admins can insert tag_categories"           ON tag_categories;
DROP POLICY "admins can update tag_categories"           ON tag_categories;
DROP POLICY "admins can delete tag_categories"           ON tag_categories;

CREATE POLICY "org members can read tag_categories"
  ON tag_categories FOR SELECT TO authenticated USING (organization_id = org_id());

CREATE POLICY "org admins can insert tag_categories"
  ON tag_categories FOR INSERT TO authenticated
  WITH CHECK (organization_id = org_id() AND is_admin());

CREATE POLICY "org admins can update tag_categories"
  ON tag_categories FOR UPDATE TO authenticated
  USING (organization_id = org_id() AND is_admin());

CREATE POLICY "org admins can delete tag_categories"
  ON tag_categories FOR DELETE TO authenticated
  USING (organization_id = org_id() AND is_admin());

-- items
DROP POLICY "authenticated users can read items"   ON items;
DROP POLICY "authenticated users can insert items" ON items;
DROP POLICY "authenticated users can update items" ON items;
DROP POLICY "admins can delete items"              ON items;

CREATE POLICY "org members can read items"
  ON items FOR SELECT TO authenticated USING (organization_id = org_id());

CREATE POLICY "org members can insert items"
  ON items FOR INSERT TO authenticated WITH CHECK (organization_id = org_id());

CREATE POLICY "org members can update items"
  ON items FOR UPDATE TO authenticated USING (organization_id = org_id());

CREATE POLICY "org admins can delete items"
  ON items FOR DELETE TO authenticated
  USING (organization_id = org_id() AND is_admin());
