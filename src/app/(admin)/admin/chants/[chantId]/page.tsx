"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDataProvider } from "@/lib/data/provider";
import type { Chant, Lesson } from "@/lib/data/types";

const LESSON_KINDS: Lesson["kind"][] = [
  "introduction",
  "pronunciation",
  "svara_practice",
  "line_by_line",
  "full_chant",
  "assessment",
];

function ChantEditorContent({ chantId }: { chantId: string }) {
  const [chant, setChant] = useState<Chant | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  async function refresh() {
    const provider = getDataProvider();
    // No direct "getChant" in the interface (it's read via listChants under a module);
    // for the admin editor we can upsert with the same id to fetch-and-update in one call
    // once we have moduleId — but simplest here is to read all admin courses/modules/chants.
    const courses = await provider.listAdminCourses();
    for (const c of courses) {
      const mods = await provider.listModules(c.id);
      for (const m of mods) {
        const chants = await provider.listChants(m.id);
        const found = chants.find((ch) => ch.id === chantId);
        if (found) {
          setChant(found);
          setLessons(await provider.listLessons(chantId));
          return;
        }
      }
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantId]);

  if (!chant) return <p className="p-8 text-center text-maroon-400">Loading…</p>;

  async function saveField<K extends keyof Chant>(key: K, value: Chant[K]) {
    const provider = getDataProvider();
    const updated = await provider.upsertChant({ ...chant!, [key]: value });
    setChant(updated);
  }

  async function addLesson() {
    const provider = getDataProvider();
    const lesson = await provider.upsertLesson({
      chantId,
      kind: "line_by_line",
      title: "New lesson",
      order: lessons.length + 1,
      published: false,
    });
    setLessons((prev) => [...prev, lesson]);
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-saffron-100 bg-white/70 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href="/admin" className="text-sm text-teal-600 underline">
            ← Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Card>
          {chant.isPlaceholderContent && (
            <p className="mb-4 rounded-xl bg-feedback-amber/10 p-3 text-sm text-feedback-amber">
              This chant is marked as placeholder content. Fill in teacher-approved text below, then untick
              &ldquo;Placeholder content&rdquo; once it reflects the approved wording.
            </p>
          )}
          <label className="text-xs font-medium text-maroon-400">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 font-display text-lg"
            value={chant.title}
            onChange={(e) => setChant({ ...chant, title: e.target.value })}
            onBlur={(e) => saveField("title", e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-maroon-400">Subtitle</label>
          <input
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
            value={chant.subtitle ?? ""}
            onChange={(e) => setChant({ ...chant, subtitle: e.target.value })}
            onBlur={(e) => saveField("subtitle", e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-maroon-400">IAST text</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
            rows={2}
            value={chant.iast}
            onChange={(e) => setChant({ ...chant, iast: e.target.value })}
            onBlur={(e) => saveField("iast", e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-maroon-400">Devanāgarī text</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 font-devanagari text-sm"
            rows={2}
            value={chant.devanagari ?? ""}
            onChange={(e) => setChant({ ...chant, devanagari: e.target.value })}
            onBlur={(e) => saveField("devanagari", e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-maroon-400">English meaning</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-saffron-200 px-3 py-2 text-sm"
            rows={2}
            value={chant.englishMeaning}
            onChange={(e) => setChant({ ...chant, englishMeaning: e.target.value })}
            onBlur={(e) => saveField("englishMeaning", e.target.value)}
          />

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={chant.isPlaceholderContent}
                onChange={(e) => saveField("isPlaceholderContent", e.target.checked)}
              />
              Placeholder content
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={chant.published} onChange={(e) => saveField("published", e.target.checked)} />
              Published
            </label>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-display text-lg text-maroon-700">Lessons</h2>
          <Button size="sm" onClick={addLesson}>
            + New lesson
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <select
                    className="rounded-lg border border-saffron-200 px-2 py-1 text-sm"
                    value={lesson.kind}
                    onChange={async (e) => {
                      const provider = getDataProvider();
                      const updated = await provider.upsertLesson({ ...lesson, kind: e.target.value as Lesson["kind"] });
                      setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                    }}
                  >
                    {LESSON_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    className="mt-2 w-full rounded-lg border border-saffron-200 px-3 py-1.5 text-sm"
                    value={lesson.title}
                    onChange={(e) => setLessons((prev) => prev.map((l) => (l.id === lesson.id ? { ...l, title: e.target.value } : l)))}
                    onBlur={async (e) => {
                      const provider = getDataProvider();
                      await provider.upsertLesson({ ...lesson, title: e.target.value });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/admin/chants/${chantId}/align?lessonId=${lesson.id}`}>
                    <Button size="sm" variant="ghost">
                      Align audio &amp; syllables
                    </Button>
                  </Link>
                  <Link href={`/lessons/${lesson.id}`}>
                    <Button size="sm" variant="ghost">
                      Preview as student
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ChantEditorPage({ params }: { params: { chantId: string } }) {
  return (
    <AdminGuard>
      <ChantEditorContent chantId={params.chantId} />
    </AdminGuard>
  );
}
