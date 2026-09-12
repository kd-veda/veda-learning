/**
 * "Oṃ Namo Bhagavate Rudrāya" — opening line, first real (non-placeholder)
 * chant content on the platform.
 *
 * Text and the four scale recordings (B/D/F/G#) were supplied directly by
 * Kavir from a teacher's real recordings — this is NOT invented content.
 *
 * Timing and pitch-contour data below were auto-extracted from those real
 * recordings (ffmpeg silence detection for word/syllable boundaries, this
 * project's own YIN pitch detector — src/lib/audio/pitchDetector.ts — for
 * the target pitch contour), not hand-authored like the Gaṇapati
 * placeholder's synthetic shapes. Both the timing and the pitch contour
 * below are derived from the single "G#" take, chosen as the shared
 * on-screen timeline because its pacing on "namo bhagavate rudrāya"
 * matches the "B" and "D" takes closely, while "F" chants that portion
 * distinctly faster than the other three — using "F" (an earlier version
 * of this file did) meant the highlight finished well before the words
 * were actually sung in three of the four recordings. Deriving everything
 * from one take also keeps the timing and pitch data mutually consistent.
 * Sync now works well for G#/B/D; "F" specifically will show the
 * highlight trailing slightly behind its faster pace — worth a listen,
 * and re-recording "F" to match the other three's pace would fix it.
 *
 * One thing still needs a human check before this is fully
 * teacher-approved: svaraCategory below reflects a best-effort reading of
 * the accent marks in the reference image (a vertical mark above "te" =
 * svarita, an underline under "ya" = anudātta); everything else is left
 * as udātta (unmarked). The small boxed mark around the "d" in "rudrāya"
 * was NOT treated as an accent (read as a cursor/selection artifact in
 * the screenshot) — flag if that's wrong.
 */

import type { Chant, Lesson, Phrase, Word, Syllable, LessonAudio } from "@/lib/data/types";

export const RUDRAM_OPENING_CHANT_ID = "rudram-opening-chant";
export const RUDRAM_OPENING_LESSON_ID = "rudram-opening-lesson";
const PHRASE_ID = "rudram-opening-phrase-1";

const WORD_OM_ID = "rudram-word-om";
const WORD_NAMO_ID = "rudram-word-namo";
const WORD_BHAGAVATE_ID = "rudram-word-bhagavate";
const WORD_RUDRAYA_ID = "rudram-word-rudraya";

export const rudramOpeningChant: Chant = {
  id: RUDRAM_OPENING_CHANT_ID,
  // Lives in the same "Invocations" module as the Gaṇapati demo — see localProvider.ts.
  moduleId: "seed-module-invocations",
  title: "Oṃ Namo Bhagavate Rudrāya",
  subtitle: "Opening line — real teacher recording; svara markings pending your confirmation",
  englishMeaning: "Om, salutations to the Blessed Lord Rudra. (Standard translation of this well-known invocation — tell me if you'd like different wording.)",
  devanagari: "ॐ नमो भगवते रुद्राय",
  iast: "oṃ namo bhagavate rudrāya",
  isPlaceholderContent: false,
  order: 2,
  published: true,
};

export const rudramOpeningLesson: Lesson = {
  id: RUDRAM_OPENING_LESSON_ID,
  chantId: RUDRAM_OPENING_CHANT_ID,
  kind: "line_by_line",
  title: "Opening Line (demo)",
  order: 1,
  published: true,
};

export const rudramOpeningPhrases: Phrase[] = [
  {
    id: PHRASE_ID,
    lessonId: RUDRAM_OPENING_LESSON_ID,
    order: 1,
    isRepeatableIndependently: true,
    startTimeSec: 0,
    endTimeSec: 5.275,
  },
];

export const rudramOpeningWords: Word[] = [
  { id: WORD_OM_ID, phraseId: PHRASE_ID, order: 1, displayText: "Oṃ", iast: "oṃ", devanagari: "ॐ", translation: "the sacred sound" },
  { id: WORD_NAMO_ID, phraseId: PHRASE_ID, order: 2, displayText: "Namo", iast: "namo", devanagari: "नमो", translation: "salutations" },
  { id: WORD_BHAGAVATE_ID, phraseId: PHRASE_ID, order: 3, displayText: "Bhagavate", iast: "bhagavate", devanagari: "भगवते", translation: "to the Blessed One" },
  { id: WORD_RUDRAYA_ID, phraseId: PHRASE_ID, order: 4, displayText: "Rudrāya", iast: "rudrāya", devanagari: "रुद्राय", translation: "to Rudra" },
];

export const rudramOpeningSyllables: Syllable[] = [
  {
    id: "rudram-syl-om",
    wordId: WORD_OM_ID,
    order: 1,
    displayText: "Oṃ",
    iast: "oṃ",
    devanagari: "ॐ",
    transliteration: "om",
    startTimeSec: 1.0,
    endTimeSec: 3.034,
    svaraCategory: "udatta",
    targetPitchLevel: 0,
    targetPitchContourCents: [0, 16, -20, 35, -15],
    teacherNote: "Real recording — hold steady, as chanted.",
    translation: "the sacred sound",
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-na",
    wordId: WORD_NAMO_ID,
    order: 1,
    displayText: "na",
    iast: "na",
    transliteration: "na",
    startTimeSec: 3.127,
    endTimeSec: 3.365,
    svaraCategory: "udatta",
    targetPitchLevel: -2,
    targetPitchContourCents: [-200, -250, -250, -250],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-mo",
    wordId: WORD_NAMO_ID,
    order: 2,
    displayText: "mo",
    iast: "mo",
    transliteration: "mo",
    startTimeSec: 3.365,
    endTimeSec: 3.604,
    svaraCategory: "udatta",
    targetPitchLevel: -2,
    targetPitchContourCents: [-250, -215, -195, -192],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-bha",
    wordId: WORD_BHAGAVATE_ID,
    order: 1,
    displayText: "bha",
    iast: "bha",
    transliteration: "bha",
    startTimeSec: 3.604,
    endTimeSec: 3.843,
    svaraCategory: "udatta",
    targetPitchLevel: -2,
    targetPitchContourCents: [-192, -191, -188, -185],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-ga",
    wordId: WORD_BHAGAVATE_ID,
    order: 2,
    displayText: "ga",
    iast: "ga",
    transliteration: "ga",
    startTimeSec: 3.843,
    endTimeSec: 4.082,
    svaraCategory: "udatta",
    targetPitchLevel: -1,
    targetPitchContourCents: [-185, -137, 25, 25],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-va",
    wordId: WORD_BHAGAVATE_ID,
    order: 3,
    displayText: "va",
    iast: "va",
    transliteration: "va",
    startTimeSec: 4.082,
    endTimeSec: 4.32,
    svaraCategory: "udatta",
    targetPitchLevel: 0,
    targetPitchContourCents: [20, 4, 2, 4],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-te",
    wordId: WORD_BHAGAVATE_ID,
    order: 4,
    displayText: "te",
    iast: "te",
    transliteration: "te",
    startTimeSec: 4.32,
    endTimeSec: 4.559,
    svaraCategory: "svarita",
    targetPitchLevel: 0,
    targetPitchContourCents: [6, 6, -2, -2],
    teacherNote: "Read as a rising accent (svarita) from the reference image — please confirm.",
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-ru",
    wordId: WORD_RUDRAYA_ID,
    order: 1,
    displayText: "ru",
    iast: "ru",
    transliteration: "ru",
    startTimeSec: 4.559,
    endTimeSec: 4.798,
    svaraCategory: "udatta",
    targetPitchLevel: 0,
    targetPitchContourCents: [-1, 5, 5, 3],
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-dra",
    wordId: WORD_RUDRAYA_ID,
    order: 2,
    displayText: "drā",
    iast: "drā",
    transliteration: "dra",
    startTimeSec: 4.798,
    endTimeSec: 5.036,
    svaraCategory: "udatta",
    targetPitchLevel: 0,
    targetPitchContourCents: [2, -1, 9, 14],
    teacherNote: "The reference image had a small boxed mark around this letter — treated as a screenshot artifact, not an accent. Flag if that's wrong.",
    isRepeatableIndependently: true,
  },
  {
    id: "rudram-syl-ya",
    wordId: WORD_RUDRAYA_ID,
    order: 3,
    displayText: "ya",
    iast: "ya",
    transliteration: "ya",
    startTimeSec: 5.036,
    endTimeSec: 5.275,
    svaraCategory: "anudatta",
    targetPitchLevel: 0,
    targetPitchContourCents: [17, 20, 27, 27],
    teacherNote: "Read as a lowered accent (anudātta) from the underline in the reference image — please confirm.",
    isRepeatableIndependently: true,
  },
];

/** Real teacher recordings, one per course scale — see file header for how timing/contour were derived. */
export const rudramOpeningLessonAudio: LessonAudio[] = [
  {
    id: "rudram-audio-b",
    lessonId: RUDRAM_OPENING_LESSON_ID,
    scale: "B",
    audioUrl: "/audio/rudram-opening/teacher-scale-b.m4a",
    durationSec: 6.592,
    isPlaceholder: false,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "rudram-audio-d",
    lessonId: RUDRAM_OPENING_LESSON_ID,
    scale: "D",
    audioUrl: "/audio/rudram-opening/teacher-scale-d.m4a",
    durationSec: 6.485,
    isPlaceholder: false,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "rudram-audio-f",
    lessonId: RUDRAM_OPENING_LESSON_ID,
    scale: "F",
    audioUrl: "/audio/rudram-opening/teacher-scale-f.m4a",
    durationSec: 5.717,
    isPlaceholder: false,
    uploadedAt: new Date().toISOString(),
  },
  {
    id: "rudram-audio-gsharp",
    lessonId: RUDRAM_OPENING_LESSON_ID,
    scale: "G#",
    audioUrl: "/audio/rudram-opening/teacher-scale-gsharp.m4a",
    durationSec: 5.717,
    isPlaceholder: false,
    uploadedAt: new Date().toISOString(),
  },
];
