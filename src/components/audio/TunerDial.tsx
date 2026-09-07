"use client";

import { cn } from "@/lib/utils";
import { analyseFrequency } from "@/lib/audio/noteMapping";

export interface TunerDialProps {
  frequencyHz: number | null;
  confidence: number;
  rms: number;
  /** True once enough of the current attempt has been captured to look "stable". */
  isStable?: boolean;
}

/**
 * Live tuner-style visual: detected note, frequency, cents sharp/flat,
 * confidence, a stable-note indicator and an input-volume meter — every
 * element the spec's calibration UI requires.
 */
export function TunerDial({ frequencyHz, confidence, rms, isStable }: TunerDialProps) {
  const info = frequencyHz ? analyseFrequency(frequencyHz) : null;
  const centsClamped = info ? Math.max(-50, Math.min(50, info.cents)) : 0;
  const needleRotation = (centsClamped / 50) * 45; // -45deg..45deg

  return (
    <div className="flex flex-col items-center gap-4" role="group" aria-label="Pitch tuner">
      <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-saffron-200 bg-white shadow-inner dark:bg-maroon-700/40">
        <div
          className="absolute bottom-1/2 left-1/2 h-16 w-1 origin-bottom rounded-full bg-teal-500 transition-transform duration-150"
          style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)` }}
          aria-hidden
        />
        <div className="z-10 flex flex-col items-center">
          <span className="font-display text-3xl text-maroon-700 dark:text-ivory">{info?.pitchClass ?? "—"}</span>
          <span className="text-xs text-maroon-400">{info ? `${info.cents > 0 ? "+" : ""}${info.cents}¢` : "no signal"}</span>
        </div>
      </div>

      <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-maroon-400">Frequency</dt>
        <dd className="text-right font-medium">{frequencyHz ? `${frequencyHz.toFixed(1)} Hz` : "—"}</dd>
        <dt className="text-maroon-400">Confidence</dt>
        <dd className="text-right font-medium">{Math.round(confidence * 100)}%</dd>
        <dt className="text-maroon-400">Stable note</dt>
        <dd className={cn("text-right font-medium", isStable ? "text-feedback-green" : "text-maroon-400")}>
          {isStable ? "Yes" : "Listening…"}
        </dd>
      </dl>

      <div className="w-full max-w-xs">
        <div className="mb-1 text-xs text-maroon-400">Input volume</div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-saffron-100">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-100"
            style={{ width: `${Math.min(100, rms * 400)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
