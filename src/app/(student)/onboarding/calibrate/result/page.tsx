"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import { COURSE_SCALES, type CourseScale } from "@/lib/audio/scaleMapping";
import type { ScaleCalibration } from "@/lib/data/types";

function ResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const isManual = params.get("manual") === "1";
  const { profile } = useProfile();

  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [loading, setLoading] = useState(!isManual);

  useEffect(() => {
    if (isManual || !profile) return;
    getDataProvider()
      .getLatestCalibration(profile.id)
      .then(setCalibration)
      .finally(() => setLoading(false));
  }, [isManual, profile]);

  async function chooseScale(scale: CourseScale, isManualOverride: boolean) {
    if (!profile) return;
    const provider = getDataProvider();
    if (calibration) {
      await provider.saveCalibration({
        profileId: profile.id,
        detectedFrequencyHz: calibration.detectedFrequencyHz,
        detectedPitchClass: calibration.detectedPitchClass,
        recommendedScale: calibration.recommendedScale,
        selectedScale: scale,
        isManualOverride,
        confidence: calibration.confidence,
      });
    } else {
      await provider.saveCalibration({
        profileId: profile.id,
        detectedFrequencyHz: 0,
        detectedPitchClass: "C",
        recommendedScale: scale,
        selectedScale: scale,
        isManualOverride: true,
        confidence: 0,
      });
    }
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <Card className="text-center">
        <CardTitle>One moment…</CardTitle>
      </Card>
    );
  }

  if (isManual || !calibration) {
    return (
      <Card className="text-center">
        <CardTitle>Choose your scale</CardTitle>
        <CardDescription className="mt-2">
          You can pick a starting scale directly. You can always recalibrate later from your profile.
        </CardDescription>
        <div className="mt-6 grid grid-cols-4 gap-3">
          {COURSE_SCALES.map((scale) => (
            <Button key={scale} size="lg" variant="ghost" onClick={() => chooseScale(scale, true)}>
              Scale {scale}
            </Button>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <CardTitle>Your comfortable chanting note</CardTitle>
      <p className="mt-4 font-display text-5xl text-saffron-600">{calibration.detectedPitchClass}</p>
      <CardDescription className="mt-4 text-base">
        Your comfortable chanting note is <strong>{calibration.detectedPitchClass}</strong>. We recommend
        learning in <strong>Scale {calibration.recommendedScale}</strong>.
      </CardDescription>
      <p className="mt-2 text-xs text-maroon-400">
        This reflects a single comfortable &ldquo;Om&rdquo;, not your full vocal range — a fuller assessment
        may be added later.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Button size="lg" onClick={() => chooseScale(calibration.recommendedScale, false)}>
          Use Scale {calibration.recommendedScale}
        </Button>
        <details className="text-sm text-maroon-400">
          <summary className="cursor-pointer underline underline-offset-2">Choose a different scale instead</summary>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {COURSE_SCALES.map((scale) => (
              <Button key={scale} size="sm" variant="ghost" onClick={() => chooseScale(scale, true)}>
                Scale {scale}
              </Button>
            ))}
          </div>
        </details>
        <a href="/onboarding/calibrate" className="text-sm text-maroon-400 underline underline-offset-2">
          Recalibrate
        </a>
      </div>
    </Card>
  );
}

export default function CalibrationResultPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <Suspense fallback={<Card className="text-center">Loading…</Card>}>
        <ResultContent />
      </Suspense>
    </main>
  );
}
