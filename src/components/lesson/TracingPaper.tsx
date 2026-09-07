"use client";

import { cn } from "@/lib/utils";
import type { DisplayTextMode, Syllable, Word } from "@/lib/data/types";
import type { FeedbackColour } from "@/lib/audio/scoring";

const SVARA_LABEL: Record<Syllable["svaraCategory"], string> = {
  udatta: "udātta",
  anudatta: "anudātta",
  svarita: "svarita",
  dirgha_svarita: "dīrgha svarita",
};

// Vertical offset hints so svara categories read as a visual "shape" even
// before any colour feedback is applied — udātta sits high, anudātta low,
// svarita rises from the baseline.
const SVARA_OFFSET_CLASS: Record<Syllable["svaraCategory"], string> = {
  udatta: "-translate-y-1.5",
  anudatta: "translate-y-1.5",
  svarita: "-translate-y-0.5",
  dirgha_svarita: "-translate-y-2.5",
};

function textFor(entity: { displayText: string; iast: string; devanagari?: string }, mode: DisplayTextMode): string {
  if (mode === "devanagari" && entity.devanagari) return entity.devanagari;
  if (mode === "simplified") return entity.displayText;
  return entity.iast;
}

export interface TracingPaperProps {
  words: Array<{ word: Word; syllables: Syllable[] }>;
  displayMode: DisplayTextMode;
  textSizeScale: number;
  showMeaning: boolean;
  /** Current playhead position, in seconds from the phrase start — drives the "moving playhead" highlight. */
  currentTimeSec: number | null;
  /** Per-syllable colour feedback from the most recent (or in-progress) attempt. */
  feedback?: Map<string, FeedbackColour>;
}

const FEEDBACK_RING: Record<FeedbackColour, string> = {
  green: "ring-2 ring-feedback-green bg-feedback-green/10",
  amber: "ring-2 ring-feedback-amber bg-feedback-amber/10",
  red: "ring-2 ring-feedback-red bg-feedback-red/10",
  grey: "ring-2 ring-feedback-grey/50 bg-feedback-grey/5",
};

/** The "tracing paper" text view: syllables move with the teacher's voice, coloured by feedback once available. */
export function TracingPaper({ words, displayMode, textSizeScale, showMeaning, currentTimeSec, feedback }: TracingPaperProps) {
  return (
    <div
      className="flex flex-wrap items-end justify-center gap-x-6 gap-y-4 rounded-2xl bg-white/70 p-6 dark:bg-maroon-700/20"
      style={{ fontSize: `${textSizeScale}rem` }}
      lang={displayMode === "devanagari" ? "sa" : undefined}
    >
      {words.map(({ word, syllables }) => (
        <div key={word.id} className="flex flex-col items-center">
          <div className="flex gap-1">
            {syllables.map((syllable) => {
              const isActive =
                currentTimeSec !== null && currentTimeSec >= syllable.startTimeSec && currentTimeSec < syllable.endTimeSec;
              const colour = feedback?.get(syllable.id);
              return (
                <span
                  key={syllable.id}
                  title={`${SVARA_LABEL[syllable.svaraCategory]}${syllable.teacherNote ? ` — ${syllable.teacherNote}` : ""}`}
                  className={cn(
                    "relative rounded-lg px-2 py-1 font-devanagari transition-all duration-150",
                    SVARA_OFFSET_CLASS[syllable.svaraCategory],
                    isActive && "scale-110 animate-playhead-glow bg-saffron-100",
                    colour && FEEDBACK_RING[colour]
                  )}
                >
                  {textFor(syllable, displayMode)}
                </span>
              );
            })}
          </div>
          {showMeaning && word.translation && <p className="mt-1 text-xs text-maroon-400">{word.translation}</p>}
        </div>
      ))}
    </div>
  );
}
