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
        className="absolute inset-[-8%] opacity-[0.55]"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.92 0.004 250 / 0.55) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.92 0.004 250 / 0.55) 1px, transparent 1px),
            repeating-conic-gradient(
              from 0deg at 0 0,
              oklch(0.94 0.005 250 / 0.55) 0deg 90deg,
              transparent 90deg 180deg
            )
          `,
          backgroundSize: "96px 96px, 96px 96px, 192px 192px",
          backgroundPosition: "0 0, 0 0, 0 0",
        }}
      />
    </div>
  );
}
