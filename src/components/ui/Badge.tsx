import { cn } from "@/lib/utils";
import type { FeedbackColour } from "@/lib/audio/scoring";

const colourClasses: Record<FeedbackColour, string> = {
  green: "bg-feedback-green/15 text-feedback-green",
  amber: "bg-feedback-amber/15 text-feedback-amber",
  red: "bg-feedback-red/15 text-feedback-red",
  grey: "bg-feedback-grey/15 text-feedback-grey",
};

export function FeedbackBadge({ colour, label }: { colour: FeedbackColour; label: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colourClasses[colour])}>
      {label}
    </span>
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-saffron-100 px-2.5 py-0.5 text-xs font-semibold text-saffron-700", className)}
      {...props}
    />
  );
}
