/**
 * Frequency <-> MIDI note <-> pitch-class conversions.
 *
 * A4 = 440 Hz is the reference, per the spec. Pitch classes are always
 * reported using the product's required sharp-only spelling
 * (A, A#, B, C, C#, D, D#, E, F, F#, G, G#) — never flats — so enharmonic
 * equivalents (A#/Bb, D#/Eb, F#/Gb, G#/Ab) always display as the sharp name.
 */

export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

/** Sharp-only pitch-class names, index 0 = C (MIDI % 12 convention). */
export const PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type PitchClass = (typeof PITCH_CLASSES)[number];

export interface NoteInfo {
  /** Fractional MIDI note number, e.g. 69.13 */
  midi: number;
  /** Nearest whole MIDI note number, e.g. 69 */
  nearestMidi: number;
  /** Sharp-spelled pitch class of the nearest note, e.g. "A" */
  pitchClass: PitchClass;
  /** Octave number using scientific pitch notation (A4 = 69 -> octave 4) */
  octave: number;
  /** How far the input frequency is from the nearest note, in cents (-50..50) */
  cents: number;
  /** Frequency of the nearest exact note, in Hz */
  nearestFrequencyHz: number;
}

/** Converts a frequency in Hz to a fractional MIDI note number. */
export function frequencyToMidi(frequencyHz: number): number {
  if (!(frequencyHz > 0)) {
    throw new RangeError("frequencyToMidi: frequencyHz must be a positive number");
  }
  return A4_MIDI + 12 * Math.log2(frequencyHz / A4_FREQUENCY);
}

/** Converts a MIDI note number (can be fractional) back to a frequency in Hz. */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Full analysis of a detected frequency: nearest note, pitch class, octave
 * and how many cents sharp/flat the input was.
 */
export function analyseFrequency(frequencyHz: number): NoteInfo {
  const midi = frequencyToMidi(frequencyHz);
  const nearestMidi = Math.round(midi);
  const cents = Math.round((midi - nearestMidi) * 100);
  const pitchClassIndex = ((nearestMidi % 12) + 12) % 12;
  const pitchClass = PITCH_CLASSES[pitchClassIndex] as PitchClass;
  // Scientific pitch notation: MIDI 60 = C4, so octave = floor(midi/12) - 1.
  const octave = Math.floor(nearestMidi / 12) - 1;
  const nearestFrequencyHz = midiToFrequency(nearestMidi);
  return { midi, nearestMidi, pitchClass, octave, cents, nearestFrequencyHz };
}

/** Difference between two frequencies expressed in cents (positive = a is sharper than b). */
export function centsBetween(aHz: number, bHz: number): number {
  if (!(aHz > 0) || !(bHz > 0)) return 0;
  return 1200 * Math.log2(aHz / bHz);
}
