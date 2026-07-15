import { cn } from "@/lib/utils";

/**
 * Large iPhone top — meant to be hard-clipped by the proof band’s bottom edge
 * (`overflow-hidden` on the section). No soft fade; cut where the colour ends.
 */
export function TelegramProof({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[280px] sm:w-[320px] lg:w-[340px] lg:ml-auto lg:mr-6",
        className,
      )}
      aria-label="Example Telegram alert notification on a phone"
    >
      {/* Bezel — tall; parent section clips the bottom */}
      <div className="rounded-[2.6rem] border border-foreground/20 bg-foreground p-[9px] shadow-sm">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2.1rem] bg-[oklch(0.14_0.012_260)] text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-5%,oklch(0.3_0.02_250)_0%,transparent_50%)]"
          />

          <div className="relative px-4 pt-4">
            {/* Dynamic Island */}
            <div className="mx-auto mb-3 h-[26px] w-[6.25rem] rounded-full bg-black" />

            {/* Status row */}
            <div className="mb-5 flex items-center justify-between px-1 text-[11px] font-medium tracking-wide text-white/80">
              <span>09:31</span>
              <span className="flex items-center gap-1.5" aria-hidden>
                <span className="inline-block h-1.5 w-3.5 rounded-sm bg-white/70" />
                <span className="inline-block h-2 w-2 rounded-full bg-white/70" />
                <span className="inline-block h-2.5 w-[18px] rounded-sm border border-white/70">
                  <span className="ml-px block h-full w-3 rounded-[1px] bg-white/70" />
                </span>
              </span>
            </div>

            {/* Lock-screen notification */}
            <div className="rounded-[1.25rem] border border-white/12 bg-white/[0.16] px-3.5 py-3 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#2AABEE] text-[11px] font-bold tracking-tight text-white"
                >
                  TG
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold tracking-wide text-white/90 uppercase">
                      Telegram
                    </p>
                    <p className="text-[11px] text-white/55">now</p>
                  </div>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">
                    Chime CSE
                  </p>
                  <p className="mt-1.5 text-[13px] leading-snug text-white/88">
                    JKH.N0000 crossed above{" "}
                    <span className="font-mono font-semibold tabular-nums">
                      22.50
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] text-white/50">
                    Last 22.75 · Not financial advice
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
