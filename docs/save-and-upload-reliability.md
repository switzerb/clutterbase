# Reliability

## Deployment

Apply `supabase/migrations/20261020000000_atomic_saves.sql` to the target Supabase database **before deploying this application change**. Use the normal migration process or run the complete file in the Supabase SQL editor. It adds two functions; it does not rewrite archive records.

The functions are `replace_item_tags` and `set_person_parents`. Both run as the signed-in user, retain RLS, check organization membership, and lock the parent record while saving. Their multi-step writes commit together or roll back together. No delete/insert fallback is used when a function is missing: the form displays an error instead.

The migration has been tested in a disposable PostgreSQL 15 database using the repository migrations and simulated Supabase auth claims. It was applied to hosted project `hbshdkyfzefwskokwiyf` on 2026-10-20 and recorded in migration history as `20261020000000`. Function permissions and unchanged archive records were verified. See the [Supabase workflow and release checklist](../.working/supabase-workflow.md) for the completed steps and remaining app/deployment checks.

## Saves

Shared action forms show pending/error states, disable repeat submissions, and retain typed input on failure. Mutations check returned errors and affected rows, so an RLS-denied no-op is not reported as a successful save. Existing item and person edit forms use the same behavior.

Admin invitations report partial failure when email delivery succeeds but assigning organization access fails. Do not resend that invitation blindly; repair the account's organization assignment first.

## Uploads

The upload page runs at most two jobs at a time across all batches and retries. Each selected file keeps one item ID and original path. A retry skips a known successful upload and resumes registration. If the upload response was lost, a storage conflict is recovered by checking the original during registration rather than overwriting it. Registration recognizes an already committed item owned by the same user and organization.

An original is retained when registration fails so Retry can finish saving it. Thumbnail generation is best-effort; an image without a thumbnail is reported as such. PDFs still do not receive thumbnails.

Recovery currently lasts for the lifetime of the upload page. Keep the page open and use Retry there. Reloading or closing loses the in-memory queue; the browser warns while unfinished entries remain. Abandoned originals are not automatically deleted. Persistent upload sessions and cleanup of abandoned files remain follow-up work.

## Verification

- `pnpm test`: write failures/no-op detection, queue limits, duplicate scheduling, lost-response recovery, stable paths, and registration retries.
- `pnpm typecheck` and `pnpm lint`.
- `tests/sql/atomic-saves.sql`: run with `psql -v ON_ERROR_STOP=1` against a disposable migrated database. Fixtures roll back. Checks duplicate tags, empty selections, forced insert rollback, parent retry behavior, and organization isolation.

Browser validation should include a failed save retaining input and a small test upload batch against a dedicated test project. Automated upload tests replace the Supabase I/O boundary; they do not write to the hosted family archive.
