/**
 * Seed content for the MVP demonstration lesson, "Gaṇapati Prārthanā".
 *
 * IMPORTANT — per the product brief, this file must never contain invented
 * sacred text, svara markings, or a synthesized "teacher voice". Every
 * text/svara/timing field below is a clearly labelled PLACEHOLDER using a
 * short, well-known, public-domain invocation line purely as neutral sample
 * text so the pipeline (segmentation, svara colouring, timing, scoring) is
 * demonstrable end to end. Audio is a synthetic test tone, not a chant
 * recording (see scripts/generate-test-tones.mjs).
 *
 * TO REPLACE WITH REAL CONTENT: an authorised teacher should use the admin
 * chant editor (/admin/chants/[chantId]) to upload the three approved
 * recordings (B/D/F) and re-enter the teacher-approved IAST, Devanāgarī,
 * translation, syllable division, timing and svara markings — at which
 * point `isPlaceholderContent` flips to false automatically.
 */

import type { Chant, Lesson, Phrase, Word, Syllable, LessonAudio } from "@/lib/data/types";

export const GANAPATI_CHANT_ID = "seed-chant-ganapati-prarthana";
export const GANAPATI_LESSON_ID = "seed-lesson-ganapati-full-chant";
export const GANAPATI_MODULE_ID = "seed-module-invocations";
export const GANAPATI_COURSE_ID = "seed-course-first-steps";

export const seedChant: Chant = {
  id: GANAPATI_CHANT_ID,
  moduleId: GANAPATI_MODULE_ID,
  title: "Gaṇapati Prārthanā",
  subtitle: "Placeholder demonstration content — awaiting teacher-approved text and recordings",
  englishMeaning:
    "PLACEHOLDER TRANSLATION — replace with the teacher-approved English meaning of the Gaṇapati Prārthanā once supplied.",
  devanagari: "( देवनागरी पाठ अभी लंबित है — प्लेसहोल्डर )",
  iast: "( PLACEHOLDER IAST TEXT — teacher-approved wording pending )",
  isPlaceholderContent: true,
  order: 1,
  // Hidden from students for now (Kavir asked to show only the real Rudram
  // content) — left in place, unpublished, so it's ready to switch back on
  // once real teacher-approved text/recordings for this chant arrive.
  published: false,
};

export const seedLesson: Lesson = {
  id: GANAPATI_LESSON_ID,
  chantId: GANAPATI_CHANT_ID,
  kind: "full_chant",
  title: "Full Chanting (demo)",
  order: 1,
  published: true,
};

// A single demonstration phrase built from three neutral placeholder
// syllables (om / śrī / gam), long enough to exercise segmentation, svara
// colouring, timing and scoring — but explicitly NOT presented as sacred
// verse text.
const PHRASE_ID = "seed-phrase-1";
const WORD_1_ID = "seed-word-1";
const WORD_2_ID = "seed-word-2";

export const seedPhrases: Phrase[] = [
  {
    id: PHRASE_ID,
    lessonId: GANAPATI_LESSON_ID,
    order: 1,
    isRepeatableIndependently: true,
    startTimeSec: 0,
    endTimeSec: 4.5,
  },
];

export const seedWords: Word[] = [
  {
    id: WORD_1_ID,
    phraseId: PHRASE_ID,
    order: 1,
    displayText: "Oṃ",
    iast: "oṃ",
    devanagari: "ॐ",
    translation: "the primordial sound",
  },
  {
    id: WORD_2_ID,
    phraseId: PHRASE_ID,
    order: 2,
    displayText: "Gaṃ Gaṇapataye",
    iast: "gaṃ gaṇapataye",
    devanagari: "गं गणपतये",
    translation: "PLACEHOLDER — salutation to Gaṇapati (seed bīja + name)",
  },
];

// Target pitch contours are expressed in cents relative to the phrase tonic.
// These are simple illustrative shapes (a held tone for udātta, a dip for
// anudātta, a rise for svarita) — not derived from any real recording.
export const seedSyllables: Syllable[] = [
  {
    id: "seed-syl-1",
    wordId: WORD_1_ID,
    order: 1,
    displayText: "Oṃ",
    iast: "oṃ",
    devanagari: "ॐ",
    transliteration: "om",
    startTimeSec: 0.2,
    endTimeSec: 2.0,
    svaraCategory: "udatta",
    targetPitchLevel: 1,
    targetPitchContourCents: [0, 5, 0, -5, 0],
    teacherNote: "PLACEHOLDER — hold steady, medium pitch.",
    pronunciationNote: "Nasal resonance through to the end of the syllable.",
    translation: "the primordial sound",
    isRepeatableIndependently: true,
  },
  {
    id: "seed-syl-2",
    wordId: WORD_2_ID,
    order: 1,
    displayText: "Gaṃ",
    iast: "gaṃ",
    devanagari: "गं",
    transliteration: "gam",
    startTimeSec: 2.3,
    endTimeSec: 2.9,
    svaraCategory: "anudatta",
    targetPitchLevel: -1,
    targetPitchContourCents: [-80, -90, -100],
    teacherNote: "PLACEHOLDER — lower, brief bīja syllable.",
    pronunciationNote: "Short, closed nasal ending.",
    translation: "seed sound",
    isRepeatableIndependently: true,
  },
  {
    id: "seed-syl-3",
    wordId: WORD_2_ID,
    order: 2,
    displayText: "Ga-ṇa-pa-ta-ye",
    iast: "gaṇapataye",
    devanagari: "गणपतये",
    transliteration: "ganapataye",
    startTimeSec: 3.0,
    endTimeSec: 4.4,
    svaraCategory: "svarita",
    targetPitchLevel: 2,
    targetPitchContourCents: [0, 60, 120, 100, 80],
    teacherNote: "PLACEHOLDER — rising svarita across the word, settling at the end.",
    pronunciationNote: "Even syllable timing; light stress on -pa-.",
    translation: "PLACEHOLDER — 'to the Lord of hosts' (dative)",
    isRepeatableIndependently: true,
  },
];

/** B/D/F reference recordings — synthetic placeholder tones, see scripts/generate-test-tones.mjs. */
export const seedLessonAudio: LessonAudio[] = [
  {
    id: "seed-audio-b",
    lessonId: GANAPATI_LESSON_ID,
    scale: "B",
    audioUrl: "/audio/ganapati-prarthana/placeholder-scale-b.wav",
    durationSec: 4.5,
    isPlaceholder: true,
    uploadedAt: new Date(0).toISOString(),
  },
  {
    id: "seed-audio-d",
    lessonId: GANAPATI_LESSON_ID,
    scale: "D",
    audioUrl: "/audio/ganapati-prarthana/placeholder-scale-d.wav",
    durationSec: 4.5,
    isPlaceholder: true,
    uploadedAt: new Date(0).toISOString(),
  },
  {
    id: "seed-audio-f",
    lessonId: GANAPATI_LESSON_ID,
    scale: "F",
    audioUrl: "/audio/ganapati-prarthana/placeholder-scale-f.wav",
    durationSec: 4.5,
    isPlaceholder: true,
    uploadedAt: new Date(0).toISOString(),
  },
  {
    id: "seed-audio-gsharp",
    lessonId: GANAPATI_LESSON_ID,
    scale: "G#",
    audioUrl: "/audio/ganapati-prarthana/placeholder-scale-gsharp.wav",
    durationSec: 4.5,
    isPlaceholder: true,
    uploadedAt: new Date(0).toISOString(),
  },
];
