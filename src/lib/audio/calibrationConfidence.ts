/**
 * Decides whether a single "Om" calibration attempt is usable, and combines
 * three attempts into one final recommendation. Kept separate from
 * smoothing.ts because this encodes calibration-specific *policy*
 * (thresholds, attempt-rejection, combining attempts), not general DSP.
 */

import type { StablePitchResult } from "./smoothing";

export interface AttemptEvaluation {
  accepted: boolean;
  reason?: "too_quiet" | "too_short_voiced" | "low_confidence" | "ok";
  stable: StablePitchResult;
}

const MIN_VOICED_RATIO = 0.5;
const MIN_MEAN_CONFIDENCE = 0.55;

/** Evaluates one calibration attempt (a single "Om") for acceptability. */
export function evaluateCalibrationAttempt(stable: StablePitchResult): AttemptEvaluation {
  if (stable.medianFrequencyHz === null) {
    return { accepted: false, reason: "too_quiet", stable };
  }
  if (stable.voicedRatio < MIN_VOICED_RATIO) {
    return { accepted: false, reason: "too_short_voiced", stable };
  }
  if (stable.meanConfidence < MIN_MEAN_CONFIDENCE) {
    return { accepted: false, reason: "low_confidence", stable };
  }
  return { accepted: true, reason: "ok", stable };
}

export interface CombinedCalibrationResult {
  /** Median of the accepted attempts' frequencies — the "comfortable Om" pitch. */
  frequencyHz: number | null;
  acceptedAttempts: number;
  totalAttempts: number;
  /** True once at least 2 of the (up to 3) attempts were accepted and usable. */
  isReliable: boolean;
}

/**
 * Combines up to three calibration attempts into a single frequency. Uses
 * the median of accepted attempts (robust to one outlier attempt, e.g. a
 * throat-clear) rather than the mean.
 */
export function combineCalibrationAttempts(evaluations: AttemptEvaluation[]): CombinedCalibrationResult {
  const accepted = evaluations.filter((e) => e.accepted && e.stable.medianFrequencyHz !== null);
  const frequencies = accepted
    .map((e) => e.stable.medianFrequencyHz as number)
    .sort((a, b) => a - b);

  const frequencyHz = frequencies.length > 0 ? frequencies[Math.floor(frequencies.length / 2)] : null;

  return {
    frequencyHz,
    acceptedAttempts: accepted.length,
    totalAttempts: evaluations.length,
    isReliable: accepted.length >= 2 && frequencyHz !== null,
  };
}
