import { cn } from "@/lib/utils";

/**
 * Soft checker atmosphere — large filled squares fading at the edges.
 * Matches the koel login/landing brand boards (not a busy hairline grid).
 */
export function HeroGridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={{
        maskImage:
          "radial-gradient(70% 65% at 45% 35%, black 0%, transparent 78%)",
        WebkitMaskImage:
          "radial-gradient(70% 65% at 45% 35%, black 0%, transparent 78%)",
      }}
    >
      <div
        className="absolute inset-[-10%]"
        style={{
          backgroundImage: `repeating-conic-gradient(
            from 0deg at 0 0,
            oklch(0.93 0.006 250 / 0.72) 0deg 90deg,
            transparent 90deg 180deg
          )`,
          backgroundSize: "112px 112px",
          backgroundPosition: "center center",
        }}
      />
    </div>
  );
}
