/**
 * YIN pitch detection.
 *
 * Implements the YIN algorithm (de Cheveigné & Kawahara, 2002), a
 * time-domain autocorrelation-based method chosen (see docs/PLAN.md §4)
 * because it is well documented, easy to unit-test with synthetic sine
 * waves, cheap enough to run every ~20-30ms inside an AudioWorklet, and free
 * of any third-party audio-framework dependency.
 *
 * Algorithm summary:
 *   1. Difference function d(tau): sum of squared differences between the
 *      signal and a copy of itself shifted by `tau` samples.
 *   2. Cumulative mean normalized difference function (CMNDF) — this is
 *      YIN's key improvement over plain autocorrelation: it suppresses the
 *      tendency to lock onto tau=0 and low-tau octave errors.
 *   3. Absolute threshold: pick the first tau where CMNDF dips below a
 *      threshold and is a local minimum ("smallest lag with a good enough
 *      match", rather than the single global minimum, which resists
 *      octave-jump errors).
 *   4. Parabolic interpolation around that tau for sub-sample precision.
 *   5. Convert tau (in samples) to a frequency in Hz.
 */

export interface PitchDetectionResult {
  /** Detected fundamental frequency in Hz, or null if no confident pitch was found. */
  frequencyHz: number | null;
  /** 0..1 confidence — derived from 1 - CMNDF at the chosen tau. */
  confidence: number;
  /** RMS amplitude of the analysed frame, useful for a volume meter / silence detection. */
  rms: number;
}

export interface YinOptions {
  /** Sample rate of the input buffer, in Hz. */
  sampleRate: number;
  /** CMNDF threshold below which a dip is accepted (YIN paper default: 0.10-0.15). */
  threshold?: number;
  /** Ignore candidate frequencies below this (Hz) — filters out very low rumble. */
  minFrequencyHz?: number;
  /** Ignore candidate frequencies above this (Hz) — the human chanting voice tops out well below this. */
  maxFrequencyHz?: number;
  /** Frames with RMS below this are treated as silence (no pitch), avoiding noise being reported as a note. */
  silenceRmsThreshold?: number;
}

const DEFAULT_OPTIONS: Required<Omit<YinOptions, "sampleRate">> = {
  threshold: 0.12,
  minFrequencyHz: 60, // below the lowest plausible chanting fundamental
  maxFrequencyHz: 1000, // above the highest plausible chanting fundamental/harmonic confusion range
  silenceRmsThreshold: 0.01,
};

/**
 * Runs YIN pitch detection on one frame of mono PCM samples in the range [-1, 1].
 */
export function detectPitchYin(buffer: Float32Array, options: YinOptions): PitchDetectionResult {
  const { sampleRate } = options;
  const { threshold, minFrequencyHz, maxFrequencyHz, silenceRmsThreshold } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const rms = computeRms(buffer);
  if (rms < silenceRmsThreshold) {
    return { frequencyHz: null, confidence: 0, rms };
  }

  const maxTau = Math.min(buffer.length - 1, Math.floor(sampleRate / minFrequencyHz));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequencyHz));
  if (maxTau <= minTau) {
    return { frequencyHz: null, confidence: 0, rms };
  }

  const cmndf = cumulativeMeanNormalizedDifference(buffer, maxTau);

  let tau = -1;
  for (let t = minTau; t < maxTau; t++) {
    if (cmndf[t] < threshold) {
      // Walk forward while it keeps improving (local minimum), then stop —
      // this is the "smallest lag with a good enough match" step of YIN.
      let candidate = t;
      while (candidate + 1 < maxTau && cmndf[candidate + 1] < cmndf[candidate]) {
        candidate++;
      }
      tau = candidate;
      break;
    }
  }

  if (tau === -1) {
    // No dip cleared the threshold anywhere — fall back to the global
    // minimum, but report low confidence so callers can treat it as unvoiced.
    let minIndex = minTau;
    for (let t = minTau; t < maxTau; t++) {
      if (cmndf[t] < cmndf[minIndex]) minIndex = t;
    }
    tau = minIndex;
    const confidence = clamp01(1 - cmndf[tau]);
    if (confidence < 0.5) {
      return { frequencyHz: null, confidence, rms };
    }
  }

  const betterTau = parabolicInterpolation(cmndf, tau);
  const frequencyHz = sampleRate / betterTau;
  const confidence = clamp01(1 - cmndf[tau]);

  if (frequencyHz < minFrequencyHz || frequencyHz > maxFrequencyHz || !isFinite(frequencyHz)) {
    return { frequencyHz: null, confidence, rms };
  }

  return { frequencyHz, confidence, rms };
}

function computeRms(buffer: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  return Math.sqrt(sumSquares / buffer.length);
}

/** Steps 1-2 of YIN: difference function, then cumulative mean normalization. */
function cumulativeMeanNormalizedDifference(buffer: Float32Array, maxTau: number): Float32Array {
  const d = new Float32Array(maxTau + 1);
  d[0] = 1;

  const diff = new Float32Array(maxTau + 1);
  diff[0] = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - tau; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    d[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
  }

  return d;
}

/** Sub-sample tau refinement via parabolic interpolation around the chosen minimum. */
function parabolicInterpolation(cmndf: Float32Array, tau: number): number {
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < cmndf.length ? tau + 1 : tau;
  if (x0 === tau || x2 === tau) return tau;

  const s0 = cmndf[x0];
  const s1 = cmndf[tau];
  const s2 = cmndf[x2];
  const denominator = 2 * (2 * s1 - s2 - s0);
  if (denominator === 0) return tau;
  return tau + (s2 - s0) / denominator;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
