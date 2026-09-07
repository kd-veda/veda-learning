import { describe, expect, it } from "vitest";
import { analyseFrequency, centsBetween, frequencyToMidi, midiToFrequency } from "./noteMapping";

// The exact synthetic frequencies required by the test plan, using A4 = 440Hz equal temperament.
const SYNTHETIC_FREQUENCIES: Array<{ label: string; hz: number; expectedPitchClass: string }> = [
  { label: "A4", hz: 440, expectedPitchClass: "A" },
  { label: "A#4/Bb4", hz: 440 * Math.pow(2, 1 / 12), expectedPitchClass: "A#" },
  { label: "B4", hz: 440 * Math.pow(2, 2 / 12), expectedPitchClass: "B" },
  { label: "C5", hz: 440 * Math.pow(2, 3 / 12), expectedPitchClass: "C" },
  { label: "C#5", hz: 440 * Math.pow(2, 4 / 12), expectedPitchClass: "C#" },
  { label: "D5", hz: 440 * Math.pow(2, 5 / 12), expectedPitchClass: "D" },
  { label: "D#5/Eb5", hz: 440 * Math.pow(2, 6 / 12), expectedPitchClass: "D#" },
  { label: "E5", hz: 440 * Math.pow(2, 7 / 12), expectedPitchClass: "E" },
  { label: "F5", hz: 440 * Math.pow(2, 8 / 12), expectedPitchClass: "F" },
  { label: "F#5/Gb5", hz: 440 * Math.pow(2, 9 / 12), expectedPitchClass: "F#" },
  { label: "G5", hz: 440 * Math.pow(2, 10 / 12), expectedPitchClass: "G" },
  { label: "G#5/Ab5", hz: 440 * Math.pow(2, 11 / 12), expectedPitchClass: "G#" },
];

describe("frequencyToMidi / midiToFrequency", () => {
  it("round-trips A4 = 440Hz to MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5);
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
  });

  it("throws for non-positive frequencies", () => {
    expect(() => frequencyToMidi(0)).toThrow();
    expect(() => frequencyToMidi(-10)).toThrow();
  });
});

describe("analyseFrequency — enharmonic sharp-only spelling", () => {
  for (const { label, hz, expectedPitchClass } of SYNTHETIC_FREQUENCIES) {
    it(`classifies ${label} (${hz.toFixed(2)}Hz) as ${expectedPitchClass}, not its flat spelling`, () => {
      const info = analyseFrequency(hz);
      expect(info.pitchClass).toBe(expectedPitchClass);
      expect(info.cents).toBeCloseTo(0, 0);
    });
  }

  it("reports cents sharp/flat correctly for a frequency between two notes", () => {
    // 10 cents sharp of A4.
    const hz = 440 * Math.pow(2, 10 / 1200);
    const info = analyseFrequency(hz);
    expect(info.pitchClass).toBe("A");
    expect(info.cents).toBeCloseTo(10, 0);
  });

  it("computes octave using scientific pitch notation (A4 -> octave 4, C5 -> octave 5)", () => {
    expect(analyseFrequency(440).octave).toBe(4);
    expect(analyseFrequency(440 * Math.pow(2, 3 / 12)).octave).toBe(5);
  });
});

describe("centsBetween", () => {
  it("is 1200 for a perfect octave", () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 5);
  });
  it("is 0 for identical frequencies", () => {
    expect(centsBetween(300, 300)).toBeCloseTo(0, 5);
  });
  it("is negative when the first frequency is lower", () => {
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 5);
  });
});
