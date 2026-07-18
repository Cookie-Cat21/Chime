"use client";

import { motion, useReducedMotion } from "motion/react";

import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { cn } from "@/lib/utils";

/**
 * Aceternity / Magic UI marquee rhythm — illustrative chat-style reactions.
 * Labeled as demos so we never ship fake customer testimonials.
 */

const REACTIONS = [
  {
    handle: "watcher",
    body: "Got the cross while the laptop was shut. That’s the whole point.",
  },
  {
    handle: "cse_desk",
    body: "Disclosure ping landed before I refreshed cse.lk. Handy.",
  },
  {
    handle: "rules_only",
    body: "Browser-open alerts were useless for me. Telegram actually reaches me.",
  },
  {
    handle: "thin_dash",
    body: "Set the rule once in the dash — don’t need a terminal glued open.",
  },
  {
    handle: "move_watch",
    body: "Daily % move fire during lunch. Closed the tab, still got the message.",
  },
  {
    handle: "nfa_ok",
    body: "Info only — I still check the filing. The ping just means I don’t miss it.",
  },
] as const;

function ReactionCard({
  handle,
  body,
}: {
  handle: string;
  body: string;
}) {
  return (
    <figure className="w-[280px] shrink-0 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:w-[300px]">
      <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold text-foreground"
        >
          {handle.slice(0, 2).toUpperCase()}
        </span>
        <span className="font-medium text-foreground">@{handle}</span>
        <span className="text-muted-foreground/70">· illustrative</span>
      </figcaption>
      <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">
        “{body}”
      </blockquote>
    </figure>
  );
}

function MarqueeRow({
  items,
  reverse,
  paused,
}: {
  items: typeof REACTIONS;
  reverse?: boolean;
  paused: boolean;
}) {
  const sequence = reverse ? [...items].reverse() : [...items];
  return (
    <div className="flex overflow-hidden">
      <motion.div
        className="flex min-w-max gap-3 pe-3"
        animate={paused ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={
          paused
            ? undefined
            : { duration: reverse ? 42 : 36, ease: "linear", repeat: Infinity }
        }
      >
        {[...sequence, ...sequence].map((item, i) => (
          <ReactionCard
            key={`${item.handle}-${i}`}
            handle={item.handle}
            body={item.body}
          />
        ))}
      </motion.div>
    </div>
  );
}

export function CommentMarquee({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className={cn(className)}
      aria-labelledby="reactions-heading"
    >
      <SectionEyebrow>From the chat</SectionEyebrow>
      <h2
        id="reactions-heading"
        className="max-w-xl font-display text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        What the ping is for.
      </h2>
      <p className="mt-3 max-w-xl text-base text-muted-foreground">
        Illustrative reactions — not real customer quotes or endorsements.
        Quiverly is an information tool, not advice.
      </p>

      <div className="relative mt-10 space-y-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-16"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-16"
        />

        {reduceMotion ? (
          <div className="flex flex-wrap justify-center gap-3">
            {REACTIONS.slice(0, 4).map((item) => (
              <ReactionCard
                key={item.handle}
                handle={item.handle}
                body={item.body}
              />
            ))}
          </div>
        ) : (
          <>
            <MarqueeRow items={REACTIONS} paused={false} />
            <MarqueeRow items={REACTIONS} reverse paused={false} />
          </>
        )}
      </div>
    </section>
  );
}
