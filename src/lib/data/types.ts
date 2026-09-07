/**
 * Shared domain types for the whole app (student + admin UI, both data
 * providers). Mirrors the Postgres schema in supabase/migrations/ 1:1 where
 * a Supabase project is connected, and is what localProvider.ts stores
 * directly in IndexedDB otherwise — see docs/PLAN.md §2 "dual data layer".
 */

import type { CourseScale } from "@/lib/audio/scaleMapping";
import type { PitchClass } from "@/lib/audio/noteMapping";
import type { FeedbackColour } from "@/lib/audio/scoring";

export type Id = string;

export type SvaraCategory = "udatta" | "anudatta" | "svarita" | "dirgha_svarita";

export type DisplayTextMode = "iast" | "devanagari" | "simplified";

// ---------------------------------------------------------------------------
// Course hierarchy: Course -> Module -> Chant -> Lesson -> Phrase -> Word -> Syllable
// ---------------------------------------------------------------------------

export interface Course {
  id: Id;
  slug: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: Id;
  courseId: Id;
  title: string;
  description: string;
  order: number;
  published: boolean;
}

export type ChantKind = "introduction" | "pronunciation" | "svara_practice" | "line_by_line" | "full_chant" | "assessment";

export interface Chant {
  id: Id;
  moduleId: Id;
  title: string;
  /** e.g. "Gaṇapati Prārthanā" */
  subtitle?: string;
  englishMeaning: string;
  devanagari?: string;
  iast: string;
  /** True until a real teacher-approved recording + text replace the seed placeholder. */
  isPlaceholderContent: boolean;
  order: number;
  published: boolean;
}

export interface Lesson {
  id: Id;
  chantId: Id;
  kind: ChantKind;
  title: string;
  order: number;
  published: boolean;
}

export interface Phrase {
  id: Id;
  lessonId: Id;
  order: number;
  /** Whether the student can drill just this phrase in isolation. */
  isRepeatableIndependently: boolean;
  /** Start/end within the lesson's reference audio, in seconds. */
  startTimeSec: number;
  endTimeSec: number;
}

export interface Word {
  id: Id;
  phraseId: Id;
  order: number;
  displayText: string;
  iast: string;
  devanagari?: string;
  translation?: string;
}

export interface Syllable {
  id: Id;
  wordId: Id;
  order: number;
  displayText: string;
  iast: string;
  devanagari?: string;
  transliteration: string;
  startTimeSec: number;
  endTimeSec: number;
  svaraCategory: SvaraCategory;
  /** Target pitch level relative to the phrase tonic, in semitones (Vedic svara is relative, not absolute). */
  targetPitchLevel: number;
  /** Target pitch contour across the syllable's duration, in cents relative to the phrase tonic, one point per ~20ms. */
  targetPitchContourCents: number[];
  teacherNote?: string;
  pronunciationNote?: string;
  translation?: string;
  isRepeatableIndependently: boolean;
}

// ---------------------------------------------------------------------------
// Audio + derived contours
// ---------------------------------------------------------------------------

export interface LessonAudio {
  id: Id;
  lessonId: Id;
  scale: CourseScale;
  audioUrl: string;
  durationSec: number;
  /** True for the synthetic placeholder tones shipped with the MVP seed data. */
  isPlaceholder: boolean;
  uploadedAt: string;
}

export interface PitchContourPoint {
  timeSec: number;
  frequencyHz: number | null;
  confidence: number;
}

export interface PitchContour {
  id: Id;
  lessonAudioId: Id;
  /** Auto-extracted via YIN when the admin uploads audio; can be manually corrected (see admin align editor). */
  points: PitchContourPoint[];
  isManuallyCorrected: boolean;
}

// ---------------------------------------------------------------------------
// Users, enrolment, calibration
// ---------------------------------------------------------------------------

export interface Profile {
  id: Id;
  displayName: string;
  isGuest: boolean;
  preferredDisplayMode: DisplayTextMode;
  textSizeScale: number; // 1 = default
  showMeaning: boolean;
  darkMode: boolean;
  /** Consent flags — see docs/LIMITATIONS.md "Privacy & child safety". */
  saveRecordingsConsent: boolean;
  guardianConsentOnFile: boolean;
  createdAt: string;
}

export interface ScaleCalibration {
  id: Id;
  profileId: Id;
  detectedFrequencyHz: number;
  detectedPitchClass: PitchClass;
  recommendedScale: CourseScale;
  selectedScale: CourseScale; // may differ if the student manually overrides
  isManualOverride: boolean;
  confidence: number;
  createdAt: string;
}

export interface Enrolment {
  id: Id;
  profileId: Id;
  courseId: Id;
  enrolledAt: string;
}

// ---------------------------------------------------------------------------
// Practice attempts + scoring
// ---------------------------------------------------------------------------

export type LessonMode = "listen" | "listen_and_repeat" | "chant_along" | "independent_practice" | "slow_practice";

export interface PracticeAttempt {
  id: Id;
  profileId: Id;
  lessonId: Id;
  phraseId?: Id;
  mode: LessonMode;
  playbackRate: number; // 1 = normal speed, or 0.6/0.75/0.9 for slow practice
  scale: CourseScale;
  /** Only set if the student explicitly consented to save this recording. */
  recordingUrl?: string;
  studentPitchContour: PitchContourPoint[];
  createdAt: string;
}

export interface AttemptScore {
  id: Id;
  attemptId: Id;
  intonationAccuracy: number;
  timingAccuracy: number;
  phraseCompletion: number;
  pronunciationSimilarity: number | null;
  overall: number;
  alignmentConfidence: number;
  /** Per-syllable colour feedback, for re-rendering the tracing-paper view of a past attempt. */
  syllableFeedback: Array<{ syllableId: Id; colour: FeedbackColour }>;
  encouragingMessage: string;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface Achievement {
  id: Id;
  key: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserAchievement {
  id: Id;
  profileId: Id;
  achievementId: Id;
  earnedAt: string;
}

export interface PracticeStreak {
  profileId: Id;
  currentStreakDays: number;
  longestStreakDays: number;
  lastPracticeDate: string | null;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminRoleLevel = "teacher" | "administrator";

export interface AdminRole {
  id: Id;
  profileId: Id;
  role: AdminRoleLevel;
  grantedAt: string;
}

export interface FavouriteLesson {
  id: Id;
  profileId: Id;
  lessonId: Id;
  createdAt: string;
}
