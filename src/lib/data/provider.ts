/**
 * DataProvider — the single interface both the student and admin UI code
 * against. Two implementations exist (see docs/PLAN.md §2):
 *   - localProvider: IndexedDB-backed, zero config, powers guest mode and
 *     the fully-offline demo.
 *   - supabaseProvider: Postgres via Supabase, used automatically once
 *     NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 *
 * UI code should almost never import either implementation directly — call
 * getDataProvider() and program against this interface so switching backends
 * is a config change, not a code change.
 */

import type {
  AdminRole,
  Achievement,
  AttemptScore,
  Chant,
  Course,
  Enrolment,
  FavouriteLesson,
  Lesson,
  LessonAudio,
  Module,
  PitchContour,
  PracticeAttempt,
  PracticeStreak,
  Profile,
  ScaleCalibration,
  Syllable,
  UserAchievement,
  Word,
  Phrase,
} from "./types";
import type { AppConfig } from "@/lib/config/appConfig";
import { localProvider } from "./localProvider";
import { supabaseProvider } from "./supabaseProvider";

export interface LessonContent {
  lesson: Lesson;
  chant: Chant;
  phrases: Array<{
    phrase: Phrase;
    words: Array<{ word: Word; syllables: Syllable[] }>;
  }>;
  audio: LessonAudio[];
}

export interface DataProvider {
  readonly mode: "local" | "supabase";

  // Profile / auth -----------------------------------------------------------
  getOrCreateGuestProfile(): Promise<Profile>;
  getProfile(profileId: string): Promise<Profile | null>;
  updateProfile(profileId: string, patch: Partial<Profile>): Promise<Profile>;

  // Calibration ---------------------------------------------------------------
  saveCalibration(calibration: Omit<ScaleCalibration, "id" | "createdAt">): Promise<ScaleCalibration>;
  getLatestCalibration(profileId: string): Promise<ScaleCalibration | null>;

  // Courses / content (read) ---------------------------------------------------
  listPublishedCourses(): Promise<Course[]>;
  getCourse(courseId: string): Promise<Course | null>;
  listModules(courseId: string): Promise<Module[]>;
  listChants(moduleId: string): Promise<Chant[]>;
  listLessons(chantId: string): Promise<Lesson[]>;
  getLessonContent(lessonId: string): Promise<LessonContent | null>;

  // Enrolment / favourites ------------------------------------------------------
  enrol(profileId: string, courseId: string): Promise<Enrolment>;
  listEnrolments(profileId: string): Promise<Enrolment[]>;
  toggleFavourite(profileId: string, lessonId: string): Promise<boolean>;
  listFavourites(profileId: string): Promise<FavouriteLesson[]>;

  // Practice attempts -----------------------------------------------------------
  saveAttempt(
    attempt: Omit<PracticeAttempt, "id" | "createdAt">,
    score: Omit<AttemptScore, "id" | "attemptId">
  ): Promise<{ attempt: PracticeAttempt; score: AttemptScore }>;
  listAttempts(profileId: string, lessonId?: string): Promise<Array<{ attempt: PracticeAttempt; score: AttemptScore }>>;
  getStreak(profileId: string): Promise<PracticeStreak>;

  // Achievements -----------------------------------------------------------------
  listAchievements(): Promise<Achievement[]>;
  listEarnedAchievements(profileId: string): Promise<UserAchievement[]>;

  // Config ---------------------------------------------------------------------
  getAppConfig(): Promise<AppConfig>;
  updateAppConfig(patch: Partial<AppConfig>): Promise<AppConfig>;

  // Admin ------------------------------------------------------------------------
  isAdmin(profileId: string): Promise<AdminRole | null>;
  upsertCourse(course: Partial<Course> & { id?: string }): Promise<Course>;
  upsertModule(module: Partial<Module> & { id?: string }): Promise<Module>;
  upsertChant(chant: Partial<Chant> & { id?: string }): Promise<Chant>;
  upsertLesson(lesson: Partial<Lesson> & { id?: string }): Promise<Lesson>;
  upsertPhrase(phrase: Partial<Phrase> & { id?: string }): Promise<Phrase>;
  upsertWord(word: Partial<Word> & { id?: string }): Promise<Word>;
  upsertSyllable(syllable: Partial<Syllable> & { id?: string }): Promise<Syllable>;
  upsertLessonAudio(audio: Partial<LessonAudio> & { id?: string }): Promise<LessonAudio>;
  savePitchContour(contour: Omit<PitchContour, "id">): Promise<PitchContour>;
  listAdminCourses(): Promise<Course[]>; // includes unpublished
  setPublished(kind: "course" | "module" | "chant" | "lesson", id: string, published: boolean): Promise<void>;
}

let cachedProvider: DataProvider | null = null;

/**
 * Returns the active DataProvider, chosen once per session based on whether
 * Supabase public env vars are configured. See docs/PLAN.md §2.
 */
export function getDataProvider(): DataProvider {
  if (cachedProvider) return cachedProvider;

  const hasSupabaseConfig =
    typeof process !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Both provider modules are imported statically (below) rather than via a
  // conditional require()/import() — the Supabase client inside
  // supabaseProvider is only ever *instantiated* (see lib/supabase/client.ts)
  // when these env vars are set, so there's no cost to having the module
  // itself in the bundle.
  cachedProvider = hasSupabaseConfig ? supabaseProvider : localProvider;
  return cachedProvider;
}

/** Test-only helper: forces re-selection of provider on next getDataProvider() call. */
export function _resetDataProviderCacheForTests(): void {
  cachedProvider = null;
}
