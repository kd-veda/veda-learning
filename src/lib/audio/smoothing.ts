/**
 * Smoothing over a stream of per-frame pitch-detection results.
 *
 * Two problems this solves, both called out explicitly in the product spec:
 *  1. "Do not colour an entire word red because of one unstable millisecond" —
 *     a single noisy/octave-jump frame should not flip the visible feedback.
 *  2. Calibration needs a single, stable "comfortable Om" frequency out of a
 *     few seconds of naturally wavering breath — not the first frame, not the
 *     mean (which unstable attack/release frames would skew), but a median
 *     over the stable, voiced middle of the attempt.
 */

import type { PitchDetectionResult } from "./pitchDetector";

export interface PitchFrame extends PitchDetectionResult {
  /** Seconds from the start of the recording/stream this frame represents. */
  timeSec: number;
}

export interface SmoothingOptions {
  /** Odd window size (in frames) for the rolling median filter. Default 5. */
  medianWindow?: number;
  /** Minimum confidence for a frame to be treated as voiced. Default 0.5. */
  minConfidence?: number;
}

/**
 * Applies a rolling median filter to the *frequency* of a sequence of
 * frames (in cents, to avoid the filter being dominated by absolute Hz
 * scale), leaving unvoiced/low-confidence frames as null. Median filtering
 * is deliberately preferred over a moving average because it rejects
 * single-frame octave-jump outliers instead of averaging them in.
 */
export function smoothPitchTrack(frames: PitchFrame[], options: SmoothingOptions = {}): PitchFrame[] {
  const medianWindow = options.medianWindow ?? 5;
  const minConfidence = options.minConfidence ?? 0.5;
  const half = Math.floor(medianWindow / 2);

  const voicedFrequencies: (number | null)[] = frames.map((f) =>
    f.frequencyHz !== null && f.confidence >= minConfidence ? f.frequencyHz : null
  );

  return frames.map((frame, i) => {
    if (voicedFrequencies[i] === null) {
      return { ...frame, frequencyHz: null };
    }
    const windowValues: number[] = [];
    for (let j = Math.max(0, i - half); j <= Math.min(frames.length - 1, i + half); j++) {
      const v = voicedFrequencies[j];
      if (v !== null) windowValues.push(v);
    }
    windowValues.sort((a, b) => a - b);
    const median = windowValues[Math.floor(windowValues.length / 2)];
    return { ...frame, frequencyHz: median ?? frame.frequencyHz };
  });
}

export interface StablePitchResult {
  medianFrequencyHz: number | null;
  /** Fraction (0..1) of frames in the analysed window that were confidently voiced. */
  voicedRatio: number;
  /** Mean confidence across voiced frames used in the median. */
  meanConfidence: number;
  frameCount: number;
}

/**
 * Extracts one stable frequency estimate from a short calibration attempt
 * (e.g. a 4-6s "Om"): trims a configurable fraction of the start/end
 * (unstable attack/release), keeps only confidently-voiced frames, and takes
 * the median of what's left.
 */
export function extractStableFrequency(
  frames: PitchFrame[],
  options: SmoothingOptions & { trimFraction?: number } = {}
): StablePitchResult {
  const minConfidence = options.minConfidence ?? 0.5;
  const trimFraction = options.trimFraction ?? 0.15;

  if (frames.length === 0) {
    return { medianFrequencyHz: null, voicedRatio: 0, meanConfidence: 0, frameCount: 0 };
  }

  const trimCount = Math.floor(frames.length * trimFraction);
  const trimmed = frames.slice(trimCount, frames.length - trimCount || undefined);
  const usable = trimmed.length > 0 ? trimmed : frames;

  const voiced = usable.filter((f) => f.frequencyHz !== null && f.confidence >= minConfidence);
  const voicedRatio = usable.length > 0 ? voiced.length / usable.length : 0;

  if (voiced.length === 0) {
    return { medianFrequencyHz: null, voicedRatio, meanConfidence: 0, frameCount: usable.length };
  }

  const sortedFrequencies = voiced.map((f) => f.frequencyHz as number).sort((a, b) => a - b);
  const medianFrequencyHz = sortedFrequencies[Math.floor(sortedFrequencies.length / 2)];
  const meanConfidence = voiced.reduce((sum, f) => sum + f.confidence, 0) / voiced.length;

  return { medianFrequencyHz, voicedRatio, meanConfidence, frameCount: usable.length };
}
