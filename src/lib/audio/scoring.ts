/**
 * Turns a student's smoothed pitch trace + the teacher's reference contour
 * into the four separate scores the spec requires (intonation, timing,
 * phrase completion, pronunciation) plus an overall score, and classifies
 * individual moments into the green/amber/red/grey feedback colours used by
 * the tracing-paper UI.
 */

import { dynamicTimeWarp } from "./dtw";
import type { PitchFrame } from "./smoothing";

export type FeedbackColour = "green" | "amber" | "red" | "grey";

export interface PitchTolerance {
  /** Cents within which feedback is "green". Default 25. */
  greenCents: number;
  /** Cents within which feedback is "amber" (beyond green, up to this). Default 50. */
  amberCents: number;
  /** When true, an error that is an exact multiple of an octave (1200 cents) is not penalised. */
  octaveToleranceEnabled: boolean;
}

export const DEFAULT_PITCH_TOLERANCE: PitchTolerance = {
  greenCents: 25,
  amberCents: 50,
  octaveToleranceEnabled: true,
};

/**
 * Classifies a single pitch-difference measurement (in cents) into a
 * feedback colour. `null` input (no voiced signal / low confidence) always
 * yields "grey" — insufficient microphone confidence, never a wrong colour.
 */
export function classifyPitchDifference(
  differenceCents: number | null,
  tolerance: PitchTolerance = DEFAULT_PITCH_TOLERANCE
): FeedbackColour {
  if (differenceCents === null) return "grey";

  let effective = Math.abs(differenceCents);
  if (tolerance.octaveToleranceEnabled) {
    const nearestOctaveMultiple = Math.round(effective / 1200) * 1200;
    effective = Math.abs(effective - nearestOctaveMultiple);
  }

  if (effective <= tolerance.greenCents) return "green";
  if (effective <= tolerance.amberCents) return "amber";
  return "red";
}

export interface ScoreBreakdown {
  intonationAccuracy: number; // 0-100
  timingAccuracy: number; // 0-100
  phraseCompletion: number; // 0-100
  pronunciationSimilarity: number | null; // 0-100, null if not computed (see pronunciation.ts)
  overall: number; // 0-100, weighted combination
  alignmentConfidence: number; // 0-1, from DTW — low means the other numbers are less trustworthy
}

export interface ScoreWeights {
  intonation: number;
  timing: number;
  completion: number;
  pronunciation: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  intonation: 0.4,
  timing: 0.25,
  completion: 0.2,
  pronunciation: 0.15,
};

/**
 * Computes the full score breakdown for one practice attempt.
 *
 * @param referenceCents  Teacher's pitch contour, expressed as cents relative
 *   to the phrase's tonic, one entry per analysis frame (null = unvoiced).
 * @param studentCents    Student's pitch contour, same representation/frame rate.
 * @param expectedFrameCount  How many frames the phrase "should" take at
 *   normal tempo — used to score phrase completion (did the student stop early?).
 * @param pronunciationSimilarity  Optional 0-100 score from the pronunciation
 *   module (see pronunciation.ts); omitted entirely if not available, and
 *   the overall score is re-weighted across the remaining categories rather
 *   than penalising the student for a feature that didn't run.
 */
export function scoreAttempt(
  referenceCents: Array<number | null>,
  studentCents: Array<number | null>,
  expectedFrameCount: number,
  options: {
    tolerance?: PitchTolerance;
    weights?: ScoreWeights;
    pronunciationSimilarity?: number | null;
  } = {}
): ScoreBreakdown {
  const tolerance = options.tolerance ?? DEFAULT_PITCH_TOLERANCE;
  const weights = options.weights ?? DEFAULT_SCORE_WEIGHTS;
  const pronunciationSimilarity = options.pronunciationSimilarity ?? null;

  const alignment = dynamicTimeWarp(referenceCents, studentCents);

  // Intonation: average "goodness" (1 for green, partial for amber, 0 for red/grey) over the aligned path.
  let intonationSum = 0;
  let intonationCount = 0;
  for (const [ri, si] of alignment.path) {
    const r = referenceCents[ri];
    const s = studentCents[si];
    if (r === null || s === null) continue;
    const diff = s - r;
    const colour = classifyPitchDifference(diff, tolerance);
    intonationSum += colour === "green" ? 1 : colour === "amber" ? 0.5 : 0;
    intonationCount++;
  }
  const intonationAccuracy = intonationCount > 0 ? round1((intonationSum / intonationCount) * 100) : 0;

  // Timing: how closely the optimal DTW path hugs the diagonal (a perfectly
  // on-tempo attempt aligns index-for-index; drifting ahead/behind bends the
  // path away from the diagonal).
  const timingAccuracy = round1(computeTimingScore(alignment.path, referenceCents.length, studentCents.length));

  // Phrase completion: how much of the reference the student actually attempted/voiced.
  const voicedStudentFrames = studentCents.filter((c) => c !== null).length;
  const phraseCompletion = round1(clamp01(voicedStudentFrames / Math.max(1, expectedFrameCount)) * 100);

  const categories: Array<{ score: number; weight: number }> = [
    { score: intonationAccuracy, weight: weights.intonation },
    { score: timingAccuracy, weight: weights.timing },
    { score: phraseCompletion, weight: weights.completion },
  ];
  if (pronunciationSimilarity !== null) {
    categories.push({ score: pronunciationSimilarity, weight: weights.pronunciation });
  }
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0) || 1;
  const overall = round1(categories.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight);

  return {
    intonationAccuracy,
    timingAccuracy,
    phraseCompletion,
    pronunciationSimilarity,
    overall,
    alignmentConfidence: round2(alignment.alignmentConfidence),
  };
}

function computeTimingScore(path: Array<[number, number]>, refLength: number, studentLength: number): number {
  if (path.length === 0) return 0;
  // Expected diagonal slope maps reference index -> expected student index.
  const slope = studentLength / Math.max(1, refLength);
  let errorSum = 0;
  for (const [ri, si] of path) {
    const expectedSi = ri * slope;
    errorSum += Math.abs(si - expectedSi);
  }
  const meanError = errorSum / path.length;
  // Normalise: an average drift of >= 25% of the phrase length scores 0.
  const normalisedError = clamp01(meanError / (0.25 * Math.max(1, studentLength)));
  return (1 - normalisedError) * 100;
}

/** Turns a whole-attempt overall score into one of the gentle, encouraging phrases the spec requires. */
export function encouragingMessageFor(score: ScoreBreakdown): string {
  if (score.alignmentConfidence < 0.4) {
    return "Let's listen once more and trace the teacher's voice together.";
  }
  if (score.overall >= 85) {
    return "Wonderful consistency — your timing and pitch were both excellent.";
  }
  if (score.overall >= 65) {
    return "Beautiful effort. Let's try that phrase once more, holding the svarita slightly steadier.";
  }
  return "A good beginning. Listen once more, then trace the teacher's voice at your own pace.";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Re-exported for convenience so UI code has one import for "is this frame voiced". */
export function isVoicedFrame(frame: PitchFrame, minConfidence = 0.5): boolean {
  return frame.frequencyHz !== null && frame.confidence >= minConfidence;
}

export interface SyllableLike {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  targetPitchContourCents: number[];
}

/**
 * Approximates per-syllable colour feedback for re-rendering the
 * tracing-paper view after an attempt. Student frames are assumed to span
 * roughly the phrase duration in chronological order (true for both
 * "chant along" and "independent practice" capture windows); their
 * timestamps are normalised to start at 0 before this runs.
 */
export function computeSyllableFeedback(
  syllables: SyllableLike[],
  phraseDurationSec: number,
  normalisedStudentFrames: PitchFrame[],
  tonicFrequencyHz: number,
  tolerance: PitchTolerance = DEFAULT_PITCH_TOLERANCE,
  minConfidence = 0.5
): Map<string, FeedbackColour> {
  const feedback = new Map<string, FeedbackColour>();
  const totalFrames = normalisedStudentFrames.length;

  for (const syllable of syllables) {
    const framesInWindow = normalisedStudentFrames.filter(
      (f) => f.timeSec >= syllable.startTimeSec && f.timeSec < syllable.endTimeSec
    );
    const counts: Record<FeedbackColour, number> = { green: 0, amber: 0, red: 0, grey: 0 };

    for (const frame of framesInWindow) {
      if (frame.frequencyHz === null || frame.confidence < minConfidence) {
        counts.grey++;
        continue;
      }
      const cents = 1200 * Math.log2(frame.frequencyHz / tonicFrequencyHz);
      const progress = (frame.timeSec - syllable.startTimeSec) / Math.max(0.001, syllable.endTimeSec - syllable.startTimeSec);
      const contour = syllable.targetPitchContourCents;
      const targetCents = contour.length > 0 ? contour[Math.min(contour.length - 1, Math.floor(progress * contour.length))] : 0;
      counts[classifyPitchDifference(cents - targetCents, tolerance)]++;
    }

    const best = (Object.entries(counts) as Array<[FeedbackColour, number]>).sort((a, b) => b[1] - a[1])[0];
    feedback.set(syllable.id, totalFrames === 0 || best[1] === 0 ? "grey" : best[0]);
  }

  return feedback;
}
