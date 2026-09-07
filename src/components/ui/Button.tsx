import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-saffron-500 text-white hover:bg-saffron-600 focus-visible:outline-saffron-700",
  secondary: "bg-teal-500 text-white hover:bg-teal-600 focus-visible:outline-teal-600",
  ghost: "bg-transparent text-maroon-600 hover:bg-saffron-50 border border-saffron-200",
  danger: "bg-feedback-red text-white hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "text-base px-5 py-2.5 rounded-xl",
  lg: "text-lg px-7 py-3.5 rounded-2xl",
};

/** Large-target, accessible button used throughout the student experience — big buttons per the spec's UX direction. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
