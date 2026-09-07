"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDataProvider } from "@/lib/data/provider";
import type { Chant, Course, Module } from "@/lib/data/types";

function CourseEditorContent({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [chantsByModule, setChantsByModule] = useState<Record<string, Chant[]>>({});

  async function refresh() {
    const provider = getDataProvider();
    const c = await provider.getCourse(courseId);
    setCourse(c);
    const mods = await provider.listModules(courseId);
    setModules(mods);
    const chantMap: Record<string, Chant[]> = {};
    for (const m of mods) chantMap[m.id] = await provider.listChants(m.id);
    setChantsByModule(chantMap);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!course) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  async function saveCourseField<K extends keyof Course>(key: K, value: Course[K]) {
    const provider = getDataProvider();
    const updated = await provider.upsertCourse({ ...course!, [key]: value });
    setCourse(updated);
  }

  async function addModule() {
    const provider = getDataProvider();
    const mod = await provider.upsertModule({ courseId, title: "New module", order: modules.length + 1, published: false });
    setModules((prev) => [...prev, mod]);
    setChantsByModule((prev) => ({ ...prev, [mod.id]: [] }));
  }

  async function addChant(moduleId: string) {
    const provider = getDataProvider();
    const chant = await provider.upsertChant({
      moduleId,
      title: "New chant",
      englishMeaning: "",
      iast: "",
      isPlaceholderContent: true,
      order: (chantsByModule[moduleId]?.length ?? 0) + 1,
      published: false,
    });
    setChantsByModule((prev) => ({ ...prev, [moduleId]: [...(prev[moduleId] ?? []), chant] }));
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-saffron-100 bg-white/70 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/admin" className="text-sm text-teal-600 underline">
            ← All courses
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Card>
          <label className="text-xs font-medium text-maroon-400" htmlFor="course-title">
            Title
          </label>
          <input
            id="course-title"
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-lg font-display"
            value={course.title}
            onChange={(e) => setCourse({ ...course, title: e.target.value })}
            onBlur={(e) => saveCourseField("title", e.target.value)}
          />
          <label className="mt-3 block text-xs font-medium text-maroon-400" htmlFor="course-description">
            Description
          </label>
          <textarea
            id="course-description"
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
            rows={2}
            value={course.description}
            onChange={(e) => setCourse({ ...course, description: e.target.value })}
            onBlur={(e) => saveCourseField("description", e.target.value)}
          />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={course.published} onChange={(e) => saveCourseField("published", e.target.checked)} />
            Published (visible to students)
          </label>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-lg text-maroon-700">Modules</h2>
          <Button size="sm" onClick={addModule}>
            + New module
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {modules.map((mod) => (
            <Card key={mod.id}>
              <CardTitle className="text-base">{mod.title}</CardTitle>
              <ul className="mt-3 space-y-2">
                {(chantsByModule[mod.id] ?? []).map((chant) => (
                  <li key={chant.id} className="flex items-center justify-between rounded-xl bg-saffron-50 px-4 py-2.5">
                    <span className="text-sm font-medium">{chant.title}</span>
                    <Link href={`/admin/chants/${chant.id}`}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="ghost" className="mt-3" onClick={() => addChant(mod.id)}>
                + New chant
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function CourseEditorPage({ params }: { params: { courseId: string } }) {
  return (
    <AdminGuard>
      <CourseEditorContent courseId={params.courseId} />
    </AdminGuard>
  );
}
