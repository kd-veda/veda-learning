"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import type { DisplayTextMode, ScaleCalibration } from "@/lib/data/types";

const DISPLAY_MODES: Array<{ id: DisplayTextMode; label: string }> = [
  { id: "iast", label: "IAST (romanised)" },
  { id: "devanagari", label: "Devanāgarī" },
  { id: "simplified", label: "Simplified" },
];

export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    getDataProvider().getLatestCalibration(profile.id).then(setCalibration);
  }, [profile]);

  if (!profile) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  return (
    <div className="min-h-dvh bg-ivory">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-2xl text-maroon-700">Profile &amp; settings</h1>

        <Card className="mt-6">
          <CardTitle className="text-base">Display name</CardTitle>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-lg border border-saffron-200 px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-label="Display name"
            />
            <Button size="sm" onClick={() => updateProfile({ displayName })}>
              Save
            </Button>
          </div>
        </Card>

        <Card className="mt-6">
          <CardTitle className="text-base">Chanting scale</CardTitle>
          {calibration ? (
            <CardDescription className="mt-2">
              Currently Scale {calibration.selectedScale} (from note {calibration.detectedPitchClass}).
            </CardDescription>
          ) : (
            <CardDescription className="mt-2">Not calibrated yet.</CardDescription>
          )}
          <Link href="/onboarding/calibrate" className="mt-3 inline-block">
            <Button size="sm" variant="ghost">
              Recalibrate
            </Button>
          </Link>
        </Card>

        <Card className="mt-6">
          <CardTitle className="text-base">Text display</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {DISPLAY_MODES.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={profile.preferredDisplayMode === m.id ? "primary" : "ghost"}
                onClick={() => updateProfile({ preferredDisplayMode: m.id })}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-maroon-400" htmlFor="text-size">
              Text size
            </label>
            <input
              id="text-size"
              type="range"
              min={0.75}
              max={1.75}
              step={0.05}
              value={profile.textSizeScale}
              onChange={(e) => updateProfile({ textSizeScale: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.showMeaning}
              onChange={(e) => updateProfile({ showMeaning: e.target.checked })}
            />
            Show word meanings while practising
          </label>

          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.darkMode}
              onChange={(e) => updateProfile({ darkMode: e.target.checked })}
            />
            Dark mode
          </label>
        </Card>

        <Card className="mt-6">
          <CardTitle className="text-base">Privacy &amp; recordings</CardTitle>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.saveRecordingsConsent}
              onChange={(e) => updateProfile({ saveRecordingsConsent: e.target.checked })}
            />
            Save my practice recordings (off by default — practice still works without this)
          </label>
          <Link href="/privacy" className="mt-3 inline-block text-sm text-teal-600 underline">
            Read the full privacy &amp; recording preferences
          </Link>
        </Card>
      </main>
    </div>
  );
}
