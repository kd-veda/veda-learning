# Veda Learning

A mobile-first Progressive Web App for learning accurate Vedic chanting: a student chants along with a
teacher's recording while text, syllable segmentation, Vedic svara markings, and a pitch-contour guide move
in sync — "tracing paper" for the voice — with gentle, colour-coded feedback.

**Status:** a genuine, working MVP. It runs out of the box with zero configuration (guest mode, local
storage, synthetic placeholder audio) and upgrades to real accounts + a shared database the moment you
connect a Supabase project — see [Connecting Supabase](#connecting-supabase-optional) below. Read
[`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for an honest account of what's approximated or still needed,
and [`docs/PLAN.md`](docs/PLAN.md) for the architecture this was built against.

## Quick start (zero configuration)

```bash
npm install
npm run gen:tones   # generates the placeholder demo audio (idempotent; already committed once, but safe to re-run)
npm run dev
```

Open http://localhost:3000, choose **Begin as a guest**, and you can go through calibration (or pick a
scale manually), open the demonstration "Gaṇapati Prārthanā" lesson, and practise — all on-device, no
account or database required. Visit `/admin` to see the teacher/admin portal (guest sessions are seeded
with admin access locally, purely so the admin demo is reachable without extra setup).

## Requirements

- Node.js ≥ 18.18
- A modern browser with microphone + Web Audio API support (Chrome, Safari) for the live pitch features —
  the app detects and gracefully explains when these are missing (see `checkAudioCapabilities()` in
  `src/lib/audio/pitchStream.ts`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (also rebuilds the AudioWorklet bundle first) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm test` | Vitest unit tests (audio algorithms, scoring, local data provider) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end smoke test (guest flow) — needs `npm run build` output or will build it itself |
| `npm run gen:tones` | Regenerates the synthetic placeholder demo audio in `public/audio/ganapati-prarthana/` |
| `npm run build:worklet` | Rebuilds `public/worklets/pitch-processor.js` from TypeScript (runs automatically before `dev`/`build`) |

## How the app runs with no backend at all

There is no live Supabase project behind this build (see `docs/LIMITATIONS.md` for why, and what that means
for `supabaseProvider.ts`'s trustworthiness). Rather than blocking the whole app on that, `src/lib/data/
provider.ts` picks between two interchangeable implementations of the same `DataProvider` interface:

- **`localProvider`** (IndexedDB, via `idb-keyval`) — active whenever Supabase env vars are unset. This is
  what "guest mode" runs on: courses, calibration, practice history, and the admin editors all work,
  entirely on-device.
- **`supabaseProvider`** — active automatically once `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see below). No UI code changes needed either way.

## Connecting Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations, in order, against your project (via the SQL editor, or the Supabase CLI):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push   # applies supabase/migrations/*.sql in order
   ```
   or paste the three files in `supabase/migrations/` into the SQL editor in order:
   `0001_schema.sql` → `0002_rls.sql` → `0003_storage.sql`.
3. Seed the demo content (optional but recommended for parity with the local/guest demo):
   - Upload the three files in `public/audio/ganapati-prarthana/*.wav` to the `lesson-audio` Storage bucket
     (created by `0003_storage.sql`), note the resulting public/storage URLs.
   - Edit `supabase/seed.sql`, replacing the three `REPLACE_WITH_STORAGE_URL/...` placeholders with those
     URLs.
   - Run it: `supabase db execute -f supabase/seed.sql` (or paste into the SQL editor).
4. Make your own account an admin so you can reach `/admin`:
   ```sql
   insert into admin_roles (profile_id, role) values ('<your-auth-user-uuid>', 'administrator');
   ```
5. Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only; used by future admin route handlers, never sent to the browser
   ```
6. Restart the dev server. The app now uses real Supabase auth (including anonymous "guest" sessions —
   `supabaseProvider.getOrCreateGuestProfile()` calls `auth.signInAnonymously()`) and a shared database
   instead of IndexedDB.

`supabaseProvider.ts` has not been exercised against a live project in the environment this was built in —
treat it as a strong, schema-accurate starting point to validate against your own project, not pre-verified
production code (see `docs/LIMITATIONS.md`).

## Deployment

No hosting credentials were available while building this, so nothing has been deployed — but the app is
ready to deploy as-is:

1. **Frontend — Vercel** (or any Next.js-compatible host):
   ```bash
   npm i -g vercel
   vercel
   ```
   Set the same environment variables from `.env.local` (Supabase URL/anon key; `SUPABASE_SERVICE_ROLE_KEY`
   only if/when a server route needs it — never expose it as a `NEXT_PUBLIC_*` variable) in the Vercel
   project settings.
2. **Backend — Supabase**: see [Connecting Supabase](#connecting-supabase-optional) above; a Supabase
   project is already a hosted service once created, nothing extra to deploy.
3. The app works perfectly well deployed **without** Supabase configured too — it simply runs in
   guest/local mode for every visitor (no cross-device sync, no teacher-side content management beyond what
   ships in the seed data).

## Testing

```bash
npm test           # Vitest — 98 unit tests covering every algorithm in src/lib/audio and the local data provider
npm run test:e2e   # Playwright — one end-to-end guest-flow smoke test
```

The Playwright config pins a specific Chromium binary path
(`playwright.config.ts` → `launchOptions.executablePath`) to match the sandboxed environment this was built
in, with an escape hatch: set `PLAYWRIGHT_CHROMIUM_PATH` to override it, or delete that line entirely and
run `npx playwright install chromium` on a machine with normal internet access.

## Project structure

See [`docs/PLAN.md`](docs/PLAN.md) §3 for the full annotated folder structure and §4 for the technical
choices (and why). Short version:

- `src/lib/audio/` — every audio algorithm (pitch detection, note/scale mapping, smoothing, DTW alignment,
  scoring, pronunciation guidance), all pure functions, all unit-tested.
- `src/lib/data/` — the `DataProvider` interface plus the local and Supabase implementations.
- `src/content/ganapati-prarthana/` — the seed demo lesson content (placeholder, clearly labelled).
- `src/app/` — Next.js App Router pages: `(marketing)`, `(auth)`, `(student)`, `(admin)` route groups.
- `src/components/` — `ui/` (generic), `audio/` (tuner, pitch canvas, waveform editor), `lesson/` (tracing
  paper, score card), `layout/` (header, admin guard).
- `supabase/` — SQL migrations, RLS policies, storage policies, seed data.

## What's known to still need work

`docs/LIMITATIONS.md` is the authoritative list. Headlines: real teacher-approved chant content and
recordings, a live Supabase project to validate `supabaseProvider.ts` against, manual pitch-contour
correction in the admin editor, and wiring the (already-implemented, already-tested) pronunciation-guidance
module into the live lesson player.

`docs/PHASE_2.md` lists everything explicitly deferred per the product brief (native apps, phoneme-level
pronunciation recognition, live classes, offline downloads, and more).
