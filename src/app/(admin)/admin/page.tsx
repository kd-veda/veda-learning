"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getDataProvider } from "@/lib/data/provider";
import type { Course } from "@/lib/data/types";

function AdminDashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    getDataProvider().listAdminCourses().then(setCourses);
  }, []);

  async function createCourse() {
    const provider = getDataProvider();
    const course = await provider.upsertCourse({
      slug: `course-${Date.now()}`,
      title: "New course",
      description: "",
      published: false,
    });
    setCourses((prev) => [...prev, course]);
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-saffron-100 bg-white/70 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Teacher / admin portal</p>
            <h1 className="font-display text-xl text-maroon-700">Content administration</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/config">
              <Button variant="ghost" size="sm">
                Configuration
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Student view
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-maroon-700">Courses</h2>
          <Button size="sm" onClick={createCourse}>
            + New course
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/admin/courses/${course.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${course.published ? "bg-feedback-green/15 text-feedback-green" : "bg-feedback-grey/15 text-feedback-grey"}`}>
                    {course.published ? "Published" : "Draft"}
                  </span>
                </div>
                <CardDescription>{course.description || "No description yet."}</CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
