import Link from "next/link";

import {
  AlertCreateForm,
  CancelAlertButton,
} from "@/components/alert-controls";
import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { NfaFooter } from "@/components/nfa-footer";
import { NfaInline } from "@/components/nfa-inline";
import { Button } from "@/components/ui/button";
import { serverApiGet } from "@/lib/api/server-fetch";
import { requirePageSession } from "@/lib/auth/page-session";
import { alertTypeLabel, formatNumber, formatTs } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alerts · Chime",
  description: "Active alert rules for your Chime watchlist.",
};

type AlertsPayload = {
  rules: {
    id: number;
    symbol: string;
    type: string;
    threshold: number | null;
    active: boolean;
    armed: boolean;
    created_at: string | null;
  }[];
};

export default async function AlertsPage() {
  await requirePageSession();

  const res = await serverApiGet("/api/v1/alerts");
  const payload: AlertsPayload | null = res.ok
    ? ((await res.json()) as AlertsPayload)
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppNav active="/alerts" />
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Alerts
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Active rules. Creating an alert also adds the symbol to your
          watchlist. Pushes still go to Telegram.
        </p>

        <AlertCreateForm />

        {!payload ? (
          <EmptyState
            title="Couldn’t load alerts"
            description={
              <>
                Chime couldn’t fetch your rules right now. Refresh in a moment,
                or set alerts with{" "}
                <code className="font-mono text-xs">
                  /alert SYMBOL above PRICE
                </code>{" "}
                in Telegram.
              </>
            }
            action={
              <Button asChild variant="outline">
                <Link href="/alerts">Try again</Link>
              </Button>
            }
          />
        ) : payload.rules.length === 0 ? (
          <EmptyState
            title="No active alerts"
            description={
              <>
                Create a rule above — price cross, daily move, or new
                disclosure. Same as{" "}
                <code className="font-mono text-xs">
                  /alert SYMBOL above PRICE
                </code>{" "}
                in Telegram; Chime pings you when it fires.
              </>
            }
            action={
              <Button asChild variant="outline">
                <a href="#alert_symbol">Create an alert</a>
              </Button>
            }
          />
        ) : (
          <ul className="mt-8 divide-y divide-border/60">
            {payload.rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/symbols/${encodeURIComponent(rule.symbol)}`}
                    className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {rule.symbol}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    #{rule.id} · {alertTypeLabel(rule.type)}
                    {rule.threshold != null
                      ? ` · ${formatNumber(rule.threshold)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rule.armed ? "Armed" : "Disarmed"} ·{" "}
                    {formatTs(rule.created_at)}
                  </p>
                </div>
                <CancelAlertButton ruleId={rule.id} />
              </li>
            ))}
          </ul>
        )}

        <NfaInline className="mt-8" />
      </main>
      <NfaFooter />
    </div>
  );
}
