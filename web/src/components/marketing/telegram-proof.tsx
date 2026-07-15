import { ChatBubble } from "@/components/kit/chat-bubble";
import { cn } from "@/lib/utils";

/**
 * Product proof — daisy chat inside a quiet plane.
 * Cult-style proof column without device frames / accent rails.
 */
export function TelegramProof({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Live on Telegram
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-foreground/70 motion-safe:animate-pulse"
          />
          Push · tab closed OK
        </span>
      </div>

      <ChatBubble
        header={
          <span className="flex w-full items-baseline justify-between gap-3">
            <span>Chime CSE</span>
            <span className="font-normal">09:31 SLT</span>
          </span>
        }
        footer="Delivered · Not financial advice"
      >
        <p className="font-medium">JKH.N0000 crossed above</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-tight tabular-nums">
          22.50
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Last 22.75 · rule #184
        </p>
      </ChatBubble>
    </div>
  );
}
