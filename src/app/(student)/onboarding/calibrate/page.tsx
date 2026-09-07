"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { TunerDial } from "@/components/audio/TunerDial";
import { usePitchStream } from "@/hooks/usePitchStream";
import { useProfile } from "@/hooks/useProfile";
import { smoothPitchTrack, extractStableFrequency } from "@/lib/audio/smoothing";
import { evaluateCalibrationAttempt, combineCalibrationAttempts, type AttemptEvaluation } from "@/lib/audio/calibrationConfidence";
import { analyseFrequency } from "@/lib/audio/noteMapping";
import { recommendScale } from "@/lib/audio/scaleMapping";
import { getDataProvider } from "@/lib/data/provider";

const TOTAL_ATTEMPTS = 3;
const RECORDING_SECONDS = 5;

type Phase = "intro" | "recording" | "attempt-result" | "combining";

export default function CalibratePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const { start, stop, permissionState, latestFrame, getFrames, clearFrames, errorMessage } = usePitchStream();

  const [phase, setPhase] = useState<Phase>("intro");
  const [attempts, setAttempts] = useState<AttemptEvaluation[]>([]);
  const [countdown, setCountdown] = useState(RECORDING_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishAttempt = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const frames = getFrames();
    const smoothed = smoothPitchTrack(frames);
    const stable = extractStableFrequency(smoothed);
    const evaluation = evaluateCalibrationAttempt(stable);
    setAttempts((prev) => [...prev, evaluation]);
    setPhase("attempt-result");
  }, [getFrames]);

  function beginRecording() {
    clearFrames();
    setCountdown(RECORDING_SECONDS);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          finishAttempt();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function retryAttempt() {
    setAttempts((prev) => prev.slice(0, -1));
    beginRecording();
  }

  async function finishCalibration() {
    setPhase("combining");
    const combined = combineCalibrationAttempts(attempts);
    const provider = getDataProvider();
    const config = await provider.getAppConfig();

    if (!combined.frequencyHz || !profile) {
      router.push("/onboarding/calibrate/result?manual=1");
      return;
    }

    const info = analyseFrequency(combined.frequencyHz);
    const scale = recommendScale(info.pitchClass, config.scaleMapping);

    const calibration = await provider.saveCalibration({
      profileId: profile.id,
      detectedFrequencyHz: combined.frequencyHz,
      detectedPitchClass: info.pitchClass,
      recommendedScale: scale,
      selectedScale: scale,
      isManualOverride: false,
      confidence: combined.isReliable ? 0.8 : 0.4,
    });

    stop();
    router.push(`/onboarding/calibrate/result?calibrationId=${calibration.id}`);
  }

  if (permissionState === "denied" || permissionState === "unsupported" || permissionState === "error") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
        <Card className="text-center">
          <CardTitle>We couldn&apos;t hear you</CardTitle>
          <CardDescription className="mt-2">{errorMessage ?? "The microphone is unavailable."}</CardDescription>
          <a href="/onboarding/calibrate/result?manual=1" className="mt-6 block">
            <Button size="lg" className="w-full">
              Choose my scale manually
            </Button>
          </a>
        </Card>
      </main>
    );
  }

  const attemptNumber = attempts.length + 1;
  const lastAttempt = attempts[attempts.length - 1];

  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <Card>
        <div className="text-center">
          <p className="text-sm font-medium text-teal-600">Attempt {Math.min(attemptNumber, TOTAL_ATTEMPTS)} of {TOTAL_ATTEMPTS}</p>
          <CardTitle className="mt-1">
            {phase === "recording" ? "Take a gentle breath and chant Oṃ naturally…" : "Ready for the next attempt"}
          </CardTitle>
        </div>

        <div className="mt-6 flex justify-center">
          <TunerDial
            frequencyHz={phase === "recording" ? latestFrame?.frequencyHz ?? null : null}
            confidence={latestFrame?.confidence ?? 0}
            rms={phase === "recording" ? latestFrame?.rms ?? 0 : 0}
            isStable={phase === "recording" && countdown < RECORDING_SECONDS - 1}
          />
        </div>

        {phase === "recording" && (
          <p className="mt-4 text-center text-2xl font-display text-saffron-600" aria-live="polite">
            {countdown}s
          </p>
        )}

        {phase === "attempt-result" && lastAttempt && (
          <div className="mt-6 text-center">
            {lastAttempt.accepted ? (
              <p className="rounded-xl bg-feedback-green/10 p-3 text-feedback-green">
                Beautiful — that attempt was clear and steady.
              </p>
            ) : (
              <p className="rounded-xl bg-feedback-amber/10 p-3 text-feedback-amber">
                {lastAttempt.reason === "too_quiet" && "We couldn't hear enough sound. Let's try a little louder."}
                {lastAttempt.reason === "too_short_voiced" && "That attempt was a bit short or unsteady — let's try once more."}
                {lastAttempt.reason === "low_confidence" && "We're not fully confident in that one — one more try will help."}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {phase === "intro" && (
            <Button size="lg" onClick={beginRecording}>
              Start chanting Oṃ
            </Button>
          )}
          {phase === "attempt-result" && attempts.length < TOTAL_ATTEMPTS && (
            <Button size="lg" onClick={beginRecording}>
              Next attempt
            </Button>
          )}
          {phase === "attempt-result" && !lastAttempt?.accepted && (
            <Button size="lg" variant="ghost" onClick={retryAttempt}>
              Try that attempt again
            </Button>
          )}
          {phase === "attempt-result" && attempts.length >= TOTAL_ATTEMPTS && (
            <Button size="lg" onClick={finishCalibration}>
              See my result
            </Button>
          )}
          {phase === "combining" && (
            <Button size="lg" disabled>
              Finding your comfortable scale…
            </Button>
          )}
          <a href="/onboarding/calibrate/result?manual=1" className="text-center text-sm text-maroon-400 underline underline-offset-2">
            Choose my scale manually instead
          </a>
        </div>
      </Card>
    </main>
  );
}
