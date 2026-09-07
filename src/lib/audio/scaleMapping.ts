/**
 * Configurable mapping from a student's detected comfortable pitch class to
 * one of the three course scales the platform records lessons in (B, D, F).
 *
 * This is intentionally NOT hard-coded into the calibration flow — the
 * defaults below match the spec's initial table, but an admin can override
 * them from the admin "Configuration" page (see src/lib/config/appConfig.ts
 * for how this merges with any admin override stored in the database).
 */

import type { PitchClass } from "./noteMapping";

export const COURSE_SCALES = ["B", "D", "F"] as const;
export type CourseScale = (typeof COURSE_SCALES)[number];

export type ScaleMapping = Record<PitchClass, CourseScale>;

/** The initial recommendation mapping specified in the product brief. */
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
  G: "F",
  "G#": "F",
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
 * of absolute register. Mirrors scripts/generate-test-tones.mjs.
 */
export const SCALE_ROOT_FREQUENCY_HZ: Record<CourseScale, number> = {
  B: 246.94, // B3
  D: 293.66, // D4
  F: 349.23, // F4
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
