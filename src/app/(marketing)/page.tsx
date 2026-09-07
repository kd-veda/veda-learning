import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function LandingPage() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center gap-3">
        <Image src="/icons/icon-64.png" alt="" width={40} height={40} className="rounded-xl" priority />
        <span className="font-display text-lg text-maroon-700">Veda Learning</span>
      </header>

      <section className="mt-16 flex flex-1 flex-col items-center text-center">
        <h1 className="font-display text-4xl leading-tight text-maroon-700 sm:text-5xl">
          Trace your teacher&apos;s voice,
          <br /> one syllable at a time.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-maroon-500/90">
          A calm, guided space to learn accurate Vedic pronunciation, rhythm and intonation — chanting
          alongside a teacher&apos;s recording, with gentle feedback as you go.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding">
            <Button size="lg">Begin as a guest</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="ghost">
              Sign in
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-maroon-400">
          Guest mode needs no account — everything stays on this device until you choose to save it.
        </p>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          <Card>
            <CardTitle className="text-base">Find your comfortable scale</CardTitle>
            <CardDescription>
              Chant a gentle &ldquo;Om&rdquo; three times and we&apos;ll suggest a comfortable starting scale — B, D or F.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle className="text-base">Tracing-paper practice</CardTitle>
            <CardDescription>
              Words, syllables and svara markings move with the teacher&apos;s voice; your pitch traces alongside it.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle className="text-base">Gentle, honest feedback</CardTitle>
            <CardDescription>
              Colour-coded, encouraging feedback on intonation and timing — never a harsh grade.
            </CardDescription>
          </Card>
        </div>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-maroon-400">
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy &amp; recordings
        </Link>
        <span aria-hidden>·</span>
        <span>Not a substitute for guidance from a qualified teacher.</span>
      </footer>
    </main>
  );
}
