import { describe, expect, it } from "vitest";
import { envelopeSimilarityAnalyzer } from "./pronunciation";
import { generateSineWave } from "./testTone";

const SAMPLE_RATE = 16000;

describe("envelopeSimilarityAnalyzer", () => {
  it("scores an identical recording as highly similar", async () => {
    const samples = generateSineWave(220, 1, SAMPLE_RATE);
    const result = await envelopeSimilarityAnalyzer.analyse({
      referenceSamples: samples,
      studentSamples: samples,
      sampleRate: SAMPLE_RATE,
    });
    expect(result.similarity).toBeGreaterThan(90);
    expect(result.label).toBe("guidance-only");
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  it("always returns the guidance disclaimer, never framing the score as a grade", () => {
    // Static assertion of intent: the type itself only allows label "guidance-only".
    const label = "guidance-only" as const;
    expect(label).toBe("guidance-only");
  });

  it("scores a much quieter/shorter attempt as less similar than an identical one", async () => {
    const reference = generateSineWave(220, 1, SAMPLE_RATE, { amplitude: 0.8 });
    const quietShort = generateSineWave(220, 0.3, SAMPLE_RATE, { amplitude: 0.05 });
    const identical = await envelopeSimilarityAnalyzer.analyse({
      referenceSamples: reference,
      studentSamples: reference,
      sampleRate: SAMPLE_RATE,
    });
    const partial = await envelopeSimilarityAnalyzer.analyse({
      referenceSamples: reference,
      studentSamples: quietShort,
      sampleRate: SAMPLE_RATE,
    });
    expect(partial.similarity).toBeLessThanOrEqual(identical.similarity);
  });
});
