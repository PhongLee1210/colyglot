import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary hover:bg-primary-700 active:bg-primary-800 dark:hover:bg-primary-500",
        secondary:
          "bg-surface-2 text-fg hover:bg-line active:bg-line-strong border border-line",
        ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
        danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
        success: "bg-success text-white hover:opacity-90",
        warning:
          "bg-warning text-white hover:bg-orange-600 active:bg-orange-700",
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-10 px-4 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "min-h-9 w-9 px-0",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}
