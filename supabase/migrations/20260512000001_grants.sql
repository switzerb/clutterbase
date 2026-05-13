-- Grant standard table/function privileges to Supabase API roles.
-- RLS policies still enforce row-level access; these GRANTs just let
-- PostgREST/the API roles touch the tables at all.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated, service_role;

-- Apply the same defaults to any future tables/functions created in public.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;