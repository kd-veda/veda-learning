import { describe, expect, it } from "vitest";
import { buildReferenceCentsTrack, buildStudentCentsTrack } from "./referenceTrack";
import type { Phrase, Syllable } from "@/lib/data/types";

const phrase: Phrase = {
  id: "p1",
  lessonId: "l1",
  order: 1,
  isRepeatableIndependently: true,
  startTimeSec: 0,
  endTimeSec: 1,
};

const syllable: Syllable = {
  id: "s1",
  wordId: "w1",
  order: 1,
  displayText: "Om",
  iast: "om",
  transliteration: "om",
  startTimeSec: 0,
  endTimeSec: 1,
  svaraCategory: "udatta",
  targetPitchLevel: 0,
  targetPitchContourCents: [0, 100, 200],
  isRepeatableIndependently: true,
};

describe("buildReferenceCentsTrack", () => {
  it("samples the syllable's contour across its duration", () => {
    const track = buildReferenceCentsTrack(phrase, [syllable], 0.5);
    // At t=0 -> start of contour (0 cents); at t=0.5 -> partway through (should have advanced).
    expect(track[0]).toBe(0);
    expect(track[1]).toBeGreaterThan(0);
  });

  it("returns null for time outside any syllable's window (silence/gaps)", () => {
    const gapSyllable: Syllable = { ...syllable, startTimeSec: 0.2, endTimeSec: 0.4 };
    const track = buildReferenceCentsTrack({ ...phrase, endTimeSec: 1 }, [gapSyllable], 0.5);
    // t=0 falls before the syllable starts -> null.
    expect(track[0]).toBeNull();
  });
});

describe("buildStudentCentsTrack", () => {
  it("converts a voiced frame at the tonic frequency to 0 cents", () => {
    const track = buildStudentCentsTrack([{ frequencyHz: 220, confidence: 0.9, rms: 0.1, timeSec: 0 }], 220);
    expect(track[0]).toBeCloseTo(0, 3);
  });

  it("converts a voiced frame an octave above the tonic to +1200 cents", () => {
    const track = buildStudentCentsTrack([{ frequencyHz: 440, confidence: 0.9, rms: 0.1, timeSec: 0 }], 220);
    expect(track[0]).toBeCloseTo(1200, 1);
  });

  it("treats a low-confidence frame as null regardless of frequency", () => {
    const track = buildStudentCentsTrack([{ frequencyHz: 220, confidence: 0.1, rms: 0.1, timeSec: 0 }], 220, 0.5);
    expect(track[0]).toBeNull();
  });

  it("treats an unvoiced frame (null frequency) as null", () => {
    const track = buildStudentCentsTrack([{ frequencyHz: null, confidence: 0.9, rms: 0, timeSec: 0 }], 220);
    expect(track[0]).toBeNull();
  });
});
