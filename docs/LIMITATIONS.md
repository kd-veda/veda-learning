# Product limitations

Honest accounting of what this MVP does, what it approximates, and what still needs real-world input
before this could be used for actual teaching. See also `docs/PHASE_2.md` for deliberately deferred features.

## Content

- **No real chant content yet.** Every piece of Gaṇapati Prārthanā text, syllable division, svara marking,
  translation and audio recording in this build is a clearly labelled placeholder (`isPlaceholderContent:
  true`, and visible "Placeholder content" badges throughout the UI). Nothing sacred was invented — the
  placeholder syllables use a short, neutral, well-known invocation (Oṃ / Gaṃ Gaṇapataye) purely to exercise
  the segmentation/svara/timing/scoring pipeline end to end. Replace via the admin chant editor once
  teacher-approved text and recordings exist.
- **Reference audio is synthetic.** `scripts/generate-test-tones.mjs` produces three sine-tone sequences
  (scales B/D/F) shaped to the placeholder syllables' target contours. These are explicitly not chant
  recordings and are never presented as the final teacher voice.

## Backend

- **No live Supabase project was available while building this.** The app runs fully on a local,
  IndexedDB-backed data provider by default (this is also what powers guest mode). `src/lib/data/
  supabaseProvider.ts` implements the same interface against the schema in `supabase/migrations/`, but has
  not been exercised against a real project — treat it as a strong starting point to validate, not
  pre-verified production code. Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and it
  takes over automatically; no UI code changes needed.
- **No deployment was performed.** This environment has no Vercel/Supabase account credentials, and none
  were requested — see the README for exact deploy steps to run yourself.
- **Admin audio "upload" in local/guest mode** stores the file as a base64 data URL inside IndexedDB. That's
  fine for a short demo clip but is not how a real deployment should store audio — once Supabase is
  connected, uploads go to the private `lesson-audio` Storage bucket instead (see `align/page.tsx`).

## Audio & scoring

- **Calibration measures a comfortable "Om," not full vocal range.** The UI is careful to say so; a fuller
  range assessment is Phase 2.
- **Pitch detection (YIN) runs per-frame in the browser**, tuned for a 60–1000Hz search range (the plausible
  chanting-voice band). It is not adversarially tested against real-world noisy rooms, multiple simultaneous
  voices, or Bluetooth-headset latency — the spec's "handle noisy rooms / multiple voices / Bluetooth
  latency" requirements are addressed at the design level (confidence thresholds, RMS silence gating,
  `Permissions-Policy` header, `preservesPitch` on slowed playback) but not empirically validated on
  physical hardware in this environment.
- **Per-syllable colour feedback after an attempt is an approximation.** It assumes the student's captured
  frames span roughly the phrase's real duration in chronological order and maps them onto syllable time
  windows proportionally, rather than using a precise sample-accurate clock shared between the `<audio>`
  element and the microphone capture. Good enough for MVP feedback; not frame-accurate.
- **Pronunciation similarity is a coarse audio-envelope comparison** (`src/lib/audio/pronunciation.ts`),
  always labelled "guidance-only" with a disclaimer, and is not wired into the live lesson-player UI yet
  (it's fully implemented and unit-tested, but computing it live needs the raw student/teacher waveforms for
  the attempt window, which the player does not currently record — see Phase 2).
- **Manual pitch-contour correction** (the spec's "correct the automatically generated contour") is not
  built — the admin align editor can auto-extract and preview a contour, but only whole-attempt
  re-extraction, not point-by-point manual editing.

## Accounts, privacy & child safety

- **Guardian consent is a placeholder checkbox** on registration, not a verified flow (no email/SMS
  verification, no parent-side approval loop). A real deployment needs an actual guardian-consent mechanism
  before onboarding children with real accounts.
- **"Delete my recordings"** is functional in local mode (clears IndexedDB) but the Supabase-connected path
  (deleting from the private Storage bucket) is designed but not implemented behind that button yet.
- Guest mode (local/IndexedDB) inherently means "no public profile, no cross-device sync" — that trade-off
  is intentional and documented in the Privacy page, not a bug.

## Testing

- Vitest covers every pure audio/scoring algorithm listed in the spec's test plan (98 tests, all passing).
- One Playwright smoke spec (`e2e/guest-flow.spec.ts`) covers the guest → manual scale → demo lesson flow
  end to end; it deliberately uses manual scale selection rather than the live mic calibration flow, since
  Chromium's fake audio device produces silence and would make that path flaky in CI.
- No load testing, no cross-device manual QA (iOS Safari, Android Chrome, Bluetooth headsets) was possible
  in this environment.
