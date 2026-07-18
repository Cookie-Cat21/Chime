import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { QuiverlyLockup } from "@/components/brand/quiverly-brand";
import { LoginForm } from "@/components/login-form";
import { HeroGridBackdrop } from "@/components/marketing/hero-grid-backdrop";
import { NfaFooter } from "@/components/nfa-footer";
import { NfaInline } from "@/components/nfa-inline";
import { TelegramLoginWidget } from "@/components/telegram-login-widget";
import {
  getDashAuthConfig,
  publicDemoAllowlist,
  SESSION_COOKIE,
} from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in · Quiverly",
  description: "Sign in to the Quiverly CSE dashboard — Telegram alerts on top.",
};

function resolveTelegramBotUsername(): string | null {
  const candidates = [
    process.env.TELEGRAM_BOT_USERNAME,
    process.env.DASH_TELEGRAM_BOT_USERNAME,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string | string[] }>;
}) {
  const cfg = getDashAuthConfig();
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const session =
    raw && cfg.sessionSecret
      ? verifySessionToken(raw, cfg.sessionSecret)
      : null;
  if (session) {
    redirect("/overview");
  }

  const sp = await searchParams;
  const expiredRaw = sp.expired;
  const expiredFlag = Array.isArray(expiredRaw) ? expiredRaw[0] : expiredRaw;
  const sessionExpired = expiredFlag === "1" || expiredFlag === "true";

  const allowlist = publicDemoAllowlist(cfg);
  const defaultId =
    cfg.defaultTelegramId && cfg.allowlist.has(cfg.defaultTelegramId)
      ? cfg.defaultTelegramId
      : null;
  const telegramLoginFlag = process.env.DASH_TELEGRAM_LOGIN === "1";
  const botUsername = resolveTelegramBotUsername();
  // Require a real bot username — flag alone must not render a broken embed.
  const showTelegramWidget =
    telegramLoginFlag && typeof botUsername === "string" && botUsername.length > 0;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="chime-atmosphere relative flex min-h-full flex-1 flex-col"
    >
      <HeroGridBackdrop className="opacity-70" />
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 sm:py-20">
        <div className="chime-rise">
          <Link
            href="/"
            className="inline-flex motion-safe:transition-opacity motion-safe:hover:opacity-80"
            aria-label="Quiverly home"
          >
            <QuiverlyLockup
              size="hero"
              priority
              className="[&_img:last-child]:h-14 [&_img:last-child]:sm:h-16 [&_img:last-child]:md:h-[4.5rem] [&_img:first-child]:h-14 [&_img:first-child]:sm:h-16 [&_img:first-child]:md:h-[4.5rem]"
            />
          </Link>
        </div>

        <h1 className="chime-rise chime-rise-delay-1 mt-10 max-w-md font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-[1.1]">
          CSE alerts on Telegram.
          <span className="mt-2 block text-muted-foreground">
            Dash when you need to manage.
          </span>
        </h1>

        {sessionExpired ? (
          <p
            role="status"
            data-testid="session-expired-notice"
            className="chime-rise chime-rise-delay-1 mt-5 text-sm text-foreground"
          >
            Your session expired. Sign in again to open the dashboard.
          </p>
        ) : null}

        <div className="chime-rise chime-rise-delay-2 mt-10 max-w-sm rounded-xl border border-border/70 bg-background/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-6">
            {showTelegramWidget ? (
              <section aria-labelledby="login-telegram-heading">
                <TelegramLoginWidget botUsername={botUsername} />
              </section>
            ) : null}
            {showTelegramWidget && cfg.demoAuthEnabled ? (
              <div
                className="flex items-center gap-3"
                role="separator"
                aria-label="Or use demo sign-in"
              >
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Or demo
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            {cfg.demoAuthEnabled ? (
              <section aria-labelledby="login-demo-heading">
                <h2
                  id="login-demo-heading"
                  className="mb-3 text-sm font-medium text-foreground"
                >
                  {showTelegramWidget
                    ? "Demo access (allowlisted IDs)"
                    : "Sign in with demo ID"}
                </h2>
                <LoginForm
                  allowlist={allowlist}
                  defaultTelegramId={defaultId}
                  demoEnabled={cfg.demoAuthEnabled}
                  headingVisible={false}
                />
              </section>
            ) : null}
            {!showTelegramWidget && !cfg.demoAuthEnabled ? (
              <p role="status" className="text-sm text-muted-foreground">
                Demo sign-in is off. Set{" "}
                <code className="font-mono text-xs">DASH_DEMO_AUTH=1</code> or
                enable Telegram Login (
                <code className="font-mono text-xs">DASH_TELEGRAM_LOGIN=1</code>{" "}
                + bot username) for dashboard access.
              </p>
            ) : null}
          </div>
        </div>

        <p
          id="login-explainer"
          className="chime-rise chime-rise-delay-3 mt-10 max-w-md text-base leading-relaxed text-muted-foreground"
        >
          Browse the market, watch symbols, and manage rules here. Telegram is
          the cherry — you still get the ping when a rule fires with the tab
          closed.
        </p>

        <ul
          className="chime-rise chime-rise-delay-3 mt-6 max-w-md list-disc space-y-2.5 pl-5 text-sm text-muted-foreground"
          aria-labelledby="login-explainer"
        >
          <li>Overview of movers, watchlist, and armed rules</li>
          <li>Price, move, and disclosure alerts</li>
          <li>Push on Telegram when something matches</li>
        </ul>

        <NfaInline className="chime-rise chime-rise-delay-3 mt-5" />
      </div>
      <div className="relative">
        <NfaFooter />
      </div>
    </main>
  );
}
