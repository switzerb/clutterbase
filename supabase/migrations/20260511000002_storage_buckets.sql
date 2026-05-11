-- Create private storage buckets.
-- 'public' = false means no file is accessible without a signed URL.

INSERT INTO storage.buckets (id, name, public) VALUES
  ('originals',  'originals',  false),
  ('thumbnails', 'thumbnails', false);

-- Storage RLS policies on storage.objects.

-- Read: any authenticated user can fetch files from either bucket.

CREATE POLICY "authenticated users can read originals"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'originals');

CREATE POLICY "authenticated users can read thumbnails"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'thumbnails');

-- Insert: authenticated users can upload to either bucket.

CREATE POLICY "authenticated users can upload to originals"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'originals');

CREATE POLICY "authenticated users can upload to thumbnails"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

-- Delete: admins only (reuses the is_admin() function from the RLS migration).

CREATE POLICY "admins can delete from originals"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'originals' AND is_admin());

CREATE POLICY "admins can delete from thumbnails"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'thumbnails' AND is_admin());