"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PitchStream, checkAudioCapabilities, type PitchStreamFrame } from "@/lib/audio/pitchStream";

export type MicPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error";

/**
 * React wrapper around PitchStream: manages lifecycle (start/stop tied to
 * mount), exposes the latest frame + a rolling buffer, and surfaces
 * permission/support state so pages can show the right guidance per the
 * spec's "handle: microphone denial / unsupported browser" requirement.
 */
export function usePitchStream() {
  const streamRef = useRef<PitchStream | null>(null);
  const [permissionState, setPermissionState] = useState<MicPermissionState>("idle");
  const [latestFrame, setLatestFrame] = useState<PitchStreamFrame | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const framesRef = useRef<PitchStreamFrame[]>([]);

  const start = useCallback(async () => {
    const capabilities = checkAudioCapabilities();
    if (!capabilities.supported) {
      setPermissionState("unsupported");
      setErrorMessage(`Your browser is missing: ${capabilities.missing.join(", ")}.`);
      return;
    }

    setPermissionState("requesting");
    setErrorMessage(null);
    framesRef.current = [];

    try {
      const stream = new PitchStream();
      streamRef.current = stream;
      await stream.start();
      stream.subscribe((frame) => {
        framesRef.current.push(frame);
        setLatestFrame(frame);
      });
      setPermissionState("granted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not access the microphone.";
      const isPermissionDenied = message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied");
      setPermissionState(isPermissionDenied ? "denied" : "error");
      setErrorMessage(message);
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.stop();
    streamRef.current = null;
  }, []);

  const getFrames = useCallback(() => framesRef.current, []);
  const clearFrames = useCallback(() => {
    framesRef.current = [];
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop, permissionState, latestFrame, getFrames, clearFrames, errorMessage };
}
