/**
 * Configurable mapping from a student's detected comfortable pitch class to
 * one of the course scales the platform records lessons in.
 *
 * This is intentionally NOT hard-coded into the calibration flow — the
 * defaults below match the spec's initial table, but an admin can override
 * them from the admin "Configuration" page (see src/lib/config/appConfig.ts
 * for how this merges with any admin override stored in the database).
 *
 * G# was added alongside the original B/D/F set so students whose
 * comfortable pitch sits at G or G# can be routed to a scale that actually
 * matches a teacher's recording made at G# (rather than being pushed to the
 * nearest of the original three, which could be up to a whole step off).
 */

import type { PitchClass } from "./noteMapping";

export const COURSE_SCALES = ["B", "D", "F", "G#"] as const;
export type CourseScale = (typeof COURSE_SCALES)[number];

export type ScaleMapping = Record<PitchClass, CourseScale>;

/** The initial recommendation mapping specified in the product brief, extended with G#. */
export const DEFAULT_SCALE_MAPPING: ScaleMapping = {
  A: "B",
  "A#": "B",
  B: "B",
  C: "B",
  "C#": "D",
  D: "D",
  "D#": "D",
  E: "F",
  F: "F",
  "F#": "F",
  G: "G#",
  "G#": "G#",
};

/** Looks up the recommended course scale for a detected pitch class. */
export function recommendScale(
  pitchClass: PitchClass,
  mapping: ScaleMapping = DEFAULT_SCALE_MAPPING
): CourseScale {
  return mapping[pitchClass];
}

/**
 * Tonic (root) frequency recorded for each course scale's reference audio.
 * Used to express both the teacher's target contour and the student's live
 * pitch as cents-relative-to-tonic so they're directly comparable regardless
 * of absolute register.
 *
 * These are measured from the first real teacher recordings supplied for
 * the platform (the "Om Namo Bhagavate Rudraya" opening line, one take per
 * scale) — specifically the median pitch of each take's sustained "Oṃ".
 * They replace an earlier set of invented placeholder values used only for
 * the synthetic demo tones (see scripts/generate-test-tones.mjs, which is
 * kept in sync with these same numbers so that demo stays internally
 * consistent). Each lands close to its intended pitch-class bucket in
 * DEFAULT_SCALE_MAPPING (B ≈ A#2, D ≈ C#3, F ≈ F3, G# ≈ G3/G#3), each
 * roughly a minor third apart — a good sign the four takes are consistent
 * with each other and with how calibration buckets pitches.
 */
export const SCALE_ROOT_FREQUENCY_HZ: Record<CourseScale, number> = {
  B: 116.96,
  D: 140.64,
  F: 171.02,
  "G#": 201.26,
};

/** Validates that a (possibly admin-edited) mapping still covers every pitch class with a valid scale. */
export function isValidScaleMapping(mapping: unknown): mapping is ScaleMapping {
  if (typeof mapping !== "object" || mapping === null) return false;
  const record = mapping as Record<string, unknown>;
  const pitchClasses: PitchClass[] = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
  return pitchClasses.every(
    (pc) => typeof record[pc] === "string" && (COURSE_SCALES as readonly string[]).includes(record[pc] as string)
  );
}
