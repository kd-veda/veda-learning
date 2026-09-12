"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TracingPaper } from "@/components/lesson/TracingPaper";
import { PitchContourCanvas } from "@/components/audio/PitchContourCanvas";
import { ScoreCard } from "@/components/lesson/ScoreCard";
import { useProfile } from "@/hooks/useProfile";
import { usePitchStream } from "@/hooks/usePitchStream";
import { getDataProvider, type LessonContent } from "@/lib/data/provider";
import type { CourseScale } from "@/lib/audio/scaleMapping";
import { COURSE_SCALES, SCALE_ROOT_FREQUENCY_HZ } from "@/lib/audio/scaleMapping";
import { smoothPitchTrack } from "@/lib/audio/smoothing";
import {
  buildReferenceCentsTrack,
  buildStudentCentsTrack,
  flattenPhraseSyllables,
  DEFAULT_FRAME_INTERVAL_SEC,
} from "@/lib/audio/referenceTrack";
import { scoreAttempt, encouragingMessageFor, computeSyllableFeedback, type ScoreBreakdown, type FeedbackColour } from "@/lib/audio/scoring";
import type { LessonMode, ScaleCalibration } from "@/lib/data/types";

const MODES: Array<{ id: LessonMode; label: string; description: string }> = [
  { id: "listen", label: "Listen", description: "Hear the full recording while the words highlight." },
  { id: "listen_and_repeat", label: "Listen & Repeat", description: "Hear the phrase, then repeat it yourself." },
  { id: "chant_along", label: "Chant Along", description: "Chant together with the recording. Headphones recommended." },
  { id: "independent_practice", label: "Independent Practice", description: "Chant from memory — the guide stays visible." },
  { id: "slow_practice", label: "Slow Practice", description: "Chant along at a gentler pace." },
];

const SLOW_RATES = [0.6, 0.75, 0.9] as const;

// How long the "Get ready… 3, 2, 1" pause lasts before a guided attempt starts
// actually listening/recording — without this, practice modes used to jump
// straight from clicking "Start" into playback/recording with zero warning,
// which is why it felt "impossible to tell when to start chanting".
const GET_READY_SECONDS = 3;

export default function LessonPlayerPage({ params }: { params: { lessonId: string } }) {
  const router = useRouter();
  const { profile } = useProfile();
  const pitchStream = usePitchStream();

  const [content, setContent] = useState<LessonContent | null>(null);
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [scale, setScale] = useState<CourseScale>("B");
  const [mode, setMode] = useState<LessonMode>("listen");
  const [slowRate, setSlowRate] = useState<(typeof SLOW_RATES)[number]>(0.75);
  // The demo lesson has a single phrase; phraseIndex is kept as a variable (rather than
  // hard-coded) so a future multi-phrase lesson only needs UI to change it, not new plumbing.
  const phraseIndex = 0;
  const [currentTimeSec, setCurrentTimeSec] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "get_ready" | "listening" | "capturing" | "scoring" | "done">("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [getReadyCountdown, setGetReadyCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: ScoreBreakdown; message: string; feedback: Map<string, FeedbackColour> } | null>(null);
  const [liveStudentCents, setLiveStudentCents] = useState<Array<number | null>>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const getReadyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getDataProvider()
      .getLessonContent(params.lessonId)
      .then(setContent);
  }, [params.lessonId]);

  useEffect(() => {
    if (!profile) return;
    getDataProvider()
      .getLatestCalibration(profile.id)
      .then((c) => {
        setCalibration(c);
        if (c) setScale(c.selectedScale);
      });
  }, [profile]);

  const phraseEntry = content?.phrases[phraseIndex];
  const phrase = phraseEntry?.phrase;
  const words = useMemo(() => phraseEntry?.words ?? [], [phraseEntry]);
  const syllables = useMemo(() => flattenPhraseSyllables(words), [words]);
  const audioForScale = content?.audio.find((a) => a.scale === scale);
  const phraseDurationSec = phrase ? phrase.endTimeSec - phrase.startTimeSec : 0;
  const tonicHz = SCALE_ROOT_FREQUENCY_HZ[scale];

  const referenceCents = useMemo(() => (phrase ? buildReferenceCentsTrack(phrase, syllables) : []), [phrase, syllables]);

  // The actual live playhead time, in seconds from lesson start — currentTimeSec is
  // kept up to date by the <audio> element's onTimeUpdate while listening/capturing,
  // and by the countdown timer for mic-only capture (independent practice / the
  // repeat window of listen & repeat). Falls back to the <audio> element directly for
  // the first tick before onTimeUpdate has fired.
  const livePlayheadAbsSec =
    status === "listening" || status === "capturing" ? currentTimeSec ?? audioRef.current?.currentTime ?? null : null;
  // Same value, but relative to the start of the phrase — what TracingPaper and
  // PitchContourCanvas both expect, since their data (syllable times, reference
  // contour frames) is indexed from phrase start, not from zero.
  const playheadRelativeSec =
    livePlayheadAbsSec !== null && phrase ? livePlayheadAbsSec - phrase.startTimeSec : null;

  function resetAttempt() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current);
    timerRef.current = null;
    getReadyTimerRef.current = null;
    setResult(null);
    setLiveStudentCents([]);
    setStatus("idle");
    setCurrentTimeSec(null);
    setGetReadyCountdown(null);
  }

  /** Runs a short visible "Get ready… 3, 2, 1" pause, then calls onDone. */
  function runGetReady(onDone: () => void) {
    setStatus("get_ready");
    let remaining = GET_READY_SECONDS;
    setGetReadyCountdown(remaining);
    getReadyTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current);
        getReadyTimerRef.current = null;
        setGetReadyCountdown(null);
        onDone();
      } else {
        setGetReadyCountdown(remaining);
      }
    }, 1000);
  }

  async function playListenOnly() {
    resetAttempt();
    const audio = audioRef.current;
    if (!audio || !phrase) return;
    setStatus("listening");
    audio.currentTime = phrase.startTimeSec;
    audio.playbackRate = 1;
    await audio.play();
  }

  async function runGuidedAttempt() {
    resetAttempt();
    if (!phrase) return;

    if (mode === "chant_along" || mode === "slow_practice") {
      await pitchStream.start();
      pitchStream.clearFrames();
      const audio = audioRef.current;
      if (!audio) return;
      runGetReady(async () => {
        setStatus("capturing");
        audio.currentTime = phrase.startTimeSec;
        audio.playbackRate = mode === "slow_practice" ? slowRate : 1;
        audio.preservesPitch = true;
        await audio.play();
      });
      return; // scoring happens on the audio "ended" handler below
    }

    if (mode === "listen_and_repeat") {
      const audio = audioRef.current;
      if (!audio) return;
      setStatus("listening");
      audio.currentTime = phrase.startTimeSec;
      audio.playbackRate = 1;
      await audio.play();
      return; // once playback ends, we start the repeat-capture window (see handleAudioEnded)
    }

    if (mode === "independent_practice") {
      await pitchStream.start();
      pitchStream.clearFrames();
      runGetReady(() => {
        setStatus("capturing");
        startCountdownCapture(phraseDurationSec);
      });
    }
  }

  function startCountdownCapture(durationSec: number) {
    let elapsed = 0;
    setCountdown(Math.ceil(durationSec));
    timerRef.current = setInterval(() => {
      elapsed += 0.2;
      setCurrentTimeSec((phrase?.startTimeSec ?? 0) + elapsed);
      setCountdown(Math.max(0, Math.ceil(durationSec - elapsed)));
      if (elapsed >= durationSec) {
        if (timerRef.current) clearInterval(timerRef.current);
        finishCapture();
      }
    }, 200);
  }

  async function handleAudioEnded() {
    if (mode === "listen") {
      setStatus("done");
      return;
    }
    if (mode === "listen_and_repeat" && status === "listening") {
      await pitchStream.start();
      pitchStream.clearFrames();
      runGetReady(() => {
        setStatus("capturing");
        setCurrentTimeSec(phrase?.startTimeSec ?? 0);
        startCountdownCapture(phraseDurationSec);
      });
      return;
    }
    if (mode === "chant_along" || mode === "slow_practice") {
      finishCapture();
    }
  }

  function finishCapture() {
    pitchStream.stop();
    setStatus("scoring");
    setCountdown(null);

    const rawFrames = pitchStream.getFrames();
    if (rawFrames.length === 0 || !phrase) {
      setStatus("idle");
      return;
    }
    const firstTime = rawFrames[0].timeSec;
    const normalised = rawFrames.map((f) => ({ ...f, timeSec: phrase.startTimeSec + (f.timeSec - firstTime) }));
    const smoothed = smoothPitchTrack(normalised);
    const studentCents = buildStudentCentsTrack(smoothed, tonicHz);

    const score = scoreAttempt(referenceCents, studentCents, referenceCents.length);
    const message = encouragingMessageFor(score);
    const feedback = computeSyllableFeedback(syllables, phraseDurationSec, smoothed, tonicHz);

    setResult({ score, message, feedback });
    setLiveStudentCents(studentCents);
    setStatus("done");

    if (profile && content) {
      getDataProvider().saveAttempt(
        {
          profileId: profile.id,
          lessonId: content.lesson.id,
          phraseId: phrase.id,
          mode,
          playbackRate: mode === "slow_practice" ? slowRate : 1,
          scale,
          studentPitchContour: smoothed.map((f) => ({ timeSec: f.timeSec, frequencyHz: f.frequencyHz, confidence: f.confidence })),
        },
        {
          intonationAccuracy: score.intonationAccuracy,
          timingAccuracy: score.timingAccuracy,
          phraseCompletion: score.phraseCompletion,
          pronunciationSimilarity: score.pronunciationSimilarity,
          overall: score.overall,
          alignmentConfidence: score.alignmentConfidence,
          syllableFeedback: Array.from(feedback.entries()).map(([syllableId, colour]) => ({ syllableId, colour })),
          encouragingMessage: message,
        }
      );
    }
  }

  useEffect(() => {
    return () => {
      pitchStream.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (getReadyTimerRef.current) clearInterval(getReadyTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!profile || !content) return;
    getDataProvider()
      .listFavourites(profile.id)
      .then((favs) => setIsFavourite(favs.some((f) => f.lessonId === content.lesson.id)));
  }, [profile, content]);

  async function toggleFavourite() {
    if (!profile || !content) return;
    const nowFavourite = await getDataProvider().toggleFavourite(profile.id, content.lesson.id);
    setIsFavourite(nowFavourite);
  }

  if (!content || !profile) {
    return <p className="p-8 text-center text-maroon-400">Loading lesson…</p>;
  }

  return (
    <div className="min-h-dvh bg-ivory pb-16">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-maroon-700">{content.chant.title}</h1>
            <p className="text-sm text-maroon-500">{content.lesson.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleFavourite}>
            {isFavourite ? "★ Favourited" : "☆ Favourite"}
          </Button>
        </div>

        {content.chant.isPlaceholderContent && (
          <p className="mt-3 rounded-xl bg-feedback-amber/10 p-3 text-sm text-feedback-amber">
            This lesson uses placeholder text and synthetic test-tone audio while teacher-approved recordings
            are prepared — not the final teacher chant.
          </p>
        )}

        <CardDescription className="mt-2">{content.chant.englishMeaning}</CardDescription>

        {/* Scale + mode controls */}
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-maroon-400">Scale</p>
              <div className="mt-1 flex gap-2">
                {COURSE_SCALES.map((s) => (
                  <Button key={s} size="sm" variant={s === scale ? "primary" : "ghost"} onClick={() => setScale(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              {calibration && calibration.selectedScale !== scale && (
                <p className="mt-1 text-xs text-maroon-400">Your calibrated scale is {calibration.selectedScale}.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-maroon-400">Mode</p>
              <select
                className="mt-1 rounded-lg border border-saffron-200 bg-white px-3 py-1.5 text-sm"
                value={mode}
                onChange={(e) => setMode(e.target.value as LessonMode)}
                aria-label="Practice mode"
              >
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {mode === "slow_practice" && (
              <div>
                <p className="text-xs font-medium text-maroon-400">Speed</p>
                <select
                  className="mt-1 rounded-lg border border-saffron-200 bg-white px-3 py-1.5 text-sm"
                  value={slowRate}
                  onChange={(e) => setSlowRate(Number(e.target.value) as (typeof SLOW_RATES)[number])}
                >
                  {SLOW_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}×
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-maroon-500">{MODES.find((m) => m.id === mode)?.description}</p>
        </Card>

        {/* Get ready countdown — shown right before listening/recording begins, so
            there's always a clear beat of warning before anything starts. */}
        {status === "get_ready" && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-saffron-100 py-8 text-center animate-pulse">
            <p className="font-display text-xs uppercase tracking-wide text-maroon-500">Get ready…</p>
            <p className="font-display text-4xl text-maroon-700">{getReadyCountdown}</p>
          </div>
        )}

        {/* Tracing paper */}
        {phrase && (
          <div className="mt-6">
            <TracingPaper
              words={words}
              displayMode={profile.preferredDisplayMode}
              textSizeScale={profile.textSizeScale}
              showMeaning={profile.showMeaning}
              currentTimeSec={livePlayheadAbsSec}
              feedback={result?.feedback}
            />
          </div>
        )}

        {/* Pitch contour */}
        <div className="mt-6">
          <PitchContourCanvas
            referenceCents={referenceCents}
            studentCents={liveStudentCents}
            playheadTimeSec={playheadRelativeSec}
            frameIntervalSec={DEFAULT_FRAME_INTERVAL_SEC}
          />
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {mode === "listen" ? (
            <Button size="lg" onClick={playListenOnly} disabled={status === "listening"}>
              {status === "listening" ? "Playing…" : "Play"}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={runGuidedAttempt}
              disabled={status === "get_ready" || status === "listening" || status === "capturing" || status === "scoring"}
            >
              {status === "get_ready"
                ? `Get ready… ${getReadyCountdown ?? ""}`
                : status === "capturing"
                  ? `Recording… ${countdown ?? ""}s`
                  : status === "scoring"
                    ? "Scoring…"
                    : status === "listening"
                      ? "Listen first…"
                      : "Start"}
            </Button>
          )}
          <Button size="lg" variant="ghost" onClick={resetAttempt}>
            Reset
          </Button>
          {phrase?.isRepeatableIndependently && (
            <p className="text-xs text-maroon-400">You can repeat this phrase as many times as you like.</p>
          )}
        </div>

        {pitchStream.permissionState === "denied" && (
          <p className="mt-3 rounded-xl bg-feedback-red/10 p-3 text-sm text-feedback-red">
            Microphone access is blocked, so practice modes can&apos;t score your attempt. You can still use
            Listen mode.
          </p>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <ScoreCard score={result.score} message={result.message} />
            <div className="flex gap-3">
              <Button onClick={runGuidedAttempt}>Try again</Button>
              <Button variant="ghost" onClick={() => router.push("/history")}>
                View history
              </Button>
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          src={audioForScale?.audioUrl}
          onEnded={handleAudioEnded}
          onTimeUpdate={(e) => {
            // Previously this only fired for "listening" — meaning the tracing-paper
            // highlight and pitch-contour playhead completely froze during the actual
            // chant-along/slow-practice recording, which is a big part of why it felt
            // "impossible to tell when to start chanting". Now it keeps updating
            // through "capturing" too, since the <audio> element is still playing then.
            if (mode === "listen" || status === "listening" || status === "capturing") {
              setCurrentTimeSec(e.currentTarget.currentTime);
            }
          }}
          preload="auto"
        />
        {audioForScale?.isPlaceholder && (
          <p className="mt-2 text-xs text-maroon-400">
            Playing a synthetic placeholder tone for scale {scale}, not a chant recording.
          </p>
        )}
      </main>
    </div>
  );
}
