import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { NfaFooter } from "@/components/nfa-footer";
import { getDashAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata = {
  title: "Watchlist · Chime",
  description: "Symbols you watch for CSE price and disclosure alerts.",
};

export default async function WatchlistPage() {
  const cfg = getDashAuthConfig();
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const session =
    raw && cfg.sessionSecret
      ? verifySessionToken(raw, cfg.sessionSecret)
      : null;

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppNav active="/watchlist" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Watchlist
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          No symbols yet — add one here once read APIs land, or use{" "}
          <code className="font-mono text-xs">/watch</code> in Telegram.
        </p>
        <p className="mt-8 text-sm text-muted-foreground">
          Signed in as user_id {session.user_id}.{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
        </p>
      </main>
      <NfaFooter />
    </div>
  );
}
