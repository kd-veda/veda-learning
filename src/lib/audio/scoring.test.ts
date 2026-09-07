import { describe, expect, it } from "vitest";
import { classifyPitchDifference, scoreAttempt, encouragingMessageFor, DEFAULT_PITCH_TOLERANCE } from "./scoring";

describe("classifyPitchDifference — tolerance bands", () => {
  it("classifies null (no signal) as grey", () => {
    expect(classifyPitchDifference(null)).toBe("grey");
  });

  it("classifies within the green band (<=25 cents) as green", () => {
    expect(classifyPitchDifference(0)).toBe("green");
    expect(classifyPitchDifference(24)).toBe("green");
    expect(classifyPitchDifference(-25)).toBe("green");
  });

  it("classifies the amber band (25-50 cents) as amber", () => {
    expect(classifyPitchDifference(26)).toBe("amber");
    expect(classifyPitchDifference(-49)).toBe("amber");
  });

  it("classifies beyond 50 cents as red", () => {
    expect(classifyPitchDifference(51)).toBe("red");
    expect(classifyPitchDifference(-500)).toBe("red");
  });

  it("respects a configurable tolerance override", () => {
    const looser = { greenCents: 60, amberCents: 100, octaveToleranceEnabled: true };
    expect(classifyPitchDifference(55, looser)).toBe("green");
  });

  it("does not penalise an exact octave error when octave tolerance is enabled", () => {
    expect(classifyPitchDifference(1200, DEFAULT_PITCH_TOLERANCE)).toBe("green");
    expect(classifyPitchDifference(-1200, DEFAULT_PITCH_TOLERANCE)).toBe("green");
  });

  it("does penalise an octave error when octave tolerance is disabled", () => {
    const strict = { ...DEFAULT_PITCH_TOLERANCE, octaveToleranceEnabled: false };
    expect(classifyPitchDifference(1200, strict)).toBe("red");
  });
});

describe("scoreAttempt", () => {
  it("scores a perfect match as high on intonation and timing", () => {
    const reference = [0, 0, 50, 50, 100, 100, 50, 50, 0, 0];
    const student = [0, 0, 50, 50, 100, 100, 50, 50, 0, 0];
    const score = scoreAttempt(reference, student, reference.length);
    expect(score.intonationAccuracy).toBeGreaterThan(90);
    expect(score.timingAccuracy).toBeGreaterThan(90);
    expect(score.overall).toBeGreaterThan(85);
  });

  it("scores a wildly off-pitch attempt low on intonation", () => {
    const reference = [0, 0, 0, 0, 0];
    const student = [400, 400, 400, 400, 400];
    const score = scoreAttempt(reference, student, reference.length);
    expect(score.intonationAccuracy).toBeLessThan(20);
  });

  it("still scores intonation highly when the student follows the melody shape but sings consistently sharp/flat (within a whole step)", () => {
    const reference = [0, 0, 50, 50, 100, 100, 50, 50, 0, 0];
    const consistentlyFlatByAWholeStep = reference.map((c) => c - 180);
    const score = scoreAttempt(reference, consistentlyFlatByAWholeStep, reference.length);
    expect(score.intonationAccuracy).toBeGreaterThan(90);
  });

  it("still scores a genuinely wrong shape low on intonation even after allowing for a consistent offset", () => {
    const reference = [0, 0, 50, 50, 100, 100, 50, 50, 0, 0];
    // Flat by a whole step (forgiven) but also wandering unpredictably — the wandering should still cost points.
    const wandering = [-180, 40, -220, 90, -140, 260, -190, -10, -170, 210];
    const score = scoreAttempt(reference, wandering, reference.length);
    expect(score.intonationAccuracy).toBeLessThan(60);
  });

  it("scores phrase completion low when the student stops early", () => {
    const reference = new Array(20).fill(0);
    const student = [0, 0, 0]; // stopped after 3 of 20 expected frames
    const score = scoreAttempt(reference, student, reference.length);
    expect(score.phraseCompletion).toBeLessThan(30);
  });

  it("has low alignment confidence when both sequences are mostly gaps", () => {
    const reference = [null, null, null, null];
    const student = [null, null, null, null];
    const score = scoreAttempt(reference, student, 4);
    expect(score.alignmentConfidence).toBeLessThan(0.5);
  });

  it("re-weights across remaining categories when pronunciation similarity is omitted", () => {
    const reference = [0, 0, 0];
    const student = [0, 0, 0];
    const withoutPronunciation = scoreAttempt(reference, student, 3);
    const withPronunciation = scoreAttempt(reference, student, 3, { pronunciationSimilarity: 40 });
    expect(withoutPronunciation.pronunciationSimilarity).toBeNull();
    expect(withPronunciation.pronunciationSimilarity).toBe(40);
    // Adding a mediocre pronunciation score should pull the overall down relative to a perfect attempt without it.
    expect(withPronunciation.overall).toBeLessThan(withoutPronunciation.overall);
  });
});

describe("encouragingMessageFor", () => {
  it("never returns a harsh or negative phrase", () => {
    const negativeWords = ["fail", "bad", "wrong", "poor"];
    const scores = [
      { intonationAccuracy: 95, timingAccuracy: 95, phraseCompletion: 95, pronunciationSimilarity: null, overall: 95, alignmentConfidence: 0.9 },
      { intonationAccuracy: 40, timingAccuracy: 40, phraseCompletion: 40, pronunciationSimilarity: null, overall: 40, alignmentConfidence: 0.9 },
      { intonationAccuracy: 0, timingAccuracy: 0, phraseCompletion: 0, pronunciationSimilarity: null, overall: 0, alignmentConfidence: 0.1 },
    ];
    for (const score of scores) {
      const message = encouragingMessageFor(score).toLowerCase();
      for (const word of negativeWords) expect(message).not.toContain(word);
    }
  });
});
