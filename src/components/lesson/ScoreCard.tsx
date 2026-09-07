import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ScoreBreakdown } from "@/lib/audio/scoring";

export function ScoreCard({ score, message }: { score: ScoreBreakdown; message: string }) {
  return (
    <Card>
      <CardTitle>Your practice result</CardTitle>
      <p className="mt-2 text-sm text-maroon-500">{message}</p>

      <div className="mt-4 space-y-3">
        <ProgressBar label={`Intonation accuracy — ${Math.round(score.intonationAccuracy)}%`} value={score.intonationAccuracy} />
        <ProgressBar label={`Timing accuracy — ${Math.round(score.timingAccuracy)}%`} value={score.timingAccuracy} />
        <ProgressBar label={`Phrase completion — ${Math.round(score.phraseCompletion)}%`} value={score.phraseCompletion} />
        {score.pronunciationSimilarity !== null && (
          <ProgressBar
            label={`Pronunciation guidance (not a grade) — ${Math.round(score.pronunciationSimilarity)}%`}
            value={score.pronunciationSimilarity}
          />
        )}
      </div>

      <div className="mt-5 rounded-xl bg-saffron-50 p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-saffron-700">Overall</p>
        <p className="font-display text-3xl text-saffron-700">{Math.round(score.overall)}%</p>
      </div>

      {score.alignmentConfidence < 0.5 && (
        <p className="mt-3 text-xs text-maroon-400">
          Alignment confidence was low for this attempt — treat these numbers as a rough guide and try once more.
        </p>
      )}
    </Card>
  );
}
