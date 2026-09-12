"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { Card, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WaveformEditor } from "@/components/audio/WaveformEditor";
import { PitchContourCanvas } from "@/components/audio/PitchContourCanvas";
import { getDataProvider, type LessonContent } from "@/lib/data/provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { detectPitchYin } from "@/lib/audio/pitchDetector";
import { centsBetween } from "@/lib/audio/noteMapping";
import { COURSE_SCALES, SCALE_ROOT_FREQUENCY_HZ, type CourseScale } from "@/lib/audio/scaleMapping";
import type { Syllable } from "@/lib/data/types";

const SVARA_OPTIONS: Syllable["svaraCategory"][] = ["udatta", "anudatta", "svarita", "dirgha_svarita"];

function AlignEditorContent() {
  const params = useSearchParams();
  const lessonId = params.get("lessonId");

  const [content, setContent] = useState<LessonContent | null>(null);
  const [scale, setScale] = useState<CourseScale>("B");
  const [playheadSec, setPlayheadSec] = useState(0);
  const [extractedCents, setExtractedCents] = useState<Array<number | null>>([]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(() => {
    if (!lessonId) return;
    getDataProvider().getLessonContent(lessonId).then(setContent);
  }, [lessonId]);

  useEffect(refresh, [refresh]);

  if (!lessonId) return <p className="p-8 text-center text-maroon-400">No lesson selected.</p>;
  if (!content) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  const audio = content.audio.find((a) => a.scale === scale);
  const syllables = content.phrases.flatMap((p) => p.words.flatMap((w) => w.syllables));

  async function updateSyllable(syllable: Syllable, patch: Partial<Syllable>) {
    const provider = getDataProvider();
    await provider.upsertSyllable({ ...syllable, ...patch });
    refresh();
  }

  async function handleAudioUpload(file: File) {
    setUploading(true);
    try {
      const provider = getDataProvider();
      const supabase = getSupabaseBrowserClient();
      const durationSec = await readAudioDuration(file);

      let audioUrl: string;
      if (supabase) {
        const path = `${content!.lesson.id}/${scale}-${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("lesson-audio").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("lesson-audio").getPublicUrl(path);
        audioUrl = data.publicUrl;
      } else {
        // Local/guest mode: store as a data URL directly in IndexedDB (fine for short demo
        // clips; see docs/LIMITATIONS.md — a real deployment should always go through Storage).
        audioUrl = await readFileAsDataUrl(file);
      }

      await provider.upsertLessonAudio({
        id: audio?.id,
        lessonId: content!.lesson.id,
        scale,
        audioUrl,
        durationSec,
        isPlaceholder: false,
      });
      refresh();
    } finally {
      setUploading(false);
    }
  }

  async function extractContour() {
    if (!audio) return;
    setExtracting(true);
    try {
      const response = await fetch(audio.audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      const channel = decoded.getChannelData(0);

      const frameSize = 2048;
      const hop = 1024;
      const points: Array<{ timeSec: number; frequencyHz: number | null; confidence: number }> = [];
      for (let start = 0; start + frameSize < channel.length; start += hop) {
        const frame = channel.subarray(start, start + frameSize);
        const result = detectPitchYin(frame as Float32Array, { sampleRate: decoded.sampleRate });
        points.push({ timeSec: start / decoded.sampleRate, frequencyHz: result.frequencyHz, confidence: result.confidence });
      }

      await getDataProvider().savePitchContour({ lessonAudioId: audio.id, points, isManuallyCorrected: false });

      const tonic = SCALE_ROOT_FREQUENCY_HZ[scale];
      setExtractedCents(points.map((p) => (p.frequencyHz ? centsBetween(p.frequencyHz, tonic) : null)));
      await audioContext.close();
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-ivory pb-16">
      <header className="border-b border-saffron-100 bg-white/70 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href={`/admin/chants/${content.chant.id}`} className="text-sm text-teal-600 underline">
            ← {content.chant.title}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display text-xl text-maroon-700">Audio &amp; syllable alignment</h1>
        <CardDescription>{content.lesson.title}</CardDescription>

        <div className="mt-4 flex gap-2">
          {COURSE_SCALES.map((s) => (
            <Button key={s} size="sm" variant={s === scale ? "primary" : "ghost"} onClick={() => setScale(s)}>
              Scale {s}
            </Button>
          ))}
        </div>

        <Card className="mt-4">
          {audio ? (
            <>
              {audio.isPlaceholder && (
                <p className="mb-3 rounded-xl bg-feedback-amber/10 p-2 text-xs text-feedback-amber">
                  Currently a synthetic placeholder tone. Upload the teacher-approved recording below to replace it.
                </p>
              )}
              <WaveformEditor audioUrl={audio.audioUrl} onTimeUpdate={setPlayheadSec} />
              <p className="mt-2 text-xs text-maroon-400">Playhead: {playheadSec.toFixed(2)}s — use this with the syllable rows below.</p>
            </>
          ) : (
            <p className="text-sm text-maroon-400">No audio uploaded yet for scale {scale}.</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm">
              <span className="sr-only">Upload recording for scale {scale}</span>
              <input
                type="file"
                accept="audio/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                }}
              />
            </label>
            {audio && (
              <Button size="sm" variant="ghost" onClick={extractContour} disabled={extracting}>
                {extracting ? "Extracting…" : "Preview extracted pitch contour"}
              </Button>
            )}
          </div>

          {extractedCents.length > 0 && (
            <div className="mt-4">
              <PitchContourCanvas referenceCents={extractedCents} studentCents={[]} height={120} />
              <p className="mt-1 text-xs text-maroon-400">
                Auto-extracted contour (teal dashed line). Manual point-by-point correction isn&apos;t in this
                MVP — see docs/PHASE_2.md.
              </p>
            </div>
          )}
        </Card>

        <h2 className="mt-8 font-display text-lg text-maroon-700">Syllables</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-saffron-200 text-left text-xs text-maroon-400">
                <th className="py-2 pr-2">Text</th>
                <th className="py-2 pr-2">IAST</th>
                <th className="py-2 pr-2">Devanāgarī</th>
                <th className="py-2 pr-2">Start</th>
                <th className="py-2 pr-2">End</th>
                <th className="py-2 pr-2">Svara</th>
                <th className="py-2 pr-2">Pitch level</th>
                <th className="py-2 pr-2">Teacher note</th>
              </tr>
            </thead>
            <tbody>
              {syllables.map((syllable) => (
                <tr key={syllable.id} className="border-b border-saffron-100 align-top">
                  <td className="py-2 pr-2">
                    <input
                      className="w-24 rounded border border-saffron-200 px-1.5 py-1"
                      defaultValue={syllable.displayText}
                      onBlur={(e) => updateSyllable(syllable, { displayText: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-24 rounded border border-saffron-200 px-1.5 py-1"
                      defaultValue={syllable.iast}
                      onBlur={(e) => updateSyllable(syllable, { iast: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-24 rounded border border-saffron-200 px-1.5 py-1 font-devanagari"
                      defaultValue={syllable.devanagari ?? ""}
                      onBlur={(e) => updateSyllable(syllable, { devanagari: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={0.05}
                        className="w-16 rounded border border-saffron-200 px-1.5 py-1"
                        defaultValue={syllable.startTimeSec}
                        onBlur={(e) => updateSyllable(syllable, { startTimeSec: Number(e.target.value) })}
                      />
                      <Button size="sm" variant="ghost" onClick={() => updateSyllable(syllable, { startTimeSec: playheadSec })}>
                        Set
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={0.05}
                        className="w-16 rounded border border-saffron-200 px-1.5 py-1"
                        defaultValue={syllable.endTimeSec}
                        onBlur={(e) => updateSyllable(syllable, { endTimeSec: Number(e.target.value) })}
                      />
                      <Button size="sm" variant="ghost" onClick={() => updateSyllable(syllable, { endTimeSec: playheadSec })}>
                        Set
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      className="rounded border border-saffron-200 px-1.5 py-1"
                      defaultValue={syllable.svaraCategory}
                      onChange={(e) => updateSyllable(syllable, { svaraCategory: e.target.value as Syllable["svaraCategory"] })}
                    >
                      {SVARA_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      className="w-16 rounded border border-saffron-200 px-1.5 py-1"
                      defaultValue={syllable.targetPitchLevel}
                      onBlur={(e) => updateSyllable(syllable, { targetPitchLevel: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-40 rounded border border-saffron-200 px-1.5 py-1"
                      defaultValue={syllable.teacherNote ?? ""}
                      onBlur={(e) => updateSyllable(syllable, { teacherNote: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(audio.duration || 0);
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AlignEditorPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<p className="p-8 text-center text-maroon-400">Loading…</p>}>
        <AlignEditorContent />
      </Suspense>
    </AdminGuard>
  );
}
