/**
 * Supabase-backed DataProvider. Active automatically once
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set (see
 * lib/data/provider.ts). Table shapes match supabase/migrations/*.sql
 * exactly; this file's only job is mapping snake_case rows <-> the
 * camelCase domain types in lib/data/types.ts, so the rest of the app never
 * has to know which backend is active.
 *
 * NOTE: this has not been exercised against a live project in this
 * environment (none was available at build time — see docs/PLAN.md §5).
 * The query shapes follow the migrations directly; treat this as a strong
 * starting point to validate against your own project once created, not as
 * pre-verified production code.
 */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DataProvider, LessonContent } from "./provider";
import type {
  AdminRole,
  Achievement,
  AttemptScore,
  Chant,
  Course,
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
} from "./types";
import { DEFAULT_APP_CONFIG, type AppConfig } from "@/lib/config/appConfig";

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or use the local/guest provider."
    );
  }
  return supabase;
}

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) throw new Error("No authenticated Supabase user.");
  return user.id;
}

// --- row <-> domain mappers (snake_case DB columns -> camelCase types) -----

const mapProfile = (r: any): Profile => ({
  id: r.id,
  displayName: r.display_name,
  isGuest: r.is_guest,
  preferredDisplayMode: r.preferred_display_mode,
  textSizeScale: r.text_size_scale,
  showMeaning: r.show_meaning,
  darkMode: r.dark_mode,
  saveRecordingsConsent: r.save_recordings_consent,
  guardianConsentOnFile: r.guardian_consent_on_file,
  createdAt: r.created_at,
});

const mapCourse = (r: any): Course => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description,
  coverImageUrl: r.cover_image_url ?? undefined,
  published: r.published,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapModule = (r: any): Module => ({
  id: r.id,
  courseId: r.course_id,
  title: r.title,
  description: r.description,
  order: r.order_index,
  published: r.published,
});

const mapChant = (r: any): Chant => ({
  id: r.id,
  moduleId: r.module_id,
  title: r.title,
  subtitle: r.subtitle ?? undefined,
  englishMeaning: r.english_meaning,
  devanagari: r.devanagari ?? undefined,
  iast: r.iast,
  isPlaceholderContent: r.is_placeholder_content,
  order: r.order_index,
  published: r.published,
});

const mapLesson = (r: any): Lesson => ({
  id: r.id,
  chantId: r.chant_id,
  kind: r.kind,
  title: r.title,
  order: r.order_index,
  published: r.published,
});

const mapPhrase = (r: any) => ({
  id: r.id,
  lessonId: r.lesson_id,
  order: r.order_index,
  isRepeatableIndependently: r.is_repeatable_independently,
  startTimeSec: r.start_time_sec,
  endTimeSec: r.end_time_sec,
});

const mapWord = (r: any): Word => ({
  id: r.id,
  phraseId: r.phrase_id,
  order: r.order_index,
  displayText: r.display_text,
  iast: r.iast,
  devanagari: r.devanagari ?? undefined,
  translation: r.translation ?? undefined,
});

const mapSyllable = (r: any): Syllable => ({
  id: r.id,
  wordId: r.word_id,
  order: r.order_index,
  displayText: r.display_text,
  iast: r.iast,
  devanagari: r.devanagari ?? undefined,
  transliteration: r.transliteration,
  startTimeSec: r.start_time_sec,
  endTimeSec: r.end_time_sec,
  svaraCategory: r.svara_category,
  targetPitchLevel: r.target_pitch_level,
  targetPitchContourCents: r.target_pitch_contour_cents ?? [],
  teacherNote: r.teacher_note ?? undefined,
  pronunciationNote: r.pronunciation_note ?? undefined,
  translation: r.translation ?? undefined,
  isRepeatableIndependently: r.is_repeatable_independently,
});

const mapLessonAudio = (r: any): LessonAudio => ({
  id: r.id,
  lessonId: r.lesson_id,
  scale: r.scale,
  audioUrl: r.audio_url,
  durationSec: r.duration_sec,
  isPlaceholder: r.is_placeholder,
  uploadedAt: r.uploaded_at,
});

const mapCalibration = (r: any): ScaleCalibration => ({
  id: r.id,
  profileId: r.profile_id,
  detectedFrequencyHz: r.detected_frequency_hz,
  detectedPitchClass: r.detected_pitch_class,
  recommendedScale: r.recommended_scale,
  selectedScale: r.selected_scale,
  isManualOverride: r.is_manual_override,
  confidence: r.confidence,
  createdAt: r.created_at,
});

const mapAttempt = (r: any): PracticeAttempt => ({
  id: r.id,
  profileId: r.profile_id,
  lessonId: r.lesson_id,
  phraseId: r.phrase_id ?? undefined,
  mode: r.mode,
  playbackRate: r.playback_rate,
  scale: r.scale,
  recordingUrl: r.recording_url ?? undefined,
  studentPitchContour: r.student_pitch_contour ?? [],
  createdAt: r.created_at,
});

const mapScore = (r: any): AttemptScore => ({
  id: r.id,
  attemptId: r.attempt_id,
  intonationAccuracy: r.intonation_accuracy,
  timingAccuracy: r.timing_accuracy,
  phraseCompletion: r.phrase_completion,
  pronunciationSimilarity: r.pronunciation_similarity,
  overall: r.overall,
  alignmentConfidence: r.alignment_confidence,
  syllableFeedback: r.syllable_feedback ?? [],
  encouragingMessage: r.encouraging_message,
});

export const supabaseProvider: DataProvider = {
  mode: "supabase",

  async getOrCreateGuestProfile() {
    const supabase = client();
    const { data: sessionData } = await supabase.auth.getSession();
    let userId = sessionData.session?.user?.id;
    if (!userId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      userId = data.user?.id;
    }
    if (!userId) throw new Error("Could not establish a guest session.");

    const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (existing) return mapProfile(existing);

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ id: userId, display_name: "Guest", is_guest: true })
      .select("*")
      .single();
    if (error) throw error;
    return mapProfile(created);
  },

  async getProfile(profileId) {
    const { data } = await client().from("profiles").select("*").eq("id", profileId).maybeSingle();
    return data ? mapProfile(data) : null;
  },

  async updateProfile(profileId, patch) {
    const columnPatch: Record<string, unknown> = {};
    if (patch.displayName !== undefined) columnPatch.display_name = patch.displayName;
    if (patch.preferredDisplayMode !== undefined) columnPatch.preferred_display_mode = patch.preferredDisplayMode;
    if (patch.textSizeScale !== undefined) columnPatch.text_size_scale = patch.textSizeScale;
    if (patch.showMeaning !== undefined) columnPatch.show_meaning = patch.showMeaning;
    if (patch.darkMode !== undefined) columnPatch.dark_mode = patch.darkMode;
    if (patch.saveRecordingsConsent !== undefined) columnPatch.save_recordings_consent = patch.saveRecordingsConsent;
    if (patch.guardianConsentOnFile !== undefined) columnPatch.guardian_consent_on_file = patch.guardianConsentOnFile;

    const { data, error } = await client().from("profiles").update(columnPatch).eq("id", profileId).select("*").single();
    if (error) throw error;
    return mapProfile(data);
  },

  async saveCalibration(calibration) {
    const { data, error } = await client()
      .from("scale_calibrations")
      .insert({
        profile_id: calibration.profileId,
        detected_frequency_hz: calibration.detectedFrequencyHz,
        detected_pitch_class: calibration.detectedPitchClass,
        recommended_scale: calibration.recommendedScale,
        selected_scale: calibration.selectedScale,
        is_manual_override: calibration.isManualOverride,
        confidence: calibration.confidence,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCalibration(data);
  },

  async getLatestCalibration(profileId) {
    const { data } = await client()
      .from("scale_calibrations")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? mapCalibration(data) : null;
  },

  async listPublishedCourses() {
    const { data, error } = await client().from("courses").select("*").eq("published", true);
    if (error) throw error;
    return (data ?? []).map(mapCourse);
  },

  async getCourse(courseId) {
    const { data } = await client().from("courses").select("*").eq("id", courseId).maybeSingle();
    return data ? mapCourse(data) : null;
  },

  async listModules(courseId) {
    const { data, error } = await client().from("modules").select("*").eq("course_id", courseId).order("order_index");
    if (error) throw error;
    return (data ?? []).map(mapModule);
  },

  async listChants(moduleId) {
    const { data, error } = await client().from("chants").select("*").eq("module_id", moduleId).order("order_index");
    if (error) throw error;
    return (data ?? []).map(mapChant);
  },

  async listLessons(chantId) {
    const { data, error } = await client().from("lessons").select("*").eq("chant_id", chantId).order("order_index");
    if (error) throw error;
    return (data ?? []).map(mapLesson);
  },

  async getLessonContent(lessonId): Promise<LessonContent | null> {
    const supabase = client();
    const { data: lessonRow } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
    if (!lessonRow) return null;
    const lesson = mapLesson(lessonRow);

    const { data: chantRow } = await supabase.from("chants").select("*").eq("id", lesson.chantId).maybeSingle();
    if (!chantRow) return null;
    const chant = mapChant(chantRow);

    const { data: phraseRows } = await supabase
      .from("phrases")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index");
    const phraseIds = (phraseRows ?? []).map((p: any) => p.id);

    const { data: wordRows } = phraseIds.length
      ? await supabase.from("words").select("*").in("phrase_id", phraseIds).order("order_index")
      : { data: [] };
    const wordIds = (wordRows ?? []).map((w: any) => w.id);

    const { data: syllableRows } = wordIds.length
      ? await supabase.from("syllables").select("*").in("word_id", wordIds).order("order_index")
      : { data: [] };

    const { data: audioRows } = await supabase.from("lesson_audio").select("*").eq("lesson_id", lessonId);

    const phrases = (phraseRows ?? []).map((phraseRow: any) => {
      const phrase = mapPhrase(phraseRow);
      const words = (wordRows ?? [])
        .filter((w: any) => w.phrase_id === phrase.id)
        .map((wordRow: any) => {
          const word = mapWord(wordRow);
          const syllables = (syllableRows ?? []).filter((s: any) => s.word_id === word.id).map(mapSyllable);
          return { word, syllables };
        });
      return { phrase, words };
    });

    return { lesson, chant, phrases, audio: (audioRows ?? []).map(mapLessonAudio) };
  },

  async enrol(profileId, courseId) {
    const { data, error } = await client()
      .from("enrolments")
      .upsert({ profile_id: profileId, course_id: courseId }, { onConflict: "profile_id,course_id" })
      .select("*")
      .single();
    if (error) throw error;
    return { id: data.id, profileId: data.profile_id, courseId: data.course_id, enrolledAt: data.enrolled_at };
  },

  async listEnrolments(profileId) {
    const { data, error } = await client().from("enrolments").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, profileId: r.profile_id, courseId: r.course_id, enrolledAt: r.enrolled_at }));
  },

  async toggleFavourite(profileId, lessonId) {
    const supabase = client();
    const { data: existing } = await supabase
      .from("favourite_lessons")
      .select("id")
      .eq("profile_id", profileId)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (existing) {
      await supabase.from("favourite_lessons").delete().eq("id", existing.id);
      return false;
    }
    await supabase.from("favourite_lessons").insert({ profile_id: profileId, lesson_id: lessonId });
    return true;
  },

  async listFavourites(profileId) {
    const { data, error } = await client().from("favourite_lessons").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, profileId: r.profile_id, lessonId: r.lesson_id, createdAt: r.created_at }));
  },

  async saveAttempt(attemptInput, scoreInput) {
    const supabase = client();
    const { data: attemptRow, error: attemptError } = await supabase
      .from("practice_attempts")
      .insert({
        profile_id: attemptInput.profileId,
        lesson_id: attemptInput.lessonId,
        phrase_id: attemptInput.phraseId ?? null,
        mode: attemptInput.mode,
        playback_rate: attemptInput.playbackRate,
        scale: attemptInput.scale,
        recording_url: attemptInput.recordingUrl ?? null,
        student_pitch_contour: attemptInput.studentPitchContour,
      })
      .select("*")
      .single();
    if (attemptError) throw attemptError;
    const attempt = mapAttempt(attemptRow);

    const { data: scoreRow, error: scoreError } = await supabase
      .from("attempt_scores")
      .insert({
        attempt_id: attempt.id,
        intonation_accuracy: scoreInput.intonationAccuracy,
        timing_accuracy: scoreInput.timingAccuracy,
        phrase_completion: scoreInput.phraseCompletion,
        pronunciation_similarity: scoreInput.pronunciationSimilarity,
        overall: scoreInput.overall,
        alignment_confidence: scoreInput.alignmentConfidence,
        syllable_feedback: scoreInput.syllableFeedback,
        encouraging_message: scoreInput.encouragingMessage,
      })
      .select("*")
      .single();
    if (scoreError) throw scoreError;

    return { attempt, score: mapScore(scoreRow) };
  },

  async listAttempts(profileId, lessonId) {
    const supabase = client();
    let query = supabase.from("practice_attempts").select("*, attempt_scores(*)").eq("profile_id", profileId);
    if (lessonId) query = query.eq("lesson_id", lessonId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((r: any) => r.attempt_scores)
      .map((r: any) => ({ attempt: mapAttempt(r), score: mapScore(Array.isArray(r.attempt_scores) ? r.attempt_scores[0] : r.attempt_scores) }));
  },

  async getStreak(profileId): Promise<PracticeStreak> {
    const { data } = await client()
      .from("practice_attempts")
      .select("created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });
    const dates = Array.from(new Set((data ?? []).map((r: any) => (r.created_at as string).slice(0, 10)))).sort();
    if (dates.length === 0) return { profileId, currentStreakDays: 0, longestStreakDays: 0, lastPracticeDate: null };
    let longest = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const dayDiff = Math.round((new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86_400_000);
      current = dayDiff === 1 ? current + 1 : 1;
      longest = Math.max(longest, current);
    }
    const lastDate = dates[dates.length - 1];
    const daysSinceLast = Math.round((Date.now() - new Date(lastDate).getTime()) / 86_400_000);
    return { profileId, currentStreakDays: daysSinceLast <= 1 ? current : 0, longestStreakDays: longest, lastPracticeDate: lastDate };
  },

  async listAchievements() {
    const { data, error } = await client().from("achievements").select("*");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, key: r.key, title: r.title, description: r.description, icon: r.icon })) as Achievement[];
  },

  async listEarnedAchievements(profileId) {
    const { data, error } = await client().from("user_achievements").select("*").eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, profileId: r.profile_id, achievementId: r.achievement_id, earnedAt: r.earned_at })) as UserAchievement[];
  },

  async getAppConfig() {
    const { data } = await client().from("app_config").select("*").eq("id", "singleton").maybeSingle();
    if (!data) return DEFAULT_APP_CONFIG;
    return { scaleMapping: data.scale_mapping, pitchTolerance: data.pitch_tolerance, minConfidence: data.min_confidence } as AppConfig;
  },

  async updateAppConfig(patch) {
    const current = await this.getAppConfig();
    const merged = { ...current, ...patch };
    const { error } = await client()
      .from("app_config")
      .upsert({
        id: "singleton",
        scale_mapping: merged.scaleMapping,
        pitch_tolerance: merged.pitchTolerance,
        min_confidence: merged.minConfidence,
      });
    if (error) throw error;
    return merged;
  },

  async isAdmin(profileId) {
    const { data } = await client().from("admin_roles").select("*").eq("profile_id", profileId).maybeSingle();
    return data ? ({ id: data.id, profileId: data.profile_id, role: data.role, grantedAt: data.granted_at } as AdminRole) : null;
  },

  async upsertCourse(input) {
    const { data, error } = await client()
      .from("courses")
      .upsert({
        id: input.id,
        slug: input.slug,
        title: input.title,
        description: input.description,
        cover_image_url: input.coverImageUrl,
        published: input.published ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCourse(data);
  },

  async upsertModule(input) {
    const { data, error } = await client()
      .from("modules")
      .upsert({ id: input.id, course_id: input.courseId, title: input.title, description: input.description, order_index: input.order, published: input.published ?? false })
      .select("*")
      .single();
    if (error) throw error;
    return mapModule(data);
  },

  async upsertChant(input) {
    const { data, error } = await client()
      .from("chants")
      .upsert({
        id: input.id,
        module_id: input.moduleId,
        title: input.title,
        subtitle: input.subtitle,
        english_meaning: input.englishMeaning,
        devanagari: input.devanagari,
        iast: input.iast,
        is_placeholder_content: input.isPlaceholderContent ?? true,
        order_index: input.order,
        published: input.published ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapChant(data);
  },

  async upsertLesson(input) {
    const { data, error } = await client()
      .from("lessons")
      .upsert({ id: input.id, chant_id: input.chantId, kind: input.kind, title: input.title, order_index: input.order, published: input.published ?? false })
      .select("*")
      .single();
    if (error) throw error;
    return mapLesson(data);
  },

  async upsertPhrase(input) {
    const { data, error } = await client()
      .from("phrases")
      .upsert({
        id: input.id,
        lesson_id: input.lessonId,
        order_index: input.order,
        is_repeatable_independently: input.isRepeatableIndependently ?? true,
        start_time_sec: input.startTimeSec,
        end_time_sec: input.endTimeSec,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapPhrase(data);
  },

  async upsertWord(input) {
    const { data, error } = await client()
      .from("words")
      .upsert({ id: input.id, phrase_id: input.phraseId, order_index: input.order, display_text: input.displayText, iast: input.iast, devanagari: input.devanagari, translation: input.translation })
      .select("*")
      .single();
    if (error) throw error;
    return mapWord(data);
  },

  async upsertSyllable(input) {
    const { data, error } = await client()
      .from("syllables")
      .upsert({
        id: input.id,
        word_id: input.wordId,
        order_index: input.order,
        display_text: input.displayText,
        iast: input.iast,
        devanagari: input.devanagari,
        transliteration: input.transliteration,
        start_time_sec: input.startTimeSec,
        end_time_sec: input.endTimeSec,
        svara_category: input.svaraCategory,
        target_pitch_level: input.targetPitchLevel,
        target_pitch_contour_cents: input.targetPitchContourCents,
        teacher_note: input.teacherNote,
        pronunciation_note: input.pronunciationNote,
        translation: input.translation,
        is_repeatable_independently: input.isRepeatableIndependently ?? true,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapSyllable(data);
  },

  async upsertLessonAudio(input) {
    const { data, error } = await client()
      .from("lesson_audio")
      .upsert({ id: input.id, lesson_id: input.lessonId, scale: input.scale, audio_url: input.audioUrl, duration_sec: input.durationSec, is_placeholder: input.isPlaceholder ?? true })
      .select("*")
      .single();
    if (error) throw error;
    return mapLessonAudio(data);
  },

  async savePitchContour(input) {
    const { data, error } = await client()
      .from("pitch_contours")
      .insert({ lesson_audio_id: input.lessonAudioId, points: input.points, is_manually_corrected: input.isManuallyCorrected })
      .select("*")
      .single();
    if (error) throw error;
    return { id: data.id, lessonAudioId: data.lesson_audio_id, points: data.points, isManuallyCorrected: data.is_manually_corrected } as PitchContour;
  },

  async listAdminCourses() {
    const { data, error } = await client().from("courses").select("*");
    if (error) throw error;
    return (data ?? []).map(mapCourse);
  },

  async setPublished(kind, id, published) {
    const table = { course: "courses", module: "modules", chant: "chants", lesson: "lessons" }[kind];
    const { error } = await client().from(table).update({ published }).eq("id", id);
    if (error) throw error;
  },
};

void currentUserId; // reserved for future auth-gated writes (e.g. student self-service profile edits)
