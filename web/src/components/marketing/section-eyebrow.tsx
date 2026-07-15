import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Dinaya / HyperUI section label — 3px rule + tracked caps. */
export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "relative mb-4 pl-3 text-xs font-semibold tracking-[0.18em] text-primary uppercase",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-0 h-3 w-[3px] -translate-y-1/2 rounded-sm bg-primary"
      />
      {children}
    </p>
  );
}
