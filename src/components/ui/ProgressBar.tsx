"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  return (
    <div className={className}>
      {label && <div className="mb-1 text-xs font-medium text-maroon-500">{label}</div>}
      <ProgressPrimitive.Root
        className="h-3 w-full overflow-hidden rounded-full bg-saffron-100"
        value={value}
        aria-label={label ?? "Progress"}
      >
        <ProgressPrimitive.Indicator
          className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-teal-500 transition-transform duration-500"
          style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
