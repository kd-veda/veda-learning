import { describe, expect, it } from "vitest";
import { detectPitchYin } from "./pitchDetector";
import { generateSineWave } from "./testTone";

const SAMPLE_RATE = 44100;

const SYNTHETIC_FREQUENCIES = [
  { label: "A4", hz: 440 },
  { label: "A#4/Bb4", hz: 440 * Math.pow(2, 1 / 12) },
  { label: "B4", hz: 440 * Math.pow(2, 2 / 12) },
  { label: "C5", hz: 440 * Math.pow(2, 3 / 12) },
  { label: "C#5", hz: 440 * Math.pow(2, 4 / 12) },
  { label: "D5", hz: 440 * Math.pow(2, 5 / 12) },
  { label: "D#5/Eb5", hz: 440 * Math.pow(2, 6 / 12) },
  { label: "E5", hz: 440 * Math.pow(2, 7 / 12) },
  { label: "F5", hz: 440 * Math.pow(2, 8 / 12) },
  { label: "F#5/Gb5", hz: 440 * Math.pow(2, 9 / 12) },
  { label: "G5", hz: 440 * Math.pow(2, 10 / 12) },
  { label: "G#5/Ab5", hz: 440 * Math.pow(2, 11 / 12) },
];

describe("detectPitchYin — synthetic sine waves", () => {
  for (const { label, hz } of SYNTHETIC_FREQUENCIES) {
    it(`detects ${label} (${hz.toFixed(2)}Hz) within 1%`, () => {
      const buffer = generateSineWave(hz, 0.2, SAMPLE_RATE);
      // Use a steady-state slice (skip the fade-in) for a clean detection window.
      const steadyState = buffer.subarray(2048, 2048 + 2048);
      const result = detectPitchYin(steadyState, { sampleRate: SAMPLE_RATE });
      expect(result.frequencyHz).not.toBeNull();
      expect(result.frequencyHz!).toBeGreaterThan(hz * 0.99);
      expect(result.frequencyHz!).toBeLessThan(hz * 1.01);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  }

  it("reports null frequency and zero confidence for silence", () => {
    const silence = new Float32Array(2048);
    const result = detectPitchYin(silence, { sampleRate: SAMPLE_RATE });
    expect(result.frequencyHz).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("reports null frequency for low-level noise below the silence threshold", () => {
    const buffer = new Float32Array(2048);
    for (let i = 0; i < buffer.length; i++) buffer[i] = (Math.random() - 0.5) * 0.001;
    const result = detectPitchYin(buffer, { sampleRate: SAMPLE_RATE });
    expect(result.frequencyHz).toBeNull();
  });

  it("ignores frequencies outside the configured min/max range", () => {
    const tooLow = generateSineWave(30, 0.2, SAMPLE_RATE);
    const result = detectPitchYin(tooLow.subarray(2048, 4096), { sampleRate: SAMPLE_RATE, minFrequencyHz: 60, maxFrequencyHz: 1000 });
    expect(result.frequencyHz).toBeNull();
  });
});
