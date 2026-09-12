"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { getDataProvider } from "@/lib/data/provider";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Chant, Course, Lesson, Module } from "@/lib/data/types";

const LESSON_KIND_LABEL: Record<Lesson["kind"], string> = {
  introduction: "Introduction & meaning",
  pronunciation: "Pronunciation",
  svara_practice: "Svara practice",
  line_by_line: "Line-by-line learning",
  full_chant: "Full chanting",
  assessment: "Assessment",
};

export default function CourseOverviewPage({ params }: { params: { courseId: string } }) {
  const { profile } = useProfile();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [chantsByModule, setChantsByModule] = useState<Record<string, Chant[]>>({});
  const [lessonsByChant, setLessonsByChant] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    const provider = getDataProvider();
    (async () => {
      const c = await provider.getCourse(params.courseId);
      setCourse(c);
      const mods = await provider.listModules(params.courseId);
      setModules(mods);
      // Students only ever see published chants — admins use the same listChants
      // call but the admin pages don't filter, so unpublished content stays
      // editable there while staying hidden from students here.
      const chantEntries = (await Promise.all(mods.map((m) => provider.listChants(m.id)))).map((chants) =>
        chants.filter((c) => c.published)
      );
      const chantMap: Record<string, Chant[]> = {};
      mods.forEach((m, i) => (chantMap[m.id] = chantEntries[i]));
      setChantsByModule(chantMap);

      const allChants = chantEntries.flat();
      const lessonEntries = await Promise.all(allChants.map((c2) => provider.listLessons(c2.id)));
      const lessonMap: Record<string, Lesson[]> = {};
      allChants.forEach((c2, i) => (lessonMap[c2.id] = lessonEntries[i]));
      setLessonsByChant(lessonMap);
    })();
  }, [params.courseId]);

  useEffect(() => {
    if (profile && course) {
      getDataProvider().enrol(profile.id, course.id);
    }
  }, [profile, course]);

  if (!profile || !course) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  return (
    <div className="min-h-dvh bg-ivory">
      <AppHeader profile={profile} />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-2xl text-maroon-700">{course.title}</h1>
        <p className="mt-1 text-maroon-500">{course.description}</p>

        {modules.map((mod) => (
          <section key={mod.id} className="mt-8">
            <h2 className="font-display text-lg text-maroon-700">{mod.title}</h2>
            <div className="mt-3 space-y-4">
              {(chantsByModule[mod.id] ?? []).map((chant) => (
                <Card key={chant.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{chant.title}</CardTitle>
                      {chant.subtitle && <CardDescription>{chant.subtitle}</CardDescription>}
                    </div>
                    {chant.isPlaceholderContent && (
                      <span className="whitespace-nowrap rounded-full bg-feedback-amber/15 px-2.5 py-0.5 text-xs font-semibold text-feedback-amber">
                        Placeholder content
                      </span>
                    )}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {(lessonsByChant[chant.id] ?? []).map((lesson) => (
                      <li key={lesson.id} className="flex items-center justify-between rounded-xl bg-saffron-50 px-4 py-2.5">
                        <span className="text-sm font-medium text-maroon-700">{LESSON_KIND_LABEL[lesson.kind]}</span>
                        <Link href={`/lessons/${lesson.id}`}>
                          <Button size="sm">Open</Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
