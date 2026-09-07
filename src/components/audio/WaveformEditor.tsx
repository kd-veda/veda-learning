"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export interface WaveformEditorProps {
  audioUrl: string;
  onTimeUpdate?: (timeSec: number) => void;
}

/**
 * Thin wrapper around WaveSurfer.js for the admin syllable/timing alignment
 * editor. Deliberately simple per the spec's "functional but simple"
 * allowance: click-to-seek + play/pause, with the current playhead time
 * exposed via onTimeUpdate so the syllable table can "punch in" start/end
 * times from it.
 */
export function WaveformEditor({ audioUrl, onTimeUpdate }: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<import("wavesurfer.js").default | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: WaveSurfer } = await import("wavesurfer.js");
      if (cancelled || !containerRef.current) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#F8C874",
        progressColor: "#E8963A",
        cursorColor: "#7A2231",
        height: 96,
        url: audioUrl,
      });
      waveSurferRef.current = ws;

      ws.on("timeupdate", (time: number) => {
        setCurrentTime(time);
        onTimeUpdate?.(time);
      });
      ws.on("ready", () => setDuration(ws.getDuration()));
      ws.on("play", () => setIsPlaying(true));
      ws.on("pause", () => setIsPlaying(false));
      ws.on("finish", () => setIsPlaying(false));
    })();

    return () => {
      cancelled = true;
      waveSurferRef.current?.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl, onTimeUpdate]);

  return (
    <div>
      <div ref={containerRef} className="rounded-xl bg-white/60 p-2" />
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" onClick={() => waveSurferRef.current?.playPause()}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <span className="text-xs text-maroon-500">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>
    </div>
  );
}
