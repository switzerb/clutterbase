-- Enums

CREATE TYPE date_precision_type AS ENUM ('year', 'decade');
CREATE TYPE file_type_enum AS ENUM ('photo', 'document', 'other');

-- People

CREATE TABLE people (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             TEXT NOT NULL,
  birth_year            INTEGER,
  death_year            INTEGER,
  notes                 TEXT,
  profile_photo_item_id UUID
);

-- Family units (GEDCOM-inspired genealogy model).
-- Either parent can be null for single-parent or unknown-parent units.

CREATE TABLE family_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_1_id UUID REFERENCES people(id) ON DELETE SET NULL,
  parent_2_id UUID REFERENCES people(id) ON DELETE SET NULL
);

-- A person is a child in at most one family unit (enforced by UNIQUE on person_id).

CREATE TABLE family_unit_children (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id UUID NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE (person_id)
);

-- Tag categories (place, event, topic, format).

CREATE TABLE tag_categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE,
  color TEXT
);

-- Tags belong to exactly one category; slug is unique within a category.

CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tag_categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  UNIQUE (category_id, slug)
);

-- Items are the core archive entity. Only title and file_path are required.
-- date_year + date_precision together represent flexible date info (year or decade).
-- uploaded_by is nullable so items survive user removal.

CREATE TABLE items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  file_path      TEXT NOT NULL,
  thumbnail_path TEXT,
  file_type      file_type_enum NOT NULL DEFAULT 'other',
  date_year      INTEGER,
  date_precision date_precision_type,
  uploaded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to keep updated_at current on every row update.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add profile_photo FK now that items exists.

ALTER TABLE people
  ADD CONSTRAINT people_profile_photo_item_id_fkey
  FOREIGN KEY (profile_photo_item_id) REFERENCES items(id) ON DELETE SET NULL;

-- Junction: items ↔ tags (many-to-many).

CREATE TABLE item_tags (
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Junction: items ↔ people (many-to-many).

CREATE TABLE item_people (
  item_id   UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, person_id)
);

-- Bidirectional item relationships stored once.
-- item_a_id is always the lexicographically smaller UUID (enforced by ordered_pair)
-- so (A, B) and (B, A) can't both exist. Application code must normalise before insert.

CREATE TABLE item_relationships (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_a_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_b_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  note      TEXT,
  CONSTRAINT different_items CHECK (item_a_id != item_b_id),
  CONSTRAINT ordered_pair    CHECK (item_a_id < item_b_id),
  UNIQUE (item_a_id, item_b_id)
);

-- Indexes

CREATE INDEX items_date_year_idx              ON items (date_year);
CREATE INDEX items_file_type_idx              ON items (file_type);
CREATE INDEX items_uploaded_by_idx            ON items (uploaded_by);
CREATE INDEX item_tags_tag_id_idx             ON item_tags (tag_id);
CREATE INDEX item_people_person_id_idx        ON item_people (person_id);
CREATE INDEX item_relationships_item_b_id_idx ON item_relationships (item_b_id);
CREATE INDEX tags_slug_idx                    ON tags (slug);

-- Full-text search: generated tsvector column over title + description.

ALTER TABLE items
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX items_search_vector_idx ON items USING GIN (search_vector);

-- Seed: default tag categories (2.10).

INSERT INTO tag_categories (name, color) VALUES
  ('place',  '#3B82F6'),
  ('event',  '#8B5CF6'),
  ('topic',  '#10B981'),
  ('format', '#F59E0B');