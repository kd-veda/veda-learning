"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import type { AdminRole } from "@/lib/data/types";

/** Gates admin pages behind an admin_roles check; shows a plain "not authorised" card otherwise. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const [role, setRole] = useState<AdminRole | null | "loading">("loading");

  useEffect(() => {
    if (!profile) return;
    getDataProvider().isAdmin(profile.id).then(setRole);
  }, [profile]);

  if (loading || role === "loading") {
    return <p className="p-8 text-center text-maroon-400">Checking access…</p>;
  }

  if (!role) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
        <Card className="text-center">
          <CardTitle>Teacher access required</CardTitle>
          <CardDescription className="mt-2">
            This area is for teachers and administrators. Ask an administrator to grant your account the
            teacher role, or explore the student experience instead.
          </CardDescription>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-teal-600 underline">
            Back to dashboard
          </Link>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}
