"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import type { AttemptScore, Achievement, PracticeAttempt, UserAchievement } from "@/lib/data/types";

export default function HistoryPage() {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<Array<{ attempt: PracticeAttempt; score: AttemptScore }>>([]);
  const [chantTitles, setChantTitles] = useState<Record<string, string>>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<UserAchievement[]>([]);

  useEffect(() => {
    if (!profile) return;
    const provider = getDataProvider();
    provider.listAttempts(profile.id).then(async (list) => {
      setEntries(list);
      const titles: Record<string, string> = {};
      for (const { attempt } of list) {
        if (titles[attempt.lessonId]) continue;
        const content = await provider.getLessonContent(attempt.lessonId);
        if (content) titles[attempt.lessonId] = content.chant.title;
      }
      setChantTitles(titles);
    });
    provider.listAchievements().then(setAchievements);
    provider.listEarnedAchievements(profile.id).then(setEarned);
  }, [profile]);

  if (!profile) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  return (
    <div className="min-h-dvh bg-ivory">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl text-maroon-700">Practice history</h1>

        <section className="mt-6">
          <h2 className="font-display text-lg text-maroon-700">Achievements</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {achievements.map((a) => {
              const isEarned = earned.some((e) => e.achievementId === a.id);
              return (
                <span
                  key={a.id}
                  title={a.description}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${isEarned ? "bg-saffron-100 text-saffron-700" : "bg-maroon-50 text-maroon-300"}`}
                >
                  <span aria-hidden>{a.icon}</span> {a.title}
                </span>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg text-maroon-700">Attempts</h2>
          {entries.length === 0 ? (
            <CardDescription className="mt-3">No practice attempts yet — open a lesson to begin.</CardDescription>
          ) : (
            <div className="mt-3 space-y-3">
              {entries.map(({ attempt, score }) => (
                <Link key={attempt.id} href={`/lessons/${attempt.lessonId}/attempt/${attempt.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{chantTitles[attempt.lessonId] ?? "Lesson"}</CardTitle>
                        <p className="text-xs text-maroon-400">
                          {new Date(attempt.createdAt).toLocaleString()} · Scale {attempt.scale} · {attempt.mode.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge>{Math.round(score.overall)}% overall</Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
