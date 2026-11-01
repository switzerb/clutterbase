# Clutterbase

Live site: [clutterbase.ing](https://clutterbase.ing/)

## Local development

### Requirements

- [Vite+](https://viteplus.dev/guide/) installed (`vp` command available).
- A supported Node.js version: Node 24.12+ recommended. See `package.json` for the supported range.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or a compatible Docker runtime, running when using local Supabase.

Vite+ manages the project's pnpm version. The Supabase CLI is installed as a project dependency; no global install or hosted Supabase account is needed.

### How to run locally

Run these commands from the project root.

1. Install dependencies (also run after pulling dependency changes):

   ```sh
   vp install
   ```

2. With Docker running, start local Supabase:

   ```sh
   vp exec supabase start
   ```

   The first run downloads Docker images and may take a few minutes.

   - Studio: http://127.0.0.1:54323
   - API: http://127.0.0.1:54321
   - Test email inbox: http://127.0.0.1:54324

3. Start the Vue development server:

   ```sh
   vp dev
   ```

   Open http://localhost:5173/ (or the URL printed in the terminal). Changes reload automatically.

The current hello-world frontend does not yet connect to Supabase, so it can run without the backend. No environment variables are required yet.

Press `Ctrl+C` to stop the frontend. Supabase runs independently in Docker; stop it with:

```sh
vp exec supabase stop
```

Local database data is preserved between normal stops and starts. To check service status and connection details, run `vp exec supabase status`; avoid sharing its secret keys.
