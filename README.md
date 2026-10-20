# Clutterbase

Clutterbase is a private family archive for photos, documents, people, and family history. It uses Next.js 16 App Router, React 19, HeroUI, Tailwind CSS, and Supabase Auth, Postgres, and Storage.

See the [short feature overview](.working/features.md) for what is implemented and what is still missing.

## Existing services

- App: https://clutterbase.vercel.app
- Supabase API: https://hbshdkyfzefwskokwiyf.supabase.co
- Supabase dashboard: https://supabase.com/dashboard/project/hbshdkyfzefwskokwiyf
- Source: https://github.com/switzerb/clutterbase

See [launch status and next steps](.working/launch.md) for the Thanksgiving target and outstanding checks. The feature specifications live in [openspec/specs](openspec/specs); the archived foundation checklist records implementation history, not current acceptance-test results.

## Run locally against the existing backend

Use Node.js 22 and pnpm 10 (the recovery checks used Node 22.14.0 and pnpm 10.15.1). Install the versions in the lockfile:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Skip the copy if `.env.local` already exists. Fill its values from the existing project's configuration:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL; supplied in the example |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client API key from that same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used for admin invitations and user management |

Never commit real environment files or put the service-role key in a `NEXT_PUBLIC_` variable. `.env.local` is ignored by Git. A local app using the hosted backend reads and writes the existing archive; use disposable test records for smoke checks.

```sh
pnpm dev
```

Open http://localhost:3000. Signed-out requests should redirect to `/sign-in`. Restart the server after changing environment variables.

For magic links, the hosted Supabase Auth redirect allowlist must include `http://localhost:3000/auth/callback`. Keep the production Site URL set to `https://clutterbase.vercel.app` and allow `https://clutterbase.vercel.app/auth/callback` as well. Use the same browser to request and open a magic link.

An existing account needs `app_metadata.organization_id` matching a row in `organizations`. Admin accounts also need `app_metadata.role` set to `admin`. These are trusted server-managed fields, not user-editable metadata. Without an organization, signing in alone does not grant archive access. Reauthenticate after changing membership metadata.

## Check and build

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

Run `start` after `build`, with the development server stopped or on a different port. `typecheck` generates Next.js route types before checking TypeScript. The build downloads Geist fonts from Google, so it needs network access. A passing build does not validate credentials, database migrations, or authenticated workflows.

## Hosting and database changes

The existing frontend is on Vercel. Before deploying, confirm the existing project's Git repository, production branch, and environment configuration in its dashboard. Use the Next.js framework preset, repository root, pnpm lockfile, and the same three environment variable names above. Public environment variables are embedded at build time; changing them requires a new build.

Validate a preview before promoting production. Preview and local writes still affect production data if their Supabase credentials point at the production project.

The five ordered SQL migrations in [supabase/migrations](supabase/migrations) define the schema, row-level policies, private `originals` and `thumbnails` buckets, organizations, and grants. Compare the hosted migration history before applying any migration. Do not replay the initial migrations or reset the hosted database. Take a backup before schema or data changes.

A separate fully local Supabase stack is not yet verified. Its configuration requires Docker and the Supabase CLI; it currently references an absent `supabase/seed.sql`, and its redirect URLs need alignment with the local callback. For now, the supported recovery path is a local Next.js frontend against the existing hosted backend.

## Project layout

- `app/`: gallery, item details, uploads, people, tags, sign-in, and admin routes and Server Actions.
- `proxy.ts`: session refresh and route protection.
- `lib/supabase/`: browser, server, privileged clients, and role/membership helpers.
- `lib/storage.ts`: signed file URLs and Sharp thumbnail generation.
- `supabase/migrations/`: database and storage definitions.
- `openspec/specs/`: feature behavior specifications.

Before changing Next.js code, read the installed guides in `node_modules/next/dist/docs/`, as required by [AGENTS.md](AGENTS.md).
