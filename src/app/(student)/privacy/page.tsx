"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";

export default function PrivacyPage() {
  const { profile, updateProfile } = useProfile();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [profile?.id]);

  return (
    <div className="min-h-dvh bg-ivory">
      {profile && <AppHeader profile={profile} />}
      <main id="main-content" className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-2xl text-maroon-700">Privacy &amp; recording preferences</h1>

        <Card className="mt-6 space-y-3 text-sm text-maroon-600">
          <p>
            Veda Learning is designed to be used by children as well as adults, so we keep data collection
            to a minimum by default.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Microphone audio is analysed live, in your browser, for pitch — it is not sent anywhere by default.</li>
            <li>Your practice attempt is only saved as pitch/timing data, not as raw audio, unless you turn on &ldquo;Save my recordings&rdquo;.</li>
            <li>Guest mode keeps everything on this device only, until you create an account.</li>
            <li>There are no public profiles and no messaging between students, ever.</li>
            <li>We don&apos;t use advertising trackers.</li>
            <li>
              If a child is using an account (rather than guest mode), a parent or guardian consent step is
              expected before saving any recordings — see docs/LIMITATIONS.md for what this MVP does and does
              not yet enforce.
            </li>
            <li>
              This service is intended for South African users and is designed with POPIA&apos;s principles
              (minimal collection, purpose limitation, consent) in mind; it is not a substitute for your own
              legal review before real-world launch.
            </li>
          </ul>
        </Card>

        {profile && (
          <Card className="mt-6">
            <CardTitle className="text-base">Practice without saving audio</CardTitle>
            <CardDescription className="mt-1">
              This is the default. Pitch/timing data still saves so your history and streak work; no raw
              recording is ever kept unless you opt in below.
            </CardDescription>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.saveRecordingsConsent}
                onChange={(e) => updateProfile({ saveRecordingsConsent: e.target.checked })}
              />
              Save my practice recordings
            </label>
          </Card>
        )}

        <Card className="mt-6">
          <CardTitle className="text-base">Delete my recordings</CardTitle>
          <CardDescription className="mt-1">
            Removes any saved audio recordings tied to your account. Your scores and streak history are kept
            unless you also delete your account.
          </CardDescription>
          {confirmDelete ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="danger">
                Confirm delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setConfirmDelete(true)}>
              Delete my recordings
            </Button>
          )}
          <p className="mt-2 text-xs text-maroon-400">
            In local/guest mode there is nothing to delete on a server — this clears anything saved on this
            device. With a connected Supabase project, this removes files from the private storage bucket.
          </p>
        </Card>
      </main>
    </div>
  );
}
