/**
 * Pronunciation analysis — deliberately modular and clearly scoped as
 * *guidance*, never authoritative correction (per the spec: "Sanskrit and
 * Vedic pronunciation must ultimately be validated against teacher-approved
 * examples" and "Never display claims such as 'perfect pronunciation' based
 * only on pitch matching").
 *
 * The MVP implementation compares phrase-level audio energy-envelope
 * similarity between the student's recording and the teacher's reference
 * for the same phrase window (a coarse proxy for "did this roughly match the
 * rhythm/shape of the teacher's articulation"). It is intentionally NOT a
 * phoneme recognizer.
 *
 * `PronunciationAnalyzer` is the interface a future, specialised Sanskrit
 * phoneme model or forced-alignment service (see docs/PHASE_2.md) should
 * implement so it can be swapped in without touching scoring.ts or any UI.
 */

export interface PronunciationAnalysisInput {
  referenceSamples: Float32Array;
  studentSamples: Float32Array;
  sampleRate: number;
}

export interface PronunciationAnalysisResult {
  /** 0-100 guidance score. Always paired with `label` in the UI — never shown as a bare number implying certainty. */
  similarity: number;
  /** Human-readable framing that must always accompany the score. */
  label: "guidance-only";
  /** Short explanation shown alongside the score so students/teachers don't over-trust it. */
  disclaimer: string;
}

export interface PronunciationAnalyzer {
  analyse(input: PronunciationAnalysisInput): Promise<PronunciationAnalysisResult>;
}

const DISCLAIMER =
  "This is a rough guide to rhythm and articulation shape, not a pronunciation grade. " +
  "For accurate correction, compare your recording with the teacher's and, where possible, practise with a teacher.";

/**
 * MVP analyzer: envelope-similarity via normalised cross-correlation of the
 * two signals' amplitude envelopes. Deliberately simple and explainable.
 */
export const envelopeSimilarityAnalyzer: PronunciationAnalyzer = {
  async analyse({ referenceSamples, studentSamples }) {
    const similarity = computeEnvelopeSimilarity(referenceSamples, studentSamples);
    return {
      similarity: Math.round(similarity * 100),
      label: "guidance-only",
      disclaimer: DISCLAIMER,
    };
  },
};

function computeEnvelopeSimilarity(a: Float32Array, b: Float32Array): number {
  const windowSize = 512;
  const envA = amplitudeEnvelope(a, windowSize);
  const envB = amplitudeEnvelope(b, windowSize);

  const length = Math.min(envA.length, envB.length);
  if (length === 0) return 0;

  // Resample the longer envelope down (simple nearest-neighbour) so both
  // have `length` points — good enough for a coarse shape comparison.
  const na = resampleTo(envA, length);
  const nb = resampleTo(envB, length);

  const meanA = mean(na);
  const meanB = mean(nb);

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < length; i++) {
    const da = na[i] - meanA;
    const db = nb[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return 0;

  const correlation = numerator / denom; // -1..1
  return Math.max(0, correlation); // clamp negative correlation to 0 for a 0-100 "similarity" framing
}

function amplitudeEnvelope(samples: Float32Array, windowSize: number): Float32Array {
  const frames = Math.max(1, Math.floor(samples.length / windowSize));
  const envelope = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * windowSize;
    const end = Math.min(samples.length, start + windowSize);
    for (let i = start; i < end; i++) sum += Math.abs(samples[i]);
    envelope[f] = sum / Math.max(1, end - start);
  }
  return envelope;
}

function resampleTo(data: Float32Array, targetLength: number): Float32Array {
  if (data.length === targetLength) return data;
  const result = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = Math.floor((i / targetLength) * data.length);
    result[i] = data[Math.min(data.length - 1, sourceIndex)];
  }
  return result;
}

function mean(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return data.length > 0 ? sum / data.length : 0;
}
