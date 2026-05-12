## Why

Family history — photos, documents, letters, personal records — lives in physical stacks that are hard to find, fragile, and inaccessible to the whole family. Clutterbase replaces that with a private, searchable digital archive that lets the family preserve, tag, and discover their history together.

## What Changes

This is a greenfield application. All capabilities are new.

- New web application hosted on Vercel (Next.js)
- Supabase backend providing authentication, PostgreSQL database, and private file storage
- GitHub repository for source hosting
- Family members can create accounts and access the shared archive
- Files (photos, documents, other) can be uploaded and stored privately in Supabase Storage
- Items are enriched with structured metadata: title, description, date (exact year or decade)
- Structured tagging system with categories: place, event, topic, format
- People are first-class entities with names, dates, and notes
- Genealogy modeled via family units (GEDCOM-inspired): parent pairs + children with relationship types
- Items can be linked to people and tags, and manually associated with related items
- Full-text and faceted search across all items

## Capabilities

### New Capabilities

- `auth`: Family member authentication via Supabase Auth (email/password or magic link); role-based access with family admin
- `file-storage`: Private Supabase Storage buckets for original files and auto-generated thumbnails; signed URL access tied to auth
- `items`: Core item records representing uploaded files — photos, documents, or other — with optional metadata (title, description, date, type)
- `tagging`: Structured tag categories (place, event, topic, format) and tags; items linked to tags via junction table
- `people`: First-class person entities with name, birth/death years, notes, and optional profile photo; linked to items via junction table
- `genealogy`: Family unit model — each unit has up to two parents and any number of children with relationship types (biological, adoptive, step); enables family tree rendering
- `item-relationships`: Manual many-to-many associations between items with optional descriptive note; bidirectional navigation
- `search`: Faceted search combining full-text (title, description) with tag filters, people filters, date/decade range, and file type
- `upload`: Upload flow supporting single and batch file upload; auto-generates thumbnails; minimal required fields with progressive metadata enrichment
- `gallery`: Grid browse view for all items with sort, filter sidebar, and navigation to item detail; includes "incomplete items" view for unenriched records

### Modified Capabilities

## Impact

- New GitHub repository (clutterbase)
- Vercel project connected to GitHub for CI/CD deployment
- Supabase project with PostgreSQL database, Auth, and Storage configured
- No existing systems affected — greenfield
