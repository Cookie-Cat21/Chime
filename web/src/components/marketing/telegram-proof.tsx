"use client";

import { TelegramIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Magic UI Animated List + thin phone chrome — pattern only, no Magic UI npm.
 * Below-fold proof: stacked Telegram pings inside a light device frame.
 */

const ALERTS = [
  {
    id: "price",
    title: "JKH.N0000 crossed above 22.50",
    meta: "Last 22.75 · Not financial advice",
    when: "now",
  },
  {
    id: "disclosure",
    title: "New disclosure for COMB.N0000",
    meta: "Filing posted · open in dash",
    when: "2m",
  },
  {
    id: "move",
    title: "DIAL.N0000 daily move 4.2%",
    meta: "Move rule · Not financial advice",
    when: "5m",
  },
] as const;

function AlertCard({
  title,
  meta,
  when,
}: {
  title: string;
  meta: string;
  when: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[oklch(0.16_0.012_260)] px-3.5 py-3 text-white shadow-lg shadow-black/20">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#2AABEE] text-white"
        >
          <HugeiconsIcon icon={TelegramIcon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
              Telegram
            </p>
            <p className="text-[10px] text-white/45">{when}</p>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-white">Quiverly CSE</p>
          <p className="mt-1 text-xs leading-snug text-white/90">{title}</p>
          <p className="mt-1 text-[10px] text-white/50">{meta}</p>
        </div>
      </div>
    </div>
  );
}

export function TelegramProof({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ALERTS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const visible = reduceMotion
    ? ALERTS
    : [ALERTS[index], ALERTS[(index + 1) % ALERTS.length]];

  return (
    <div
      className={cn("relative mx-auto w-full max-w-[280px] sm:max-w-[300px]", className)}
      aria-label="Example Telegram alert notifications"
    >
      <div
        aria-hidden
        className="absolute -inset-x-8 -inset-y-10 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_40%,oklch(0.55_0.04_250_/_0.12)_0%,transparent_72%)]"
      />

      {/* Thin phone chrome — proof band only, not a hero device frame */}
      <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-[oklch(0.12_0.01_260)] shadow-xl shadow-black/10">
        <div className="flex items-center justify-center px-4 pt-3 pb-2">
          <div className="h-1.5 w-16 rounded-full bg-white/15" />
        </div>
        <div className="px-3 pb-1">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[11px] font-medium text-white/80">Telegram</p>
            <p className="text-[10px] text-white/40">Quiverly CSE</p>
          </div>
        </div>

        <div className="relative h-[280px] overflow-hidden px-3 pt-3 pb-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-[oklch(0.12_0.01_260)] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-[oklch(0.12_0.01_260)] to-transparent"
          />

          <ul className="relative flex h-full flex-col justify-end gap-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((alert, i) => (
                <motion.li
                  key={reduceMotion ? alert.id : `${alert.id}-${index}-${i}`}
                  layout
                  initial={
                    reduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                >
                  <AlertCard
                    title={alert.title}
                    meta={alert.meta}
                    when={alert.when}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}
