-- Enable RLS on all tables.

ALTER TABLE people               ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_unit_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_people          ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_relationships   ENABLE ROW LEVEL SECURITY;

-- Helper: returns true when the calling user has role = 'admin' in their JWT app_metadata.
-- SECURITY DEFINER so it runs as the function owner and can access auth.jwt().

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- people

CREATE POLICY "authenticated users can read people"
  ON people FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert people"
  ON people FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update people"
  ON people FOR UPDATE TO authenticated USING (true);

CREATE POLICY "admins can delete people"
  ON people FOR DELETE TO authenticated USING (is_admin());

-- family_units

CREATE POLICY "authenticated users can read family_units"
  ON family_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert family_units"
  ON family_units FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update family_units"
  ON family_units FOR UPDATE TO authenticated USING (true);

CREATE POLICY "admins can delete family_units"
  ON family_units FOR DELETE TO authenticated USING (is_admin());

-- family_unit_children

CREATE POLICY "authenticated users can read family_unit_children"
  ON family_unit_children FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert family_unit_children"
  ON family_unit_children FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update family_unit_children"
  ON family_unit_children FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated users can delete family_unit_children"
  ON family_unit_children FOR DELETE TO authenticated USING (true);

-- tag_categories: read for all authenticated; write only for admins.

CREATE POLICY "authenticated users can read tag_categories"
  ON tag_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can insert tag_categories"
  ON tag_categories FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins can update tag_categories"
  ON tag_categories FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete tag_categories"
  ON tag_categories FOR DELETE TO authenticated USING (is_admin());

-- tags: read for all authenticated; write only for admins.

CREATE POLICY "authenticated users can read tags"
  ON tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can insert tags"
  ON tags FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins can update tags"
  ON tags FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete tags"
  ON tags FOR DELETE TO authenticated USING (is_admin());

-- items

CREATE POLICY "authenticated users can read items"
  ON items FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert items"
  ON items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update items"
  ON items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "admins can delete items"
  ON items FOR DELETE TO authenticated USING (is_admin());

-- item_tags

CREATE POLICY "authenticated users can read item_tags"
  ON item_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert item_tags"
  ON item_tags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can delete item_tags"
  ON item_tags FOR DELETE TO authenticated USING (true);

-- item_people

CREATE POLICY "authenticated users can read item_people"
  ON item_people FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert item_people"
  ON item_people FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can delete item_people"
  ON item_people FOR DELETE TO authenticated USING (true);

-- item_relationships

CREATE POLICY "authenticated users can read item_relationships"
  ON item_relationships FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert item_relationships"
  ON item_relationships FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can update item_relationships"
  ON item_relationships FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated users can delete item_relationships"
  ON item_relationships FOR DELETE TO authenticated USING (true);