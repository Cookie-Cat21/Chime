import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** HyperUI CTA rhythm — quiet bordered band, default primary. */
export function MidCta({
  telegramHref,
  className,
}: {
  telegramHref: string | null;
  className?: string;
}) {
  const botHref = telegramHref ?? "/login";
  const botExternal = Boolean(telegramHref);

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-card/70 px-6 py-8 sm:px-10 sm:py-10",
        className,
      )}
      aria-labelledby="mid-cta-heading"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Primary surface
          </p>
          <h2
            id="mid-cta-heading"
            className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Alerts fire on Telegram.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The dash is for watchlist and rules. When something crosses, you get
            the ping — even if this tab is closed.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
          >
            {botExternal ? (
              <a href={botHref} target="_blank" rel="noopener noreferrer">
                Open Telegram bot
              </a>
            ) : (
              <Link href={botHref}>Get started</Link>
            )}
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Open the dash</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
