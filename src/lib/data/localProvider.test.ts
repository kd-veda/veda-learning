import { beforeEach, describe, expect, it } from "vitest";
import { localProvider } from "./localProvider";
import { GANAPATI_LESSON_ID } from "@/content/ganapati-prarthana";

// Each test gets a fresh IndexedDB (fake-indexeddb resets per test file run,
// and localProvider caches its "loaded" promise per module instance — since
// Vitest re-evaluates the module per test file, this is safe across files
// but not across tests *within* this file, so we reuse one guest profile).

describe("localProvider — guest mode + demo lesson flow", () => {
  let profileId: string;

  beforeEach(async () => {
    const profile = await localProvider.getOrCreateGuestProfile();
    profileId = profile.id;
  });

  it("creates a guest profile that is idempotent across calls", async () => {
    const again = await localProvider.getOrCreateGuestProfile();
    expect(again.id).toBe(profileId);
    expect(again.isGuest).toBe(true);
  });

  it("lists the seeded demo course and its published lesson content", async () => {
    const courses = await localProvider.listPublishedCourses();
    expect(courses.length).toBeGreaterThan(0);

    const content = await localProvider.getLessonContent(GANAPATI_LESSON_ID);
    expect(content).not.toBeNull();
    expect(content!.chant.title).toContain("Gaṇapati");
    expect(content!.chant.isPlaceholderContent).toBe(true);
    expect(content!.phrases.length).toBeGreaterThan(0);
    expect(content!.audio.map((a) => a.scale).sort()).toEqual(["B", "D", "F", "G#"]);
  });

  it("saves and retrieves a calibration for the guest profile", async () => {
    const saved = await localProvider.saveCalibration({
      profileId,
      detectedFrequencyHz: 220,
      detectedPitchClass: "A",
      recommendedScale: "B",
      selectedScale: "B",
      isManualOverride: false,
      confidence: 0.8,
    });
    expect(saved.id).toBeTruthy();

    const latest = await localProvider.getLatestCalibration(profileId);
    expect(latest?.id).toBe(saved.id);
    expect(latest?.recommendedScale).toBe("B");
  });

  it("records a practice attempt + score and surfaces it in history", async () => {
    const { attempt, score } = await localProvider.saveAttempt(
      {
        profileId,
        lessonId: GANAPATI_LESSON_ID,
        mode: "chant_along",
        playbackRate: 1,
        scale: "B",
        studentPitchContour: [],
      },
      {
        intonationAccuracy: 80,
        timingAccuracy: 75,
        phraseCompletion: 100,
        pronunciationSimilarity: null,
        overall: 80,
        alignmentConfidence: 0.9,
        syllableFeedback: [],
        encouragingMessage: "Wonderful consistency today.",
      }
    );
    expect(attempt.id).toBeTruthy();
    expect(score.attemptId).toBe(attempt.id);

    const history = await localProvider.listAttempts(profileId);
    expect(history.some((h) => h.attempt.id === attempt.id)).toBe(true);
  });

  it("grants the 'first attempt' achievement after the first saved attempt", async () => {
    await localProvider.saveAttempt(
      { profileId, lessonId: GANAPATI_LESSON_ID, mode: "listen_and_repeat", playbackRate: 1, scale: "D", studentPitchContour: [] },
      {
        intonationAccuracy: 50,
        timingAccuracy: 50,
        phraseCompletion: 50,
        pronunciationSimilarity: null,
        overall: 50,
        alignmentConfidence: 0.5,
        syllableFeedback: [],
        encouragingMessage: "A good beginning.",
      }
    );
    const earned = await localProvider.listEarnedAchievements(profileId);
    expect(earned.some((e) => e.achievementId === "ach-first-attempt")).toBe(true);
  });

  it("toggles a favourite lesson on and off", async () => {
    const first = await localProvider.toggleFavourite(profileId, GANAPATI_LESSON_ID);
    expect(first).toBe(true);
    const second = await localProvider.toggleFavourite(profileId, GANAPATI_LESSON_ID);
    expect(second).toBe(false);
  });

  it("recognises the seeded guest admin role (so the admin demo is reachable without extra setup)", async () => {
    const role = await localProvider.isAdmin(profileId);
    expect(role?.role).toBe("administrator");
  });
});
