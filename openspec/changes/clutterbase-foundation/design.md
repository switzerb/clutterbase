## Context

Clutterbase is a new family digital archive application — greenfield, no existing codebase. The primary stakeholders are family members who want to preserve and discover photos, documents, and personal history. The key constraints are privacy (all files must be inaccessible without authentication), simplicity (family members of varying technical ability will use it), and longevity (this archive should remain useful and maintainable for years).

## Goals / Non-Goals

**Goals:**
- Private, authenticated family archive accessible to authorized family members only
- Structured metadata model that supports rich discovery without requiring completeness
- Family tree rendering via a genealogy-aware data model
- Faceted search combining full-text, tags, people, and date range
- Progressive enrichment — items can be uploaded with minimal info and enriched later
- Simple, maintainable stack that one developer can own long-term

**Non-Goals:**
- Public sharing or link-based access to individual items
- OCR or automated text extraction from documents (can be added later)
- Mobile native app (responsive web is sufficient)
- Social features (comments, likes, reactions)
- External integrations (Ancestry, FamilySearch, etc.) in v1

## Decisions

### Framework: Next.js App Router on Vercel

Next.js with the App Router is the natural choice for Vercel deployment. Server Components reduce client bundle size for a data-heavy app; Server Actions simplify form handling for upload and metadata editing. Vercel provides zero-config CI/CD from GitHub.

_Alternative considered: SvelteKit_ — good ergonomics but smaller ecosystem and less native Vercel integration.

### Backend: Supabase (Auth + PostgreSQL + Storage)

Supabase provides all three backend primitives in one service: authentication, relational database, and file storage. Row Level Security (RLS) at the Postgres layer means auth and data access are co-located and enforced at the database level, not just the application layer. This is the right choice for a privacy-first app.

_Alternative considered: PlanetScale + Clerk + S3_ — more best-of-breed but three services to manage instead of one.

### Data Model: Family Unit for Genealogy

Rather than a simple `person_relationships` table, genealogy uses a family unit model (GEDCOM-inspired):
- `family_units` — pairs of parents (either parent can be null for single-parent units)
- `family_unit_children` — links people to the unit where they are a child, with relationship type (biological, adoptive, step)

This correctly handles remarriage, half-siblings, adoption, and unknown parents. It also maps naturally to family tree rendering, where each node is a family unit rather than an individual.

_Alternative considered: `parent_id` on person table_ — works for simple trees but breaks for remarriage, half-siblings, and adoption.

### Date Flexibility: Year + Precision Enum

Items store `date_year` (integer) and `date_precision` (enum: `year` | `decade`). A decade is stored as its starting year (1950 for "1950s"). This allows range queries (`WHERE date_year BETWEEN 1950 AND 1959`) without a separate decade column, while still communicating to the UI how precise the date is.

### File Storage: Supabase Storage with Signed URLs

Files are stored in private Supabase Storage buckets — never publicly accessible. The Next.js app generates short-lived signed URLs (1 hour) for authenticated users to fetch files. Two buckets:
- `originals/` — full resolution, preserved exactly as uploaded
- `thumbnails/` — compressed WebP previews for gallery grid, generated on upload via a Supabase Edge Function or Next.js API route

### UI: Tailwind CSS v4 + HeroUI Component Library

Tailwind CSS v4 provides utility-first styling. HeroUI (v3 beta) provides an accessible, React Aria-based component library built on Tailwind v4. Together they cover layout, forms, modals, and data display without writing bespoke CSS.

- Tailwind v4 (CSS-first config, no `tailwind.config.js`)
- HeroUI v3 beta — compound-component pattern (`Card.Header`, `Card.Content`, etc.), built on React Aria, React 19+ compatible

_Alternative considered: shadcn/ui_ — good but requires Tailwind v3 and more per-component copy/paste maintenance.

### Tagging: Structured Categories, Not Free-form

Tags belong to categories (place, event, topic, format). This enables faceted search UI with meaningful filter dimensions. Tags are shared across all items (not per-user) so family members build a consistent vocabulary over time.

### Item Relationships: Bidirectional Self-Join

`item_relationships` is a junction table with `item_a_id`, `item_b_id`, and an optional `note`. Bidirectionality is handled at query time (`WHERE item_a_id = X OR item_b_id = X`) rather than storing both directions. This avoids duplication and keeps deletion simple.

## Risks / Trade-offs

**Storage cost growth** → Supabase Storage is $0.021/GB. A large family archive (100GB+) stays under $3/month. If costs become a concern, migration to Cloudflare R2 (zero egress, $0.015/GB) is straightforward — both are S3-compatible.

**Thumbnail generation complexity** → Generating thumbnails on upload adds a step. Mitigation: use Supabase's built-in image transformation API (available on paid plans) rather than a custom Edge Function; or generate lazily on first gallery view.

**Genealogy data entry friction** → The family unit model is more structured than flat tags, which adds steps when entering people. Mitigation: design the people UI to create family units implicitly ("Add parent" on a person's profile creates the unit automatically).

**RLS policy complexity** → Supabase RLS policies must be written carefully to avoid both over-sharing and accidental lockout. Mitigation: start with simple policies (authenticated users can read all, only uploaders can delete), expand later.

**Search quality** → Postgres full-text search is good but not Elasticsearch-quality. For a family archive with hundreds to low thousands of items, it is more than sufficient.

## Migration Plan

Greenfield — no migration needed. Deployment sequence:

1. Create GitHub repository
2. Initialize Next.js app, connect to Vercel
3. Configure Supabase project (Auth, Storage buckets, RLS)
4. Run database migrations (schema creation)
5. Deploy to Vercel production

## Open Questions

- **Thumbnail strategy**: Supabase image transforms vs. custom generation — decide based on Supabase plan tier
- **Auth method**: Magic link (lower friction) vs. email/password (more familiar) — can offer both
- **Family admin role**: Which actions require admin vs. any authenticated member (e.g., deleting items, managing tag categories)
