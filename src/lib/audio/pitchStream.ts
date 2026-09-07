"use client";

/**
 * Wires the microphone -> AudioWorklet -> YIN pipeline together and exposes
 * a small subscribe/unsubscribe API that React hooks (see
 * src/hooks/usePitchStream.ts) build on. Kept framework-agnostic on purpose
 * so it's independently testable and reusable outside React if needed.
 */

import { detectPitchYin, type PitchDetectionResult } from "./pitchDetector";

export interface PitchStreamFrame extends PitchDetectionResult {
  timeSec: number;
}

export type PitchStreamListener = (frame: PitchStreamFrame) => void;

export interface AudioCapabilityCheck {
  supported: boolean;
  missing: string[];
}

/** Checks whether this browser can run the live pitch pipeline at all. */
export function checkAudioCapabilities(): AudioCapabilityCheck {
  const missing: string[] = [];
  if (typeof window === "undefined") return { supported: false, missing: ["window"] };
  if (!("mediaDevices" in navigator) || !navigator.mediaDevices?.getUserMedia) {
    missing.push("microphone access (getUserMedia)");
  }
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) missing.push("Web Audio API (AudioContext)");
  if (AudioContextCtor && !("audioWorklet" in AudioContextCtor.prototype)) {
    missing.push("AudioWorklet");
  }
  return { supported: missing.length === 0, missing };
}

export class PitchStream {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private listeners = new Set<PitchStreamListener>();
  private startTime = 0;

  /** Starts capturing microphone audio and emitting pitch frames to subscribers. */
  async start(): Promise<void> {
    const capabilities = checkAudioCapabilities();
    if (!capabilities.supported) {
      throw new Error(
        `Your browser is missing: ${capabilities.missing.join(", ")}. Please try an up-to-date Chrome or Safari.`
      );
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextCtor();
    await this.audioContext.audioWorklet.addModule("/worklets/pitch-processor.js");

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "pitch-capture-processor", {
      processorOptions: { bufferSize: 2048 },
    });

    this.startTime = this.audioContext.currentTime;

    this.workletNode.port.onmessage = (event: MessageEvent) => {
      if (event.data?.type !== "frame") return;
      const buffer = event.data.buffer as Float32Array;
      const result = detectPitchYin(buffer, { sampleRate: this.audioContext!.sampleRate });
      const timeSec = this.audioContext!.currentTime - this.startTime;
      const frame: PitchStreamFrame = { ...result, timeSec };
      for (const listener of this.listeners) listener(frame);
    };

    this.sourceNode.connect(this.workletNode);
    // Intentionally not connected to destination — we never play the mic
    // back out, which would risk feedback/echo.
  }

  subscribe(listener: PitchStreamListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  stop(): void {
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close().catch(() => undefined);
    this.workletNode = null;
    this.sourceNode = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.listeners.clear();
  }
}
