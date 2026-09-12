"use client";

import { useEffect, useRef } from "react";
import { classifyPitchDifference, DEFAULT_PITCH_TOLERANCE, type PitchTolerance } from "@/lib/audio/scoring";
import { DEFAULT_FRAME_INTERVAL_SEC } from "@/lib/audio/referenceTrack";

export interface PitchContourCanvasProps {
  /** Teacher's reference, cents relative to tonic, one point per frame (null = silence/gap). */
  referenceCents: Array<number | null>;
  /** Student's live/attempt trace, same units, may be shorter (fills in as practice proceeds). */
  studentCents: Array<number | null>;
  tolerance?: PitchTolerance;
  height?: number;
  /**
   * Current playback/recording position, in seconds from the start of the
   * phrase — draws a moving "now" line. Pass null/undefined when nothing is
   * currently playing (idle, get-ready, scoring, done) so the line disappears.
   */
  playheadTimeSec?: number | null;
  /** Must match the frame rate `referenceCents` was sampled at (see referenceTrack.ts). */
  frameIntervalSec?: number;
}

const CENTS_RANGE = 300; // display window: +/-300 cents around 0, generous for a chanting phrase

/**
 * Draws the teacher's pitch contour as a dashed guide line and the
 * student's trace as a solid line coloured green/amber/red per point,
 * grey where there's no confident signal — the visual heart of "tracing
 * paper for chanting".
 */
export function PitchContourCanvas({
  referenceCents,
  studentCents,
  tolerance = DEFAULT_PITCH_TOLERANCE,
  height = 160,
  playheadTimeSec = null,
  frameIntervalSec = DEFAULT_FRAME_INTERVAL_SEC,
}: PitchContourCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const totalPoints = Math.max(referenceCents.length, studentCents.length, 1);
    const xStep = width / totalPoints;
    const yFor = (cents: number) => height / 2 - (cents / CENTS_RANGE) * (height / 2 - 10);

    // Centre line (the tonic).
    ctx.strokeStyle = "#E8D8B0";
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Teacher reference — dashed guide line.
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#2E7370";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    referenceCents.forEach((cents, i) => {
      const x = i * xStep;
      if (cents === null) {
        started = false;
        return;
      }
      const y = yFor(cents);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Student trace — solid, coloured per-segment by closeness to the reference at that index.
    ctx.lineWidth = 3;
    for (let i = 1; i < studentCents.length; i++) {
      const prev = studentCents[i - 1];
      const curr = studentCents[i];
      if (prev === null || curr === null) continue;
      const refAtI = referenceCents[Math.min(i, referenceCents.length - 1)] ?? null;
      const diff = refAtI !== null ? curr - refAtI : null;
      const colour = classifyPitchDifference(diff, tolerance);
      ctx.strokeStyle = { green: "#3E8E5A", amber: "#D9931F", red: "#C24B4B", grey: "#9A958D" }[colour];
      ctx.beginPath();
      ctx.moveTo((i - 1) * xStep, yFor(prev));
      ctx.lineTo(i * xStep, yFor(curr));
      ctx.stroke();
    }

    // "Start chanting here" marker — the first frame where the teacher's
    // reference has actual pitch data (before that is the lead-in silence).
    // This is what tells the student where the blank stretch at the left
    // ends and they need to begin.
    const startIndex = referenceCents.findIndex((c) => c !== null);
    if (startIndex >= 0) {
      const x = startIndex * xStep;
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = "#D97B1F"; // saffron-600
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, height - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#B15F14"; // saffron-700
      ctx.font = "11px sans-serif";
      ctx.textAlign = x > width - 70 ? "right" : "left";
      ctx.fillText("start chanting", x > width - 70 ? x - 4 : x + 4, 13);
    }

    // Moving "now" playhead — where playback/recording currently is.
    if (playheadTimeSec !== null && playheadTimeSec !== undefined && Number.isFinite(playheadTimeSec)) {
      const playheadIndex = playheadTimeSec / frameIntervalSec;
      if (playheadIndex >= 0 && playheadIndex <= totalPoints) {
        const x = playheadIndex * xStep;
        ctx.strokeStyle = "#7A2231"; // maroon-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }
  }, [referenceCents, studentCents, tolerance, height, playheadTimeSec, frameIntervalSec]);

  return (
    <div>
      <canvas ref={canvasRef} style={{ width: "100%", height }} role="img" aria-label="Pitch contour comparison: teacher (dashed teal) vs. your voice (solid, colour-coded), with a marker for where to start chanting and a moving line for the current position" />
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-maroon-400">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-teal-500" /> Teacher
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-0.5 border-l-2 border-dashed border-saffron-600" /> Start chanting
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-0.5 bg-maroon-500" /> Now
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-feedback-green" /> Close
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-feedback-amber" /> A little off
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-feedback-red" /> Far off
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-feedback-grey" /> No signal
        </span>
      </div>
    </div>
  );
}
