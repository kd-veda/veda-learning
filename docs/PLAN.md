# Veda Learning — Implementation Plan

## 1. Summary

Veda Learning is a mobile-first Progressive Web App that teaches accurate Vedic chanting by letting a
student "trace" a teacher's recorded voice: text + syllable segmentation + svara markings are shown in
sync with a moving playhead, the teacher's pitch contour is drawn as a guide line, and the student's live
microphone pitch is overlaid on it with green/amber/red/grey feedback.

This document is the plan required before implementation begins. It is intentionally concise; the
detailed data model lives in `supabase/migrations/`, and behavioural details live in code comments next
to the relevant modules.

## 2. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser (Next.js App Router, React, TypeScript, Tailwind)            │
│                                                                        │
│  ┌───────────────┐   ┌────────────────────┐   ┌────────────────────┐ │
│  │ Student UI     │   │ Admin UI            │   │ Shared UI kit      │ │
│  │ (app/(student))│   │ (app/(admin))       │   │ (components/ui)    │ │
│  └───────┬───────┘   └─────────┬──────────┘   └────────────────────┘ │
│          │                     │                                     │
│  ┌───────▼─────────────────────▼──────────┐                          │
│  │ lib/audio  — pitch detection, note      │  AudioWorklet runs the  │
│  │ mapping, smoothing, scoring, DTW        │  hot analysis loop off  │
│  │ (pure functions, no React, unit-tested) │  the main thread.       │
│  └───────┬──────────────────────────────────┘                       │
│          │                                                            │
│  ┌───────▼──────────┐   ┌───────────────────┐                        │
│  │ lib/supabase       │  │ lib/local-store    │  Guest / no-backend   │
│  │ (typed client,      │  │ (IndexedDB via      │  fallback so the     │
│  │ only used if env    │  │ idb-keyval — guest  │  app is fully         │
│  │ vars are present)    │  │ profile, attempts) │  demoable with zero   │
│  └────────────────────┘   └───────────────────┘  backend config.     │
└──────────────────────────────────────────────────────────────────────┘
                 │ (only when NEXT_PUBLIC_SUPABASE_* is configured)
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Supabase (Postgres + Auth + Storage) — provisioned by the user       │
│  tables: profiles, courses, modules, chants, lessons, phrases,        │
│  words, syllables, lesson_audio, pitch_contours, enrolments,          │
│  practice_attempts, attempt_scores, achievements, user_achievements,  │
│  scale_calibrations, admin_roles, app_config (mapping/tolerances)     │
│  RLS on every table; audio in a private Storage bucket.               │
└──────────────────────────────────────────────────────────────────────┘
```

**Key architectural decision — dual data layer.** No Supabase project exists yet (confirmed with the
product owner). Rather than blocking the whole app on backend provisioning, `lib/data/` defines a single
`DataProvider` interface (courses, lessons, attempts, calibration, admin CRUD). Two implementations satisfy
it: `supabaseProvider` (used automatically when `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set) and
`localProvider` (IndexedDB-backed, used otherwise — this is also what powers **guest mode**, which the spec
requires regardless of backend state). This keeps the whole student/admin UI, and every audio algorithm,
fully demoable today, and becomes backend-connected by setting two env vars later — no UI code changes.

**Audio processing is 100% local-first.** Pitch detection runs in the browser (Web Audio API +
AudioWorklet) so nothing is uploaded by default, per the privacy requirements. A raw recording is only
uploaded if the student explicitly opts in (`practice without saving audio` is the default).

## 3. Folder structure

```
veda-learning/
├── docs/
│   ├── PLAN.md                    (this file)
│   ├── LIMITATIONS.md
│   └── PHASE_2.md
├── public/
│   ├── manifest.webmanifest
│   └── icons/                     (from the supplied Vedas4All logo)
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx                     Landing
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (student)/onboarding/page.tsx
│   │   ├── (student)/onboarding/mic-permission/page.tsx
│   │   ├── (student)/onboarding/calibrate/page.tsx
│   │   ├── (student)/onboarding/calibrate/result/page.tsx
│   │   ├── (student)/dashboard/page.tsx
│   │   ├── (student)/courses/[courseId]/page.tsx
│   │   ├── (student)/lessons/[lessonId]/page.tsx     Lesson player
│   │   ├── (student)/lessons/[lessonId]/attempt/[attemptId]/page.tsx
│   │   ├── (student)/history/page.tsx
│   │   ├── (student)/profile/page.tsx
│   │   ├── (student)/privacy/page.tsx
│   │   ├── (admin)/admin/page.tsx
│   │   ├── (admin)/admin/courses/[courseId]/page.tsx
│   │   ├── (admin)/admin/chants/[chantId]/page.tsx
│   │   ├── (admin)/admin/chants/[chantId]/align/page.tsx  Waveform editor
│   │   └── api/…                                     (route handlers, e.g. contour extraction)
│   ├── components/
│   │   ├── ui/                    Buttons, cards, sliders (accessible, Radix-based)
│   │   ├── audio/                 TunerDial, PitchContourCanvas, WaveformEditor
│   │   └── lesson/                TracingPaper, SyllableRow, ScoreCard
│   ├── lib/
│   │   ├── audio/
│   │   │   ├── pitchDetector.ts       YIN implementation
│   │   │   ├── noteMapping.ts         frequency ↔ MIDI ↔ pitch class ↔ cents
│   │   │   ├── scaleMapping.ts        configurable pitch-class → B/D/F mapping
│   │   │   ├── smoothing.ts           median filter + voiced-segment smoothing
│   │   │   ├── scoring.ts             intonation/timing/completion/pronunciation scores
│   │   │   ├── dtw.ts                 dynamic time warping alignment
│   │   │   ├── worklet/pitch-processor.ts   AudioWorkletProcessor
│   │   │   └── testTone.ts            synthetic tone generator (calibration fallback, seed audio)
│   │   ├── data/
│   │   │   ├── types.ts               shared domain types (Course…Syllable, Attempt, Score)
│   │   │   ├── provider.ts            DataProvider interface + getDataProvider()
│   │   │   ├── localProvider.ts       IndexedDB implementation (guest / no-backend)
│   │   │   └── supabaseProvider.ts    Supabase implementation
│   │   ├── supabase/client.ts, server.ts
│   │   └── config/appConfig.ts        default tolerance + scale-mapping config (admin-editable)
│   ├── content/ganapati-prarthana/    seed content — IAST, Devanagari, meaning, syllables, svara
│   ├── styles/globals.css
│   └── test/                          Vitest setup + fixtures
├── supabase/
│   ├── migrations/*.sql
│   └── seed.sql
├── e2e/                                Playwright specs
├── scripts/generate-test-tones.mjs     builds public/audio placeholder tones
├── .env.example
├── package.json / tsconfig.json / tailwind.config.ts / next.config.mjs
└── README.md
```

## 4. Technical choices (and why)

- **Next.js 14 App Router + TypeScript, strict mode** — matches the spec, gives file-based routing for the
  large page list, and server components keep the admin data-heavy pages fast.
- **Tailwind CSS + small Radix-based UI kit** — accessible primitives (dialog, slider, tabs) without a
  heavy dependency; warm-ivory/saffron/maroon/teal palette implemented as CSS variables so admins/designers
  can retheme later.
- **Pitch detection: custom YIN implementation** (`lib/audio/pitchDetector.ts`), not a third-party pitch
  library. Reasoning: the well-known JS pitch libraries are either unmaintained, GPL-licensed, or bundle a
  full audio framework we don't need; YIN is a well-documented ~150-line algorithm, is easy to unit test
  with synthetic sine waves (required by the spec's test list), and keeping it in-repo means the admin
  contour-preview and the live student tuner can share one code path.
- **AudioWorklet** for the hot loop (reading mic samples, running YIN, posting pitch/confidence back to the
  main thread ~30×/second) so the UI thread stays free for the pitch-trace canvas animation.
- **WaveSurfer.js** for the admin syllable/timing alignment editor — purpose-built for exactly this.
- **IndexedDB via `idb-keyval`** for the local/guest data provider — no server, works offline, holds
  calibration, attempts, and practice history until/unless a Supabase project is connected.
- **Supabase** (Postgres + Auth + Storage) as specified, accessed only through `supabaseProvider`, itself
  only instantiated when public env vars are present; the service-role key is never referenced in any file
  under `src/app` or `src/components` — only in server-only migration/seed scripts.
- **Vitest** for unit tests (fast, native TS/ESM, works well for the pure `lib/audio` functions).
- **Playwright** for one end-to-end smoke spec of the guest → calibrate → demo lesson → attempt flow.

## 5. Risks & assumptions

1. **No teacher-approved audio or text yet.** Per instruction, nothing sacred is invented. The demo lesson
   ships with clearly labelled placeholder syllable/svara data and synthetic test tones (`scripts/generate-test-tones.mjs`)
   standing in for B/D/F recordings, with an obvious content slot (`src/content/ganapati-prarthana/`) and an
   admin uploader for the real files later.
2. **No Supabase project exists.** The app runs fully on the local/IndexedDB provider until the user creates
   one and sets two env vars. Auth, RLS, and cross-device history only take effect once that happens — this
   is called out in the README and in-app (a small "Guest / local mode" badge).
3. **No hosting/deployment credentials available to this session.** Deployment configuration (Vercel-ready
   `next.config.mjs`, `.env.example`, migration scripts) is prepared and documented, but actually deploying
   requires the user's own Vercel + Supabase accounts and secrets, which this environment does not have and
   should never receive as pasted secrets in chat. The README gives exact deploy steps.
4. **Automated pronunciation similarity is inherently limited.** Implemented as a modular, clearly-labelled
   "guidance, not correction" phrase-level audio-similarity comparator, with the interface designed so a
   real Sanskrit phoneme/forced-alignment model can be swapped in later (documented in `docs/PHASE_2.md`).
5. **iOS Safari AudioWorklet/mic quirks.** Safari requires a user gesture before `AudioContext` resume and
   has historically had AudioWorklet bugs on older versions; `lib/audio` includes capability checks and a
   fallback message per the spec's "unsupported browser" requirement, and the worklet buffer sizes are kept
   conservative (2048 samples) for lower-end devices.
6. **Time-boxing.** This is treated as a genuine MVP: every route, algorithm, and DB table from the spec is
   implemented; some admin editing flows are functional-but-simple (per the spec's own allowance for the
   waveform editor), and Playwright coverage is one representative smoke spec rather than exhaustive e2e
   coverage. `docs/PHASE_2.md` lists what's deliberately deferred.

## 6. Build phases

1. Scaffold (Next.js, Tailwind, tooling, CI-ready lint/typecheck/test scripts).
2. `lib/audio` core algorithms + unit tests (can be verified in isolation, no UI needed).
3. Data layer: types, DataProvider interface, local provider, Supabase provider + SQL migrations/RLS/seed.
4. Student flows: onboarding → mic permission → calibration (tuner UI) → result → dashboard → lesson player
   (tracing paper) → attempt result → history → profile/privacy.
5. Admin portal: dashboard, course/chant editor, waveform alignment editor, config (mapping/tolerances),
   publish/unpublish, student-experience preview.
6. Seed content + synthetic placeholder audio for "Gaṇapati Prārthanā".
7. Tests (Vitest unit + one Playwright e2e), lint, typecheck — fix to green.
8. README, `.env.example`, limitations doc, Phase 2 doc; package and deliver.
