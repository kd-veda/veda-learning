// Generates the three placeholder "teacher recording" WAV files (scales
// B / D / F) for the seed Gaṇapati Prārthanā lesson, as synthetic sine-tone
// sequences shaped to the seed syllables' target pitch contours
// (src/content/ganapati-prarthana/index.ts). These are explicitly NOT a
// chant recording and are labelled as placeholders everywhere they surface
// in the UI — see docs/LIMITATIONS.md.
//
// Run with `npm run gen:tones`. Mirrors the algorithm in
// src/lib/audio/testTone.ts (kept as a standalone script since it needs to
// run under plain Node before any bundler is involved).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "audio", "ganapati-prarthana");
mkdirSync(outDir, { recursive: true });

const SAMPLE_RATE = 44100;

// Root frequency for each course scale (the tonic students calibrate against).
const SCALE_ROOT_HZ = {
  B: 246.94, // B3
  D: 293.66, // D4
  F: 349.23, // F4
};

// Mirrors src/content/ganapati-prarthana/index.ts seedSyllables' timing +
// targetPitchContourCents, simplified to one representative frequency per
// syllable (the contour arrays there are for the on-screen guide line; the
// audio only needs a plausible held/moving tone under each word).
const SYLLABLE_PLAN = [
  { startSec: 0.2, endSec: 2.0, centsFromRoot: 0 }, // Oṃ — udātta, steady
  { startSec: 2.3, endSec: 2.9, centsFromRoot: -100 }, // Gaṃ — anudātta, lower
  { startSec: 3.0, endSec: 4.4, centsFromRoot: 100 }, // Gaṇapataye — svarita, rising then settling
];
const TOTAL_DURATION_SEC = 4.5;

function centsToRatio(cents) {
  return Math.pow(2, cents / 1200);
}

function generateSineWave(frequencyHz, durationSec, sampleRate, amplitude = 0.5, fadeSec = 0.03) {
  const length = Math.floor(durationSec * sampleRate);
  const fadeLength = Math.floor(fadeSec * sampleRate);
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let envelope = 1;
    if (i < fadeLength) envelope = i / fadeLength;
    else if (i > length - fadeLength) envelope = (length - i) / fadeLength;
    buffer[i] = amplitude * envelope * Math.sin(2 * Math.PI * frequencyHz * t);
  }
  return buffer;
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), offset);
    offset += 2;
  }
  return buffer;
}

function buildTrackForScale(rootHz) {
  const totalSamples = Math.floor(TOTAL_DURATION_SEC * SAMPLE_RATE);
  const track = new Float32Array(totalSamples);

  for (const syllable of SYLLABLE_PLAN) {
    const frequencyHz = rootHz * centsToRatio(syllable.centsFromRoot);
    const durationSec = syllable.endSec - syllable.startSec;
    const tone = generateSineWave(frequencyHz, durationSec, SAMPLE_RATE);
    const startSample = Math.floor(syllable.startSec * SAMPLE_RATE);
    for (let i = 0; i < tone.length && startSample + i < track.length; i++) {
      track[startSample + i] += tone[i];
    }
  }
  return track;
}

for (const [scale, rootHz] of Object.entries(SCALE_ROOT_HZ)) {
  const track = buildTrackForScale(rootHz);
  const wav = encodeWav(track, SAMPLE_RATE);
  const filename = `placeholder-scale-${scale.toLowerCase()}.wav`;
  writeFileSync(path.join(outDir, filename), wav);
  console.log(`Wrote public/audio/ganapati-prarthana/${filename} (${track.length} samples, root ${rootHz}Hz)`);
}

console.log("\nThese are synthetic placeholder tones, not chant recordings. Replace via the admin chant editor.");
