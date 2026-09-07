# Phase 2 recommendations

Documented per the product brief; none of these should delay the MVP, and none were started.

- **Native iOS and Android apps.** The current build is an installable PWA (manifest + icons already in
  place); wrapping it (Capacitor/Expo or fully native) is a separate project once the web experience is
  validated.
- **Specialised Sanskrit phoneme recognition / forced alignment.** `src/lib/audio/pronunciation.ts` defines
  a `PronunciationAnalyzer` interface specifically so a real phoneme model or forced-alignment service can
  be swapped in later without touching scoring or UI code — the current envelope-similarity implementation
  is a deliberately coarse placeholder.
- **Teacher review of submitted recordings.** Needs the opt-in recording upload path (already designed —
  `profiles.save_recordings_consent`, the private `student-recordings` bucket) plus a review queue/UI for
  teachers, which doesn't exist yet.
- **Live classes.** Out of scope entirely for this MVP's architecture.
- **Offline lesson downloads.** The PWA is installable but does not cache lesson audio/content for offline
  use (no service worker / cache strategy implemented).
- **Additional languages** (UI localisation, not chant content).
- **Family accounts.** Would need a parent-managed multi-profile model on top of the current single-profile
  `profiles` table.
- **Advanced gamification** beyond the current streaks/achievements (leaderboards, badges with tiers, etc.)
  — deliberately kept simple and non-competitive per the spec's "not a commercial game" guidance.
- **Personalised practice plans.** Would consume the `practice_attempts`/`attempt_scores` history to
  recommend what to practise next; not built.
- **Detailed vocal-range assessment**, beyond the single comfortable-Om calibration.
- **AI-generated practice suggestions from recurring errors.** Would analyse patterns across
  `attempt_scores.syllable_feedback` over time; not built.
- **Manual, point-by-point pitch-contour correction** in the admin align editor (currently: auto-extract +
  preview only, re-extract to redo). Noted in `docs/LIMITATIONS.md` too since it's closer to "missing MVP
  polish" than a true Phase 2 feature, but deferred either way given the time budget.
- **Sample-accurate synchronisation** between the reference `<audio>` element's clock and the microphone
  capture stream (currently approximated — see `docs/LIMITATIONS.md`), which would make per-syllable
  feedback and pronunciation-similarity scoring meaningfully more precise.
