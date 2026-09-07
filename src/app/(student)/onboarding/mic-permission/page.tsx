"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { checkAudioCapabilities } from "@/lib/audio/pitchStream";

export default function MicPermissionPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "requesting" | "denied" | "unsupported" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function requestAccess() {
    const capabilities = checkAudioCapabilities();
    if (!capabilities.supported) {
      setStatus("unsupported");
      setMessage(`Your browser is missing: ${capabilities.missing.join(", ")}. Try an up-to-date Chrome or Safari.`);
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // just testing permission here; calibrate page opens its own stream
      router.push("/onboarding/calibrate");
    } catch {
      setStatus("denied");
      setMessage(
        "Microphone access was blocked. You can allow it from your browser's site settings, or choose a scale manually instead."
      );
    }
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <Card className="text-center">
        <CardTitle>We&apos;ll need your microphone</CardTitle>
        <CardDescription className="mt-2 text-base">
          Please move to a quiet space if you can. We only listen while you&apos;re actively chanting or
          practising — nothing is recorded or sent anywhere unless you choose to save it.
        </CardDescription>

        {message && (
          <p role="alert" className="mt-4 rounded-xl bg-feedback-amber/10 p-3 text-sm text-feedback-amber">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button size="lg" onClick={requestAccess} disabled={status === "requesting"}>
            {status === "requesting" ? "Requesting…" : "Allow microphone access"}
          </Button>
          <a href="/onboarding/calibrate/result?manual=1">
            <Button size="lg" variant="ghost" className="w-full">
              Choose my scale manually instead
            </Button>
          </a>
        </div>
      </Card>
    </main>
  );
}
