# DIMENSION (V1)

A platform for producers to create accounts and upload instrumental beats for
listeners to discover, filter, and preview. V1 intentionally does **not**
include payments, licensing, or a marketplace — see [Extending to V2](#extending-to-v2)
for how the codebase is set up to add that later without a rewrite.

## Tech stack

| Layer          | Choice                                      |
|-----------------|----------------------------------------------|
| Framework       | Next.js 16 (App Router, TypeScript)          |
| Database        | SQLite via Prisma ORM (swap to Postgres by changing `prisma/schema.prisma`'s datasource + `DATABASE_URL`) |
| File storage    | Local disk, outside the source tree (`storage/`), behind a storage-adapter interface (`src/lib/storage.ts`) |
| Authentication  | NextAuth.js (Auth.js) v5, Credentials provider, bcrypt password hashing, JWT sessions |
| Styling         | Tailwind CSS v4 |

## Prerequisites

- Node.js 18.18+ (tested on Node 24)
- npm

No database server, Docker, or cloud account is required — the dev database
is a single SQLite file and uploaded files are written to a local folder.

## Running it locally

1. **Install dependencies** (already done if you just cloned this):

   ```bash
   npm install
   ```

2. **Set up environment variables.** A `.env.local` was created for you with a
   generated `AUTH_SECRET`. If you need to recreate it, copy `.env.example`:

   ```bash
   cp .env.example .env.local
   ```

   Also make sure a plain `.env` file exists with just the `DATABASE_URL` line
   — the Prisma CLI (migrations) reads `.env`, while Next.js reads `.env.local`
   at runtime. Both are already present in this project.

3. **Run database migrations** (already applied, but if you ever reset the DB):

   ```bash
   npx prisma migrate dev
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

5. **Open the app** in your browser at [http://localhost:3000](http://localhost:3000).

To create a production build:

```bash
npm run build
npm run start
```

## Using the app

1. Go to `/signup` and create a producer account (email, password, producer name).
2. You'll be redirected to `/dashboard` — click **Upload a beat** to upload an
   MP3 or WAV with title, BPM, key, genre, tags, description, and optional
   cover art.
3. The homepage (`/`) lists all beats with search, genre/tag filters, and
   sort (newest/oldest/most played). Click a beat to preview it — playback
   continues via the persistent player bar at the bottom while you navigate.
4. Visit `/dashboard` to see, edit, or delete your own uploads. Only the
   producer who uploaded a beat can edit or delete it (enforced server-side).
5. Every producer has a public profile at `/producers/[id]` showing their
   bio, photo, and catalog.

## Project structure

```
prisma/schema.prisma       Database schema (User, Beat, Tag, BeatTag)
src/app/                   Routes (App Router) — pages + API route handlers
src/app/api/beats/         Beat CRUD, search/filter/sort
src/app/api/files/[...key] Streams audio/images from local storage (supports HTTP Range for scrubbing)
src/app/api/register       Signup endpoint
src/app/api/auth/          NextAuth route handlers
src/components/            UI components (beats, player, dashboard, layout, auth)
src/lib/auth.ts            NextAuth config (Credentials provider, JWT)
src/lib/storage.ts         Storage adapter interface + local-disk implementation
src/lib/db.ts              Prisma client singleton
src/lib/validations.ts     Zod schemas for all user input
src/middleware.ts          Protects /dashboard/* routes, redirects to /login
storage/                   Uploaded audio/cover/avatar files (gitignored, outside src/)
```

## Security notes

- Passwords are hashed with bcrypt; raw passwords are never stored or logged.
- All beat mutation endpoints (`PATCH`/`DELETE /api/beats/[id]`) verify the
  authenticated session owns the beat before making any change.
- Uploaded file **type** is validated against a fixed allowlist by MIME type
  (not just file extension), and file **size** is capped
  (`MAX_AUDIO_SIZE_BYTES`, `MAX_IMAGE_SIZE_BYTES` in `.env.local`).
- `/dashboard/*` is protected by middleware that redirects unauthenticated
  visitors to `/login`.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`, storage paths) live only in
  `.env.local`/`.env`, which are gitignored and never sent to the client.
- Uploaded files are stored outside the `src/` source tree and are served
  through a controlled API route rather than being publicly exposed as
  static files directly off disk.

## Extending to V2

The schema and storage layer were built with the marketplace/licensing phase
in mind:

- `prisma/schema.prisma` has a comment block on the `Beat` model showing where
  `priceCents`, `licenseType`, `isForSale` etc. would go — adding them is an
  additive migration, not a rewrite.
- `src/lib/storage.ts` defines a `StorageAdapter` interface. The local-disk
  implementation can be swapped for an S3/R2 adapter later without touching
  any API route or component — they all go through `storage.save()` /
  `fileUrl()`.
- Auth uses standard NextAuth sessions, so adding OAuth providers or a
  Stripe-linked account later is additive, not a rebuild.
