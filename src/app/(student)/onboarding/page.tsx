import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function OnboardingIntroPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <Card className="text-center">
        <CardTitle>Welcome</CardTitle>
        <CardDescription className="mt-2 text-base">
          Before your first lesson, we&apos;ll find a comfortable scale to chant in. You&apos;ll chant a gentle
          &ldquo;Om&rdquo; three times, and we&apos;ll suggest a starting point — B, D or F.
        </CardDescription>
        <p className="mt-4 text-sm text-maroon-400">
          This finds your <em>comfortable chanting scale</em>, not your full vocal range — you can always
          change it later from your profile.
        </p>
        <Link href="/onboarding/mic-permission" className="mt-6 block">
          <Button size="lg" className="w-full">
            Continue
          </Button>
        </Link>
      </Card>
    </main>
  );
}
