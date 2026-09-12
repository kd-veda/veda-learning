"use client";

/**
 * IndexedDB-backed DataProvider. Powers guest mode and the fully-offline
 * demo (see docs/PLAN.md §2). All state lives in one JSON-serialisable
 * object persisted via idb-keyval under a single key, loaded once per page
 * load and kept in memory thereafter. This is intentionally simple rather
 * than a fully general local database — the MVP only ever runs one demo
 * course, so a hand-rolled single-blob store is easier to reason about than
 * introducing a local SQL engine.
 */

import { get as idbGet, set as idbSet } from "idb-keyval";
import type { DataProvider, LessonContent } from "./provider";
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
  Profile,
  ScaleCalibration,
  Syllable,
  UserAchievement,
  Word,
  Phrase,
} from "./types";
import { DEFAULT_APP_CONFIG, type AppConfig } from "@/lib/config/appConfig";
import {
  GANAPATI_COURSE_ID,
  GANAPATI_MODULE_ID,
  seedChant,
  seedLesson,
  seedLessonAudio,
  seedPhrases,
  seedSyllables,
  seedWords,
} from "@/content/ganapati-prarthana";
import {
  rudramOpeningChant,
  rudramOpeningLesson,
  rudramOpeningLessonAudio,
  rudramOpeningPhrases,
  rudramOpeningSyllables,
  rudramOpeningWords,
} from "@/content/rudram-opening";

const STORAGE_KEY = "veda-learning:local-db:v1";
const GUEST_PROFILE_ID = "local-guest";

interface LocalDb {
  profiles: Profile[];
  courses: Course[];
  modules: Module[];
  chants: Chant[];
  lessons: Lesson[];
  phrases: Phrase[];
  words: Word[];
  syllables: Syllable[];
  lessonAudio: LessonAudio[];
  pitchContours: PitchContour[];
  calibrations: ScaleCalibration[];
  enrolments: Enrolment[];
  favourites: FavouriteLesson[];
  attempts: PracticeAttempt[];
  scores: AttemptScore[];
  achievements: Achievement[];
  earnedAchievements: UserAchievement[];
  adminRoles: AdminRole[];
  appConfig: AppConfig;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "ach-first-attempt", key: "first_attempt", title: "First Steps", description: "Completed your first practice attempt.", icon: "🌱" },
  { id: "ach-three-day-streak", key: "streak_3", title: "Three Days Together", description: "Practised three days in a row.", icon: "🔥" },
  { id: "ach-green-phrase", key: "green_phrase", title: "Steady Voice", description: "Scored 'green' intonation on a full phrase.", icon: "🟢" },
];

function buildSeedDb(): LocalDb {
  const now = new Date().toISOString();
  return {
    profiles: [],
    courses: [
      {
        id: GANAPATI_COURSE_ID,
        slug: "first-steps",
        title: "First Steps in Chanting",
        description: "A gentle introduction course, beginning with the demonstration lesson Gaṇapati Prārthanā.",
        published: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    modules: [
      {
        id: GANAPATI_MODULE_ID,
        courseId: GANAPATI_COURSE_ID,
        title: "Invocations",
        description: "Opening invocations chanted before study begins.",
        order: 1,
        published: true,
      },
    ],
    chants: [seedChant, rudramOpeningChant],
    lessons: [seedLesson, rudramOpeningLesson],
    phrases: [...seedPhrases, ...rudramOpeningPhrases],
    words: [...seedWords, ...rudramOpeningWords],
    syllables: [...seedSyllables, ...rudramOpeningSyllables],
    lessonAudio: [...seedLessonAudio, ...rudramOpeningLessonAudio],
    pitchContours: [],
    calibrations: [],
    enrolments: [],
    favourites: [],
    attempts: [],
    scores: [],
    achievements: DEFAULT_ACHIEVEMENTS,
    earnedAchievements: [],
    adminRoles: [{ id: "seed-admin-role", profileId: GUEST_PROFILE_ID, role: "administrator", grantedAt: now }],
    appConfig: DEFAULT_APP_CONFIG,
  };
}

let dbPromise: Promise<LocalDb> | null = null;

async function loadDb(): Promise<LocalDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const stored = await idbGet<LocalDb>(STORAGE_KEY);
      if (stored) return stored;
      const seeded = buildSeedDb();
      await idbSet(STORAGE_KEY, seeded);
      return seeded;
    })();
  }
  return dbPromise;
}

async function persist(db: LocalDb): Promise<void> {
  await idbSet(STORAGE_KEY, db);
}

function generateId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export const localProvider: DataProvider = {
  mode: "local",

  async getOrCreateGuestProfile() {
    const db = await loadDb();
    let profile = db.profiles.find((p) => p.id === GUEST_PROFILE_ID);
    if (!profile) {
      profile = {
        id: GUEST_PROFILE_ID,
        displayName: "Guest",
        isGuest: true,
        preferredDisplayMode: "iast",
        textSizeScale: 1,
        showMeaning: true,
        darkMode: false,
        saveRecordingsConsent: false,
        guardianConsentOnFile: false,
        createdAt: new Date().toISOString(),
      };
      db.profiles.push(profile);
      await persist(db);
    }
    return profile;
  },

  async getProfile(profileId) {
    const db = await loadDb();
    return db.profiles.find((p) => p.id === profileId) ?? null;
  },

  async updateProfile(profileId, patch) {
    const db = await loadDb();
    const index = db.profiles.findIndex((p) => p.id === profileId);
    if (index === -1) throw new Error(`Profile ${profileId} not found`);
    db.profiles[index] = { ...db.profiles[index], ...patch };
    await persist(db);
    return db.profiles[index];
  },

  async saveCalibration(calibration) {
    const db = await loadDb();
    const record: ScaleCalibration = { ...calibration, id: generateId("cal"), createdAt: new Date().toISOString() };
    db.calibrations.push(record);
    await persist(db);
    return record;
  },

  async getLatestCalibration(profileId) {
    const db = await loadDb();
    const mine = db.calibrations.filter((c) => c.profileId === profileId);
    if (mine.length === 0) return null;
    return mine.reduce((latest, c) => (c.createdAt > latest.createdAt ? c : latest));
  },

  async listPublishedCourses() {
    const db = await loadDb();
    return db.courses.filter((c) => c.published);
  },

  async getCourse(courseId) {
    const db = await loadDb();
    return db.courses.find((c) => c.id === courseId) ?? null;
  },

  async listModules(courseId) {
    const db = await loadDb();
    return db.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.order - b.order);
  },

  async listChants(moduleId) {
    const db = await loadDb();
    return db.chants.filter((c) => c.moduleId === moduleId).sort((a, b) => a.order - b.order);
  },

  async listLessons(chantId) {
    const db = await loadDb();
    return db.lessons.filter((l) => l.chantId === chantId).sort((a, b) => a.order - b.order);
  },

  async getLessonContent(lessonId): Promise<LessonContent | null> {
    const db = await loadDb();
    const lesson = db.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    const chant = db.chants.find((c) => c.id === lesson.chantId);
    if (!chant) return null;

    const phrases = db.phrases
      .filter((p) => p.lessonId === lessonId)
      .sort((a, b) => a.order - b.order)
      .map((phrase) => {
        const words = db.words
          .filter((w) => w.phraseId === phrase.id)
          .sort((a, b) => a.order - b.order)
          .map((word) => ({
            word,
            syllables: db.syllables.filter((s) => s.wordId === word.id).sort((a, b) => a.order - b.order),
          }));
        return { phrase, words };
      });

    const audio = db.lessonAudio.filter((a) => a.lessonId === lessonId);

    return { lesson, chant, phrases, audio };
  },

  async enrol(profileId, courseId) {
    const db = await loadDb();
    let enrolment = db.enrolments.find((e) => e.profileId === profileId && e.courseId === courseId);
    if (!enrolment) {
      enrolment = { id: generateId("enrol"), profileId, courseId, enrolledAt: new Date().toISOString() };
      db.enrolments.push(enrolment);
      await persist(db);
    }
    return enrolment;
  },

  async listEnrolments(profileId) {
    const db = await loadDb();
    return db.enrolments.filter((e) => e.profileId === profileId);
  },

  async toggleFavourite(profileId, lessonId) {
    const db = await loadDb();
    const index = db.favourites.findIndex((f) => f.profileId === profileId && f.lessonId === lessonId);
    if (index >= 0) {
      db.favourites.splice(index, 1);
      await persist(db);
      return false;
    }
    db.favourites.push({ id: generateId("fav"), profileId, lessonId, createdAt: new Date().toISOString() });
    await persist(db);
    return true;
  },

  async listFavourites(profileId) {
    const db = await loadDb();
    return db.favourites.filter((f) => f.profileId === profileId);
  },

  async saveAttempt(attemptInput, scoreInput) {
    const db = await loadDb();
    const attempt: PracticeAttempt = { ...attemptInput, id: generateId("attempt"), createdAt: new Date().toISOString() };
    const score: AttemptScore = { ...scoreInput, id: generateId("score"), attemptId: attempt.id };
    db.attempts.push(attempt);
    db.scores.push(score);

    if (db.attempts.filter((a) => a.profileId === attempt.profileId).length === 1) {
      maybeGrantAchievement(db, attempt.profileId, "ach-first-attempt");
    }
    if (score.intonationAccuracy >= 90) {
      maybeGrantAchievement(db, attempt.profileId, "ach-green-phrase");
    }

    await persist(db);
    return { attempt, score };
  },

  async listAttempts(profileId, lessonId) {
    const db = await loadDb();
    return db.attempts
      .filter((a) => a.profileId === profileId && (!lessonId || a.lessonId === lessonId))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((attempt) => ({ attempt, score: db.scores.find((s) => s.attemptId === attempt.id)! }))
      .filter((entry) => !!entry.score);
  },

  async getStreak(profileId) {
    const db = await loadDb();
    const dates = Array.from(
      new Set(db.attempts.filter((a) => a.profileId === profileId).map((a) => a.createdAt.slice(0, 10)))
    ).sort();
    if (dates.length === 0) {
      return { profileId, currentStreakDays: 0, longestStreakDays: 0, lastPracticeDate: null };
    }
    let longest = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const dayDiff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      current = dayDiff === 1 ? current + 1 : 1;
      longest = Math.max(longest, current);
    }
    const lastDate = dates[dates.length - 1];
    const daysSinceLast = Math.round((Date.now() - new Date(lastDate).getTime()) / 86_400_000);
    return {
      profileId,
      currentStreakDays: daysSinceLast <= 1 ? current : 0,
      longestStreakDays: longest,
      lastPracticeDate: lastDate,
    };
  },

  async listAchievements() {
    const db = await loadDb();
    return db.achievements;
  },

  async listEarnedAchievements(profileId) {
    const db = await loadDb();
    return db.earnedAchievements.filter((e) => e.profileId === profileId);
  },

  async getAppConfig() {
    const db = await loadDb();
    return db.appConfig;
  },

  async updateAppConfig(patch) {
    const db = await loadDb();
    db.appConfig = { ...db.appConfig, ...patch };
    await persist(db);
    return db.appConfig;
  },

  async isAdmin(profileId) {
    const db = await loadDb();
    return db.adminRoles.find((r) => r.profileId === profileId) ?? null;
  },

  async upsertCourse(input) {
    const db = await loadDb();
    return upsert(db.courses, input, (id) => ({
      id,
      slug: input.slug ?? id,
      title: input.title ?? "Untitled course",
      description: input.description ?? "",
      published: input.published ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })).then(async (result) => {
      await persist(db);
      return result;
    });
  },

  async upsertModule(input) {
    const db = await loadDb();
    const result = await upsert(db.modules, input, (id) => ({
      id,
      courseId: input.courseId ?? "",
      title: input.title ?? "Untitled module",
      description: input.description ?? "",
      order: input.order ?? db.modules.length + 1,
      published: input.published ?? false,
    }));
    await persist(db);
    return result;
  },

  async upsertChant(input) {
    const db = await loadDb();
    const result = await upsert(db.chants, input, (id) => ({
      id,
      moduleId: input.moduleId ?? "",
      title: input.title ?? "Untitled chant",
      englishMeaning: input.englishMeaning ?? "",
      isPlaceholderContent: input.isPlaceholderContent ?? true,
      iast: input.iast ?? "",
      order: input.order ?? db.chants.length + 1,
      published: input.published ?? false,
    }));
    await persist(db);
    return result;
  },

  async upsertLesson(input) {
    const db = await loadDb();
    const result = await upsert(db.lessons, input, (id) => ({
      id,
      chantId: input.chantId ?? "",
      kind: input.kind ?? "line_by_line",
      title: input.title ?? "Untitled lesson",
      order: input.order ?? db.lessons.length + 1,
      published: input.published ?? false,
    }));
    await persist(db);
    return result;
  },

  async upsertPhrase(input) {
    const db = await loadDb();
    const result = await upsert(db.phrases, input, (id) => ({
      id,
      lessonId: input.lessonId ?? "",
      order: input.order ?? db.phrases.length + 1,
      isRepeatableIndependently: input.isRepeatableIndependently ?? true,
      startTimeSec: input.startTimeSec ?? 0,
      endTimeSec: input.endTimeSec ?? 0,
    }));
    await persist(db);
    return result;
  },

  async upsertWord(input) {
    const db = await loadDb();
    const result = await upsert(db.words, input, (id) => ({
      id,
      phraseId: input.phraseId ?? "",
      order: input.order ?? db.words.length + 1,
      displayText: input.displayText ?? "",
      iast: input.iast ?? "",
    }));
    await persist(db);
    return result;
  },

  async upsertSyllable(input) {
    const db = await loadDb();
    const result = await upsert(db.syllables, input, (id) => ({
      id,
      wordId: input.wordId ?? "",
      order: input.order ?? db.syllables.length + 1,
      displayText: input.displayText ?? "",
      iast: input.iast ?? "",
      transliteration: input.transliteration ?? "",
      startTimeSec: input.startTimeSec ?? 0,
      endTimeSec: input.endTimeSec ?? 0,
      svaraCategory: input.svaraCategory ?? "udatta",
      targetPitchLevel: input.targetPitchLevel ?? 0,
      targetPitchContourCents: input.targetPitchContourCents ?? [0],
      isRepeatableIndependently: input.isRepeatableIndependently ?? true,
    }));
    await persist(db);
    return result;
  },

  async upsertLessonAudio(input) {
    const db = await loadDb();
    const result = await upsert(db.lessonAudio, input, (id) => ({
      id,
      lessonId: input.lessonId ?? "",
      scale: input.scale ?? "B",
      audioUrl: input.audioUrl ?? "",
      durationSec: input.durationSec ?? 0,
      isPlaceholder: input.isPlaceholder ?? true,
      uploadedAt: new Date().toISOString(),
    }));
    await persist(db);
    return result;
  },

  async savePitchContour(input) {
    const db = await loadDb();
    const record: PitchContour = { ...input, id: generateId("contour") };
    db.pitchContours.push(record);
    await persist(db);
    return record;
  },

  async listAdminCourses() {
    const db = await loadDb();
    return db.courses;
  },

  async setPublished(kind, id, published) {
    const db = await loadDb();
    const collection = { course: db.courses, module: db.modules, chant: db.chants, lesson: db.lessons }[kind];
    const item = (collection as Array<{ id: string; published: boolean }>).find((x) => x.id === id);
    if (item) item.published = published;
    await persist(db);
  },
};

function maybeGrantAchievement(db: LocalDb, profileId: string, achievementId: string) {
  const already = db.earnedAchievements.some((e) => e.profileId === profileId && e.achievementId === achievementId);
  if (!already) {
    db.earnedAchievements.push({ id: generateId("earned"), profileId, achievementId, earnedAt: new Date().toISOString() });
  }
}

async function upsert<T extends { id: string }>(
  collection: T[],
  input: Partial<T> & { id?: string },
  buildDefaults: (id: string) => T
): Promise<T> {
  const id = input.id ?? generateId("item");
  const index = collection.findIndex((item) => item.id === id);
  if (index >= 0) {
    const updated = { ...collection[index], ...input, id } as T;
    collection[index] = updated;
    return updated;
  }
  const created = { ...buildDefaults(id), ...input, id } as T;
  collection.push(created);
  return created;
}
