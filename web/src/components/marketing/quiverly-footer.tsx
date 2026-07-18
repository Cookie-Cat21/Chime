import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { QuiverlyMark } from "@/components/brand/quiverly-brand";
import { NFA_FOOTER } from "@/lib/nfa";

/**
 * Footer-20 (watermelon.sh registry), adapted for Quiverly: swaps the vendor
 * logo/copy for our brand, drops the placeholder email (no support inbox
 * yet), folds in the NFA disclaimer required near any price-adjacent
 * chrome, drops the original's scroll-triggered fade-in (could settle
 * mid-transition instead of reliably reaching full visibility — not
 * acceptable for legal/Terms links), and swaps the vendor's hardcoded
 * neutral-N and hex colors (plus dark: variants that never activate —
 * this site has no dark-mode toggle) for the same semantic theme tokens
 * (bg-background/text-foreground/border-border) every other page uses.
 */

type FooterLink = { label: string; href: string; external?: boolean };

export function QuiverlyFooter({
  telegramHref,
  className,
}: {
  telegramHref?: string | null;
  className?: string;
}) {
  const product: FooterLink[] = [
    { label: "Home", href: "/" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
  ];
  const legal: FooterLink[] = [
    { label: "Terms", href: "/legal/terms" },
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Sign in", href: "/login" },
  ];
  const elsewhere: FooterLink[] = telegramHref
    ? [{ label: "Telegram", href: telegramHref, external: true }]
    : [];

  return (
    <footer
      className={`relative w-full bg-background text-muted-foreground font-sans overflow-hidden flex flex-col justify-between border-t border-border ${className ?? ""}`}
    >
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 md:px-12 lg:px-16 pt-20 md:pt-32 flex flex-col border-x border-dashed border-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 mb-10 md:mb-16 lg:mb-24">
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 md:gap-8">
            <div className="flex items-center gap-2 text-foreground">
              <QuiverlyMark size="sm" />
              <span className="font-medium tracking-wide text-lg mt-0.5">
                Quiverly
              </span>
            </div>

            <p className="text-[15px] leading-relaxed text-muted-foreground max-w-[320px]">
              Telegram-first CSE alerts. Watch symbols, set rules in a thin
              dash — the ping is the product.
            </p>

            <p className="text-xs leading-relaxed text-muted-foreground/70 max-w-[320px]">
              {NFA_FOOTER}
            </p>

            {telegramHref ? (
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[17px] text-foreground/90 hover:text-foreground transition-colors group mt-2"
              >
                Open Telegram bot
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  size={18}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </a>
            ) : null}
          </div>

          <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-12 lg:gap-8">
            <div className="flex flex-col gap-6">
              <h4 className="font-medium text-foreground">Product</h4>
              <ul className="flex flex-col gap-3">
                {product.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <h4 className="font-medium text-foreground">Legal</h4>
              <ul className="flex flex-col gap-3">
                {legal.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {elsewhere.length > 0 ? (
              <div className="flex flex-col gap-6">
                <h4 className="font-medium text-foreground">Elsewhere</h4>
                <ul className="flex flex-col gap-3">
                  {elsewhere.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noopener noreferrer" : undefined}
                        className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full flex justify-center md:mt-auto pb-0 px-2 opacity-90">
          {/* Large footer wordmark — product name, not the legacy Quiverly paths. */}
          <img
            src="/brand/quiverly-logo.svg"
            alt="quiverly"
            className="w-full max-w-3xl h-auto select-none"
          />
        </div>
      </div>
    </footer>
  );
}
