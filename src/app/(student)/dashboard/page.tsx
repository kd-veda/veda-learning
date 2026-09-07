"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Course, PracticeStreak, ScaleCalibration, AdminRole } from "@/lib/data/types";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DashboardPage() {
  const { profile, loading } = useProfile();
  const [courses, setCourses] = useState<Course[]>([]);
  const [streak, setStreak] = useState<PracticeStreak | null>(null);
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    if (!profile) return;
    const provider = getDataProvider();
    provider.listPublishedCourses().then(setCourses);
    provider.getStreak(profile.id).then(setStreak);
    provider.getLatestCalibration(profile.id).then(setCalibration);
    provider.isAdmin(profile.id).then(setAdminRole);
  }, [profile]);

  if (loading || !profile) {
    return <p className="p-8 text-center text-maroon-400">Loading your dashboard…</p>;
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl text-maroon-700">Namaste, {profile.displayName}</h1>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle className="text-base">Practice streak</CardTitle>
            <p className="mt-2 font-display text-3xl text-saffron-600">{streak?.currentStreakDays ?? 0} days</p>
            <CardDescription>Longest streak: {streak?.longestStreakDays ?? 0} days</CardDescription>
          </Card>
          <Card>
            <CardTitle className="text-base">Your scale</CardTitle>
            {calibration ? (
              <>
                <p className="mt-2 font-display text-3xl text-teal-600">Scale {calibration.selectedScale}</p>
                <CardDescription>
                  From note {calibration.detectedPitchClass}
                  {calibration.isManualOverride ? " (manual)" : ""}
                </CardDescription>
              </>
            ) : (
              <>
                <CardDescription className="mt-2">Not calibrated yet.</CardDescription>
                <Link href="/onboarding" className="mt-2 inline-block text-sm text-teal-600 underline">
                  Calibrate now
                </Link>
              </>
            )}
          </Card>
          <Card>
            <CardTitle className="text-base">History &amp; achievements</CardTitle>
            <Link href="/history" className="mt-2 inline-block text-sm text-teal-600 underline">
              View practice history
            </Link>
          </Card>
        </div>

        <h2 className="mt-10 font-display text-xl text-maroon-700">Courses</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </Card>
            </Link>
          ))}
        </div>

        {adminRole && (
          <div className="mt-10">
            <Badge>Teacher access</Badge>
            <p className="mt-2 text-sm text-maroon-500">
              You have admin access.{" "}
              <Link href="/admin" className="text-teal-600 underline">
                Open the admin portal
              </Link>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
