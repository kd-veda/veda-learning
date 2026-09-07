import { describe, expect, it } from "vitest";
import { extractStableFrequency, smoothPitchTrack, type PitchFrame } from "./smoothing";

function frame(timeSec: number, frequencyHz: number | null, confidence = 0.9, rms = 0.1): PitchFrame {
  return { timeSec, frequencyHz, confidence, rms };
}

describe("smoothPitchTrack", () => {
  it("rejects a single-frame octave-jump outlier via the median filter", () => {
    const frames: PitchFrame[] = [
      frame(0, 220),
      frame(0.02, 220),
      frame(0.04, 440), // one wild outlier — should be smoothed away
      frame(0.06, 220),
      frame(0.08, 220),
    ];
    const smoothed = smoothPitchTrack(frames, { medianWindow: 5 });
    expect(smoothed[2].frequencyHz).toBeCloseTo(220, 0);
  });

  it("marks low-confidence frames as unvoiced (null) regardless of their raw frequency", () => {
    const frames: PitchFrame[] = [frame(0, 220, 0.9), frame(0.02, 220, 0.1), frame(0.04, 220, 0.9)];
    const smoothed = smoothPitchTrack(frames, { minConfidence: 0.5 });
    expect(smoothed[1].frequencyHz).toBeNull();
  });

  it("leaves a stable, confident track essentially unchanged", () => {
    const frames: PitchFrame[] = Array.from({ length: 10 }, (_, i) => frame(i * 0.02, 300));
    const smoothed = smoothPitchTrack(frames);
    for (const f of smoothed) expect(f.frequencyHz).toBeCloseTo(300, 0);
  });
});

describe("extractStableFrequency", () => {
  it("returns the median of the stable, voiced middle of an attempt, trimming attack/release", () => {
    const frames: PitchFrame[] = [
      frame(0, 150, 0.9), // unstable attack (will be trimmed)
      frame(0.1, 149, 0.9),
      frame(0.2, 220, 0.9),
      frame(0.3, 220, 0.9),
      frame(0.4, 221, 0.9),
      frame(0.5, 219, 0.9),
      frame(0.6, 220, 0.9),
      frame(0.7, 220, 0.9),
      frame(0.8, 100, 0.9), // unstable release (will be trimmed)
      frame(0.9, 95, 0.9),
    ];
    const result = extractStableFrequency(frames, { trimFraction: 0.2 });
    expect(result.medianFrequencyHz).toBeCloseTo(220, 0);
    expect(result.voicedRatio).toBeGreaterThan(0.9);
  });

  it("returns null for a fully silent/unvoiced attempt", () => {
    const frames: PitchFrame[] = Array.from({ length: 5 }, (_, i) => frame(i * 0.1, null, 0));
    const result = extractStableFrequency(frames);
    expect(result.medianFrequencyHz).toBeNull();
    expect(result.voicedRatio).toBe(0);
  });

  it("handles an empty frame list without throwing", () => {
    const result = extractStableFrequency([]);
    expect(result.medianFrequencyHz).toBeNull();
    expect(result.frameCount).toBe(0);
  });
});
