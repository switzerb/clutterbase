# Authentication setup

Clutterbase uses Supabase Auth with Google, password, and email-link sign-in. The browser and user-scoped server clients use the publishable key. Only the server-only admin client uses the secret key, which bypasses row-level security.

## Key migration

1. Copy the publishable and secret keys from the existing Supabase project's **Settings → API Keys** into `.env.local`, using the names in `.env.example`.
2. Restart the local server and verify sign-in, uploads, and admin access.
3. Add the same variable names with the appropriate project's values to Vercel Development, Preview, and Production. Rebuild: `NEXT_PUBLIC_` values are embedded at build time.
4. Verify a preview, then production. Remove the legacy environment variables and disable legacy API keys only after checking every consumer.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` still work as temporary fallbacks. API key migration does not rotate JWT signing keys or change users' passwords. Asymmetric JWT signing-key migration is a separate dashboard change; the proxy works with either signing method.

## Redirects and email links

Keep the production Site URL set to `https://clutterbase.vercel.app`. Allow `http://localhost:3000/auth/callback` and `https://clutterbase.vercel.app/auth/callback`, plus any preview URL being tested.

Google OAuth and existing PKCE magic links use `/auth/callback?code=…`. The callback also supports SSR email templates using `token_hash`:

- Magic-link template: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
- Invitation template: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite`

These template examples assume the app supplies the query-free `/auth/callback` URL as `RedirectTo`, as it currently does. Configure them separately in Supabase Auth email templates; changing app code does not update hosted templates. Test with a designated recipient. Recovery/password-reset flows are not implemented.

## Session handling

The request proxy verifies JWT claims and refreshes cookies when needed. Redirects preserve refreshed cookies and prevent caching. Privileged checks still call `getUser()` for the current server-side account record. The callback exchanges a code or verifies an email token, preserves session cookies, and only redirects to application-local paths.

Before release, test password, Google, magic link, invitation, logout, and expired-session behavior. New API keys do not resolve the separately identified organization authorization gaps in storage and admin operations.

References: [Supabase key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), [SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
