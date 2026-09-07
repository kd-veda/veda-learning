"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Accounts aren't connected yet — this deployment is running in local/guest mode.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardTitle>Create an account</CardTitle>
        {!supabase && (
          <CardDescription className="mt-2 rounded-xl bg-feedback-amber/10 p-3 text-feedback-amber">
            Accounts aren&apos;t connected in this deployment yet. You can still explore everything in{" "}
            <Link href="/onboarding" className="underline">
              guest mode
            </Link>
            .
          </CardDescription>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-maroon-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-maroon-400" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-maroon-500">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={guardianConsent}
              onChange={(e) => setGuardianConsent(e.target.checked)}
            />
            <span>
              I am 18 or older, <strong>or</strong> I am registering this account with a parent/guardian&apos;s
              knowledge and consent. (Placeholder consent step — see docs/LIMITATIONS.md for what a production
              deployment should add here.)
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-feedback-red">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading || !guardianConsent}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-maroon-400">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-600 underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
