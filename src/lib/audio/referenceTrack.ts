/**
 * Builds the two comparable "cents relative to the phrase tonic" sequences
 * that scoring.ts's scoreAttempt() (via dtw.ts) operates on:
 *   - the teacher's reference, sampled from syllable-level target contours
 *   - the student's live attempt, sampled from smoothed microphone frames
 */

import type { Phrase, Syllable } from "@/lib/data/types";
import type { PitchFrame } from "./smoothing";
import { centsBetween } from "./noteMapping";

export type FlatSyllable = Syllable;

const DEFAULT_FRAME_INTERVAL_SEC = 0.05;

/** Samples the teacher's target pitch contour across a phrase at a fixed frame rate, in cents relative to the tonic. */
export function buildReferenceCentsTrack(
  phrase: Phrase,
  syllables: FlatSyllable[],
  frameIntervalSec: number = DEFAULT_FRAME_INTERVAL_SEC
): Array<number | null> {
  const track: Array<number | null> = [];
  const sorted = [...syllables].sort((a, b) => a.startTimeSec - b.startTimeSec);

  for (let t = phrase.startTimeSec; t < phrase.endTimeSec; t += frameIntervalSec) {
    const syllable = sorted.find((s) => t >= s.startTimeSec && t < s.endTimeSec);
    if (!syllable || syllable.targetPitchContourCents.length === 0) {
      track.push(null);
      continue;
    }
    const progress = (t - syllable.startTimeSec) / Math.max(0.001, syllable.endTimeSec - syllable.startTimeSec);
    const contour = syllable.targetPitchContourCents;
    const index = Math.min(contour.length - 1, Math.floor(progress * contour.length));
    track.push(contour[index]);
  }

  return track;
}

/** Converts a smoothed, time-ordered stream of pitch frames into cents relative to a tonic frequency, one entry per frame. */
export function buildStudentCentsTrack(frames: PitchFrame[], tonicFrequencyHz: number, minConfidence = 0.5): Array<number | null> {
  return frames.map((frame) => {
    if (frame.frequencyHz === null || frame.confidence < minConfidence) return null;
    return centsBetween(frame.frequencyHz, tonicFrequencyHz);
  });
}

/** Returns the ordered list of syllables for a phrase's words, flattened for contour building / rendering. */
export function flattenPhraseSyllables(words: Array<{ syllables: Syllable[] }>): Syllable[] {
  return words.flatMap((w) => w.syllables);
}
