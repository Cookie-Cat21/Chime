import { ChatBubble } from "@/components/kit/chat-bubble";
import { cn } from "@/lib/utils";

/**
 * Product proof panel — daisy chat pattern inside a quiet plane.
 * Cult-style “proof column” without device frames / shader chrome.
 */
export function TelegramProof({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,oklch(0.94_0.01_250_/_0.55),transparent_55%)]"
      />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Live on Telegram
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-foreground motion-safe:animate-pulse"
            />
            Push · tab closed OK
          </span>
        </div>

        <div className="space-y-4">
          <ChatBubble header="Chime CSE" footer="Not financial advice">
            <p className="font-medium">JKH.N0000 crossed above</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
              22.50
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Last 22.75 · rule #184
            </p>
          </ChatBubble>

          <ChatBubble
            align="end"
            header="You"
            className="opacity-90"
            footer="Dash stays the cake"
          >
            <p className="text-sm">Got it — watching disclosures too.</p>
          </ChatBubble>
        </div>
      </div>
    </div>
  );
}
