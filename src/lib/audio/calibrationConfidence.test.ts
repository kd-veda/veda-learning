import { describe, expect, it } from "vitest";
import { combineCalibrationAttempts, evaluateCalibrationAttempt } from "./calibrationConfidence";
import type { StablePitchResult } from "./smoothing";

function stable(overrides: Partial<StablePitchResult> = {}): StablePitchResult {
  return { medianFrequencyHz: 220, voicedRatio: 0.9, meanConfidence: 0.8, frameCount: 20, ...overrides };
}

describe("evaluateCalibrationAttempt", () => {
  it("accepts a clean, confident, voiced attempt", () => {
    const result = evaluateCalibrationAttempt(stable());
    expect(result.accepted).toBe(true);
  });

  it("rejects an attempt with no detected frequency (too quiet / no signal)", () => {
    const result = evaluateCalibrationAttempt(stable({ medianFrequencyHz: null }));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("too_quiet");
  });

  it("rejects an attempt that was mostly unvoiced", () => {
    const result = evaluateCalibrationAttempt(stable({ voicedRatio: 0.2 }));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("too_short_voiced");
  });

  it("rejects an attempt with low mean confidence", () => {
    const result = evaluateCalibrationAttempt(stable({ meanConfidence: 0.2 }));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("low_confidence");
  });
});

describe("combineCalibrationAttempts", () => {
  it("is reliable and takes the median frequency when 2+ attempts are accepted", () => {
    const evaluations = [
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 210 })),
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 220 })),
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 230 })),
    ];
    const combined = combineCalibrationAttempts(evaluations);
    expect(combined.isReliable).toBe(true);
    expect(combined.acceptedAttempts).toBe(3);
    expect(combined.frequencyHz).toBe(220);
  });

  it("is not reliable when fewer than 2 attempts are accepted", () => {
    const evaluations = [
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 220 })),
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: null })),
      evaluateCalibrationAttempt(stable({ voicedRatio: 0.1 })),
    ];
    const combined = combineCalibrationAttempts(evaluations);
    expect(combined.isReliable).toBe(false);
  });

  it("ignores rejected attempts entirely, including an outlier throat-clear", () => {
    const evaluations = [
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 220 })),
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 221 })),
      evaluateCalibrationAttempt(stable({ medianFrequencyHz: 900, voicedRatio: 0.1 })), // rejected: too_short_voiced
    ];
    const combined = combineCalibrationAttempts(evaluations);
    expect(combined.acceptedAttempts).toBe(2);
    expect(combined.frequencyHz).toBeLessThan(300);
  });
});
