"use client";

import { TelegramIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bell, LineChart } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Magic UI Animated Beam rhythm — CSE → Quiverly → Telegram.
 * In-tree SVG + motion dash; slate ink (no purple glow).
 */
const NODES = [
  { id: "cse", label: "CSE data", Icon: LineChart },
  { id: "q", label: "Quiverly", Icon: Bell },
  { id: "tg", label: "Telegram", Icon: null },
] as const;

export function SignalPath({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative mt-10 overflow-hidden rounded-2xl border border-border/70 bg-card/40 px-4 py-8 sm:px-8",
        className,
      )}
      aria-label="Signal path from CSE data through Quiverly to Telegram"
    >
      <div className="relative mx-auto grid max-w-2xl grid-cols-3 items-start gap-2 sm:gap-4">
        {/* Beams behind nodes */}
        <svg
          className="pointer-events-none absolute top-[22px] right-[16%] left-[16%] h-2 overflow-visible"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1="0"
            y1="4"
            x2="100"
            y2="4"
            className="stroke-border"
            strokeWidth="1.5"
          />
          <motion.line
            x1="0"
            y1="4"
            x2="100"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-foreground/70"
            strokeDasharray="8 12"
            initial={{ strokeDashoffset: 0 }}
            animate={
              reduceMotion ? undefined : { strokeDashoffset: [0, -40] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.4, repeat: Infinity, ease: "linear" }
            }
          />
        </svg>

        {NODES.map((node) => (
          <div
            key={node.id}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            {node.id === "tg" ? (
              <div className="flex size-11 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-sm sm:size-12">
                <HugeiconsIcon icon={TelegramIcon} size={22} />
              </div>
            ) : (
              <div className="flex size-11 items-center justify-center rounded-full border border-border bg-background shadow-sm sm:size-12">
                <node.Icon className="size-5 text-foreground" aria-hidden />
              </div>
            )}
            <p className="text-center text-xs font-medium text-foreground sm:text-sm">
              {node.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted-foreground">
        Public CSE JSON in → rules evaluate → Telegram out. No tip language.
      </p>
    </div>
  );
}
