import { describe, expect, it } from "vitest";
import { DEFAULT_SCALE_MAPPING, isValidScaleMapping, recommendScale } from "./scaleMapping";
import type { PitchClass } from "./noteMapping";

describe("recommendScale — matches the product brief's initial table", () => {
  const expected: Record<string, "B" | "D" | "F"> = {
    A: "B",
    "A#": "B",
    B: "B",
    C: "B",
    "C#": "D",
    D: "D",
    "D#": "D",
    E: "F",
    F: "F",
    "F#": "F",
    G: "F",
    "G#": "F",
  };

  for (const [pitchClass, scale] of Object.entries(expected)) {
    it(`maps ${pitchClass} -> ${scale}`, () => {
      expect(recommendScale(pitchClass as PitchClass, DEFAULT_SCALE_MAPPING)).toBe(scale);
    });
  }

  it("respects a custom (admin-edited) mapping instead of the default", () => {
    const customMapping = { ...DEFAULT_SCALE_MAPPING, A: "F" as const };
    expect(recommendScale("A", customMapping)).toBe("F");
  });
});

describe("isValidScaleMapping", () => {
  it("accepts the default mapping", () => {
    expect(isValidScaleMapping(DEFAULT_SCALE_MAPPING)).toBe(true);
  });

  it("rejects a mapping missing a pitch class", () => {
    const { A: _omitted, ...incomplete } = DEFAULT_SCALE_MAPPING;
    expect(isValidScaleMapping(incomplete)).toBe(false);
  });

  it("rejects a mapping with an invalid scale value", () => {
    expect(isValidScaleMapping({ ...DEFAULT_SCALE_MAPPING, A: "Z" })).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidScaleMapping(null)).toBe(false);
    expect(isValidScaleMapping("B")).toBe(false);
  });
});
