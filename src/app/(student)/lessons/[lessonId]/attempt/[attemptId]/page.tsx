"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { TracingPaper } from "@/components/lesson/TracingPaper";
import { PitchContourCanvas } from "@/components/audio/PitchContourCanvas";
import { ScoreCard } from "@/components/lesson/ScoreCard";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider, type LessonContent } from "@/lib/data/provider";
import { SCALE_ROOT_FREQUENCY_HZ } from "@/lib/audio/scaleMapping";
import { buildReferenceCentsTrack, buildStudentCentsTrack, flattenPhraseSyllables } from "@/lib/audio/referenceTrack";
import type { AttemptScore, PracticeAttempt } from "@/lib/data/types";
import type { FeedbackColour } from "@/lib/audio/scoring";

export default function AttemptResultPage({ params }: { params: { lessonId: string; attemptId: string } }) {
  const { profile } = useProfile();
  const [content, setContent] = useState<LessonContent | null>(null);
  const [entry, setEntry] = useState<{ attempt: PracticeAttempt; score: AttemptScore } | null>(null);

  useEffect(() => {
    getDataProvider().getLessonContent(params.lessonId).then(setContent);
  }, [params.lessonId]);

  useEffect(() => {
    if (!profile) return;
    getDataProvider()
      .listAttempts(profile.id, params.lessonId)
      .then((entries) => setEntry(entries.find((e) => e.attempt.id === params.attemptId) ?? null));
  }, [profile, params.lessonId, params.attemptId]);

  const matchedEntry = content?.phrases.find((p) => p.phrase.id === entry?.attempt.phraseId) ?? content?.phrases[0];
  const phrase = matchedEntry?.phrase;
  const words = useMemo(() => matchedEntry?.words ?? [], [matchedEntry]);
  const syllables = useMemo(() => flattenPhraseSyllables(words), [words]);
  const referenceCents = useMemo(() => (phrase ? buildReferenceCentsTrack(phrase, syllables) : []), [phrase, syllables]);

  const studentCents = useMemo(() => {
    if (!entry) return [];
    const tonic = SCALE_ROOT_FREQUENCY_HZ[entry.attempt.scale];
    return buildStudentCentsTrack(
      entry.attempt.studentPitchContour.map((p) => ({ frequencyHz: p.frequencyHz, confidence: p.confidence, rms: 0, timeSec: p.timeSec })),
      tonic
    );
  }, [entry]);

  const feedbackMap = useMemo(() => {
    if (!entry) return undefined;
    return new Map<string, FeedbackColour>(entry.score.syllableFeedback.map((f) => [f.syllableId, f.colour]));
  }, [entry]);

  if (!profile || !content || !entry) {
    return <p className="p-8 text-center text-maroon-400">Loading attempt…</p>;
  }

  return (
    <div className="min-h-dvh bg-ivory pb-16">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-maroon-700">{content.chant.title}</h1>
            <p className="text-sm text-maroon-500">
              Attempt from {new Date(entry.attempt.createdAt).toLocaleString()} · Scale {entry.attempt.scale} · {entry.attempt.mode.replace(/_/g, " ")}
            </p>
          </div>
          <Link href={`/lessons/${content.lesson.id}`}>
            <Button variant="ghost" size="sm">
              Back to lesson
            </Button>
          </Link>
        </div>

        <div className="mt-6">
          <TracingPaper
            words={words}
            displayMode={profile.preferredDisplayMode}
            textSizeScale={profile.textSizeScale}
            showMeaning={profile.showMeaning}
            currentTimeSec={null}
            feedback={feedbackMap}
          />
        </div>

        <div className="mt-6">
          <PitchContourCanvas referenceCents={referenceCents} studentCents={studentCents} />
        </div>

        <div className="mt-6">
          <ScoreCard
            score={{
              intonationAccuracy: entry.score.intonationAccuracy,
              timingAccuracy: entry.score.timingAccuracy,
              phraseCompletion: entry.score.phraseCompletion,
              pronunciationSimilarity: entry.score.pronunciationSimilarity,
              overall: entry.score.overall,
              alignmentConfidence: entry.score.alignmentConfidence,
            }}
            message={entry.score.encouragingMessage}
          />
        </div>
      </main>
    </div>
  );
}
