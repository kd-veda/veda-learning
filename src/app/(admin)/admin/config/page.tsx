"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDataProvider } from "@/lib/data/provider";
import type { AppConfig } from "@/lib/config/appConfig";
import { PITCH_CLASSES, type PitchClass } from "@/lib/audio/noteMapping";
import { COURSE_SCALES, type CourseScale } from "@/lib/audio/scaleMapping";

function ConfigContent() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDataProvider().getAppConfig().then(setConfig);
  }, []);

  if (!config) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  function setMapping(pitchClass: PitchClass, scale: CourseScale) {
    setConfig((prev) => (prev ? { ...prev, scaleMapping: { ...prev.scaleMapping, [pitchClass]: scale } } : prev));
  }

  async function save() {
    if (!config) return;
    await getDataProvider().updateAppConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-saffron-100 bg-white/70 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/admin" className="text-sm text-teal-600 underline">
            ← Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-xl text-maroon-700">Configuration</h1>

        <Card className="mt-6">
          <CardTitle className="text-base">Note → course scale mapping</CardTitle>
          <CardDescription>Used to recommend a scale from a student&apos;s calibrated &ldquo;Om&rdquo;.</CardDescription>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PITCH_CLASSES.map((pc) => (
              <div key={pc} className="flex items-center justify-between rounded-lg bg-saffron-50 px-3 py-2">
                <span className="font-medium">{pc}</span>
                <select
                  className="rounded border border-saffron-200 px-1.5 py-1 text-sm"
                  value={config.scaleMapping[pc]}
                  onChange={(e) => setMapping(pc, e.target.value as CourseScale)}
                >
                  {COURSE_SCALES.map((scale) => (
                    <option key={scale} value={scale}>
                      {scale}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6">
          <CardTitle className="text-base">Pitch feedback tolerance</CardTitle>
          <div className="mt-3 space-y-4">
            <div>
              <label className="text-xs font-medium text-maroon-400">Green threshold: {config.pitchTolerance.greenCents}¢</label>
              <input
                type="range"
                min={5}
                max={60}
                value={config.pitchTolerance.greenCents}
                onChange={(e) =>
                  setConfig((prev) => (prev ? { ...prev, pitchTolerance: { ...prev.pitchTolerance, greenCents: Number(e.target.value) } } : prev))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-maroon-400">Amber threshold: {config.pitchTolerance.amberCents}¢</label>
              <input
                type="range"
                min={20}
                max={120}
                value={config.pitchTolerance.amberCents}
                onChange={(e) =>
                  setConfig((prev) => (prev ? { ...prev, pitchTolerance: { ...prev.pitchTolerance, amberCents: Number(e.target.value) } } : prev))
                }
                className="w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.pitchTolerance.octaveToleranceEnabled}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, pitchTolerance: { ...prev.pitchTolerance, octaveToleranceEnabled: e.target.checked } } : prev
                  )
                }
              />
              Don&apos;t penalise octave-equivalent pitch
            </label>
          </div>
        </Card>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save}>Save configuration</Button>
          {saved && <span className="text-sm text-feedback-green">Saved.</span>}
        </div>
      </main>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <AdminGuard>
      <ConfigContent />
    </AdminGuard>
  );
}
