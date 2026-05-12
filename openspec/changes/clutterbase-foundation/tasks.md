## 1. Project Setup

- [x] 1.1 Create GitHub repository for clutterbase
- [x] 1.2 Initialize Next.js app with App Router and TypeScript
- [x] 1.3 Connect Vercel project to GitHub repository for CI/CD
- [x] 1.4 Configure Supabase project (enable Auth, Storage, and database)
- [x] 1.5 Add environment variables to Vercel and local .env.local (Supabase URL, anon key, service role key)
- [x] 1.6 Install and configure Supabase client libraries (@supabase/supabase-js, @supabase/ssr)
- [x] 1.7 Install and configure Tailwind CSS v4
- [x] 1.8 Install and configure HeroUI v3 component library

## 2. Database Schema

- [x] 2.1 Create `people` table (id, full_name, birth_year, death_year, notes, profile_photo_item_id)
- [x] 2.2 Create `family_units` table (id, parent_1_id, parent_2_id)
- [x] 2.3 Create `family_unit_children` table (id, family_unit_id, person_id)
- [x] 2.4 Create `tag_categories` table (id, name, color)
- [x] 2.5 Create `tags` table (id, category_id, name, slug)
- [x] 2.6 Create `items` table (id, title, description, file_path, thumbnail_path, file_type, date_year, date_precision, uploaded_by, created_at)
- [x] 2.7 Create `item_tags` junction table (item_id, tag_id)
- [x] 2.8 Create `item_people` junction table (item_id, person_id)
- [x] 2.9 Create `item_relationships` table (id, item_a_id, item_b_id, note)
- [x] 2.10 Seed default tag categories (place, event, topic, format)

## 3. Authentication

- [x] 3.1 Configure Supabase Auth (enable email/password and magic link)
- [x] 3.2 Write RLS policies: authenticated users can read all items, tags, people
- [x] 3.3 Write RLS policies: authenticated users can insert items and item metadata
- [x] 3.4 Write RLS policies: admin role can delete items and manage tag categories
- [x] 3.5 Build sign-in page (email input, magic link + password options)
- [x] 3.6 Implement session middleware to protect all routes
- [x] 3.7 Build admin role check utility and protect admin routes

## 4. File Storage

- [x] 4.1 Create private Supabase Storage buckets: `originals` and `thumbnails`
- [x] 4.2 Configure Storage RLS: only authenticated users can read; only authenticated users can insert their own files
- [x] 4.3 Implement signed URL generation helper (1-hour expiry) for authenticated file access
- [x] 4.4 Implement thumbnail generation on upload (WebP, reduced resolution)
- [x] 4.5 Implement file path convention: `originals/items/{id}/original.{ext}` and `thumbnails/items/{id}/thumb.webp`

## 5. Upload

- [x] 5.1 Build upload page with drag-and-drop zone and file picker
- [x] 5.2 Implement single file upload flow: upload to Storage, create item record
- [x] 5.3 Implement batch upload: process files independently, show per-file progress
- [x] 5.4 Auto-derive item title from filename when no title is provided
- [x] 5.5 Infer file_type from MIME type on upload
- [x] 5.6 Trigger thumbnail generation after successful file storage
- [x] 5.7 Display per-file upload progress, success, and error states with retry

## 6. People & Genealogy

- [x] 6.1 Build people list page with search by name
- [x] 6.2 Build person detail/profile page (name, dates, notes, linked items gallery)
- [x] 6.3 Build create/edit person form
- [ ] 6.4 Implement linking items to people (on item detail page)
- [x] 6.5 Build family unit management UI (add parents, add children with relationship type)
- [x] 6.6 Implement family tree navigation from person profile (parents up, children down)
- [x] 6.7 Support setting a person's profile photo from an existing item

## 7. Tagging

- [ ] 7.1 Build tag management admin page (create/rename/delete categories and tags)
- [ ] 7.2 Implement tag selector component (grouped by category, searchable)
- [ ] 7.3 Implement applying/removing tags on item detail page
- [ ] 7.4 Display tags grouped by category on item detail page

## 8. Item Relationships

- [ ] 8.1 Build related items UI section on item detail page (thumbnails + notes)
- [ ] 8.2 Implement adding a related item (search for item, optional note, save)
- [ ] 8.3 Implement removing a related item relationship
- [ ] 8.4 Ensure bidirectional display: both items show each other as related

## 9. Search & Gallery

- [ ] 9.1 Build gallery grid page with item thumbnail cards (title, date)
- [ ] 9.2 Implement keyword search input (full-text on title and description)
- [ ] 9.3 Implement tag filter sidebar (grouped by category, multi-select)
- [ ] 9.4 Implement people filter
- [ ] 9.5 Implement date/decade range filter
- [ ] 9.6 Implement file type filter (photo, document, other)
- [ ] 9.7 Implement sort controls (item date asc/desc, upload date asc/desc)
- [ ] 9.8 Build "incomplete items" view (no date AND no people AND no tags)
- [ ] 9.9 Build item detail page (full file display, all metadata, edit in place)
- [ ] 9.10 Implement file-type placeholder for non-image items in gallery

## 10. Admin

- [ ] 10.1 Build admin panel page with user list and invite flow
- [ ] 10.2 Implement user invitation via Supabase Auth email invite
- [ ] 10.3 Implement remove user (revoke access)
- [ ] 10.4 Protect all admin routes and actions with admin role check
