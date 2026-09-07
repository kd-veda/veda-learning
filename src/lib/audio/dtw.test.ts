import { describe, expect, it } from "vitest";
import { dynamicTimeWarp } from "./dtw";

describe("dynamicTimeWarp", () => {
  it("has zero cost for two identical sequences", () => {
    const seq = [0, 10, 20, 10, 0];
    const result = dynamicTimeWarp(seq, seq);
    expect(result.cost).toBe(0);
    expect(result.alignmentConfidence).toBe(1);
  });

  it("aligns a time-stretched version of the same shape with low cost", () => {
    const reference = [0, 50, 100, 50, 0];
    // Same shape, but each point repeated (i.e. student chanted slightly slower).
    const student = [0, 0, 50, 50, 100, 100, 50, 50, 0, 0];
    const result = dynamicTimeWarp(reference, student);
    expect(result.normalisedCost).toBeLessThan(5);
  });

  it("produces a higher cost for a genuinely different shape", () => {
    const reference = [0, 0, 0, 0, 0];
    const similar = [5, 5, 5, 5, 5];
    const different = [200, 200, 200, 200, 200];
    const similarResult = dynamicTimeWarp(reference, similar);
    const differentResult = dynamicTimeWarp(reference, different);
    expect(differentResult.normalisedCost).toBeGreaterThan(similarResult.normalisedCost);
  });

  it("treats null entries as gaps with a fixed penalty rather than crashing", () => {
    const reference = [0, null, 20, null, 0];
    const student = [0, 5, null, 15, 0];
    const result = dynamicTimeWarp(reference, student);
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.alignmentConfidence).toBeLessThan(1);
  });

  it("returns an empty result for two empty sequences without throwing", () => {
    const result = dynamicTimeWarp([], []);
    expect(result.path).toEqual([]);
    expect(result.cost).toBe(0);
  });
});
