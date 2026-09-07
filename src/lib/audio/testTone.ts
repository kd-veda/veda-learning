/**
 * Synthetic tone generation.
 *
 * Two uses:
 *  1. Development/testing without a live microphone (unit tests feed known
 *     frequencies straight into detectPitchYin; this generator is for
 *     anything that needs an actual waveform, e.g. manual QA or Playwright's
 *     fake-audio-device flow).
 *  2. Placeholder "teacher recordings" for the Gaṇapati Prārthanā demo
 *     lesson (see scripts/generate-test-tones.mjs) until real, teacher
 *     approved B/D/F recordings are supplied — per the spec, these are
 *     clearly labelled as placeholders everywhere they appear in the UI and
 *     are never presented as the final teacher chant.
 */

/** Generates a mono sine wave at `frequencyHz` for `durationSec`, with a short fade in/out to avoid clicks. */
export function generateSineWave(
  frequencyHz: number,
  durationSec: number,
  sampleRate: number,
  options: { amplitude?: number; fadeSec?: number } = {}
): Float32Array {
  const amplitude = options.amplitude ?? 0.5;
  const fadeSec = options.fadeSec ?? 0.05;
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

/**
 * Generates a short melodic placeholder "chant" as a sequence of tones at
 * given frequencies/durations — used to stand in for a real recording so
 * the tracing-paper UI and scoring pipeline are fully demoable.
 */
export function generatePlaceholderChant(
  notes: Array<{ frequencyHz: number; durationSec: number }>,
  sampleRate: number
): Float32Array {
  const totalSamples = notes.reduce((sum, n) => sum + Math.floor(n.durationSec * sampleRate), 0);
  const buffer = new Float32Array(totalSamples);
  let offset = 0;
  for (const note of notes) {
    const tone = generateSineWave(note.frequencyHz, note.durationSec, sampleRate, { fadeSec: 0.02 });
    buffer.set(tone, offset);
    offset += tone.length;
  }
  return buffer;
}

/** Encodes mono Float32 PCM samples as a 16-bit PCM WAV file (returned as a Buffer/Uint8Array-friendly ArrayBuffer). */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
