# CampusVault

CampusVault is a Next.js academic resource platform. Public visitors can browse, search, preview and download approved PDFs or submit new resources without an account. Submissions remain private and pending until an administrator reviews them.

## Stack and current scope

- Next.js App Router, React, TypeScript, Tailwind CSS, Zod, Supabase PostgreSQL and private Supabase Storage.
- Public guest workflow: catalogue, search and filters, PDF upload with progress, private pending storage, submission reference, approved-only preview/download, report submission.
- Admin workflow: isolated username/password authentication, signed HttpOnly session cookie, pending moderation, private review preview, catalogue create/edit/activate, reports, audit list, and database-backed overview counts.
- PDF only. Anonymous ratings, bookmarks, CAPTCHA, malware scanning, and user accounts are not implemented.

## Local setup

1. Install Node.js 20 or newer and npm.
2. Run `npm install`.
3. Create a Supabase project. Apply `supabase/migrations/202610150001_campusvault.sql` using the Supabase SQL editor or CLI, then run `supabase/seed.sql`.
4. In Supabase Storage, confirm the private `campus-resources` bucket exists. The migration creates it with a 10 MB PDF limit. Do not make it public.
5. Copy `.env.example` to `.env.local` and fill in the project URL, publishable key, and server-only service-role key. The publishable key is named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the current server upload/admin implementation requires `SUPABASE_SERVICE_ROLE_KEY`, which must never be exposed with a `NEXT_PUBLIC_` prefix.
6. Generate an admin password hash with `node scripts/hash-password.mjs 'your-long-password'`. Set the output as `ADMIN_PASSWORD_HASH`, choose `ADMIN_USERNAME`, and set `ADMIN_SESSION_SECRET` to a random value with at least 32 characters. Do not commit `.env.local`.
7. Set `MAX_UPLOAD_BYTES` (default 10485760) and mirror it in `NEXT_PUBLIC_MAX_UPLOAD_BYTES` so the upload form displays the configured limit. Set `UPLOADS_PER_HOUR` (default 5) and `NEXT_PUBLIC_APP_URL` as appropriate.
8. Run `npm run dev` and open `http://localhost:3000`.

The publishable Supabase key is documented as an environment variable for project configuration, but public database operations in this implementation are routed through server endpoints. The service-role key remains server-only. Supabase RLS is enabled and table access is revoked from `anon` and `authenticated`; storage is private and has no public read policy. The application server uses service privileges only after validating each public operation.

## Admin

Open `/admin/login`. Admin access is configured only from server environment values; there is no public account creation endpoint. Passwords are verified against a salted scrypt hash. Sessions expire after eight hours and use HttpOnly, SameSite=Lax cookies, Secure in production. Login attempts are rate-limited in process memory.

## Security and operational notes

- Uploads accept PDF only, enforce size, extension, MIME, PDF signature, metadata, and active catalogue relationship checks, and start in `pending` state.
- Pending and rejected files are in a private bucket. Public resource APIs require an approved record and issue short-lived signed URLs. Download counts increment only through the download operation.
- Supabase privileged credentials are never sent to browser code. RLS denies direct public table access; public mutations pass through validated server handlers.
- The built-in rate limiter uses process memory. It is suitable for local demonstration and a single persistent server process, not a horizontally scaled or serverless deployment. Configure a shared rate-limit store (for example, Redis) before production exposure. CAPTCHA is not configured.
- No malware scanner is integrated. Do not treat uploaded documents as scanned.
- The SQL migration should be applied to a fresh Supabase project. Confirm that the service role key belongs to the intended project and keep it secret.
- The starter catalogue is illustrative and not an official or exhaustive syllabus.

## Commands

- `npm run dev` — development server.
- `npm run typecheck` — TypeScript checks.
- `npm run lint` — ESLint.
- `npm run build` — production build.

No live Supabase project or credentials are included in this repository, so database-backed workflows require the setup above before they can be exercised end to end.
