"use client";

import { Minus, Plus } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: string };

/**
 * Watermelon faq-3 — numbered accordion FAQ.
 * Strip open-state gradient; lucide +/- instead of react-icons.
 */
export function FaqSection({
  items,
  eyebrow = "FAQ",
  heading = "Questions",
  description,
  className,
}: {
  items: FaqItem[];
  eyebrow?: string;
  heading?: string;
  description?: string;
  className?: string;
}) {
  return (
    <section className={cn("w-full", className)} aria-labelledby="faq-heading">
      <div className="mb-10 flex w-full max-w-xl flex-col sm:mb-12">
        <Badge
          variant="outline"
          className="mb-4 w-fit gap-1.5 rounded-full border-border bg-background px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground"
        >
          <span className="inline-block size-1.5 rounded-full bg-foreground" />
          {eyebrow}
        </Badge>
        <h2
          id="faq-heading"
          className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {heading}
        </h2>
        {description ? (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      <Accordion type="single" collapsible className="flex w-full flex-col gap-2">
        {items.map((item, i) => {
          const num = String(i + 1).padStart(2, "0");
          return (
            <AccordionItem
              key={item.question}
              value={`item-${i}`}
              className="group overflow-hidden border border-border bg-muted/30 transition-colors not-last:border-b hover:bg-muted/50 data-[state=open]:border-border data-[state=open]:bg-muted/60"
            >
              <AccordionTrigger className="flex w-full items-center gap-4 px-5 py-4 hover:no-underline sm:px-6 sm:py-5 [&_[data-slot=accordion-trigger-icon]]:hidden">
                <span className="w-8 shrink-0 text-center font-mono text-xs font-semibold tracking-widest text-muted-foreground/60 tabular-nums group-data-[state=open]:text-muted-foreground">
                  {num}
                </span>
                <span className="flex-1 text-left text-sm font-medium leading-snug text-foreground sm:text-base">
                  {item.question}
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
                  <Plus className="block size-3.5 group-data-[state=open]:hidden" />
                  <Minus className="hidden size-3.5 group-data-[state=open]:block" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pl-[4.25rem] sm:px-6 sm:pb-6">
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {item.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
