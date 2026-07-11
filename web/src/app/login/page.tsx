import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { NfaFooter } from "@/components/nfa-footer";
import {
  getDashAuthConfig,
  publicDemoAllowlist,
} from "@/lib/auth/config";

export const metadata = {
  title: "Sign in · Chime",
  description: "Demo sign-in for the Chime CSE alert dashboard.",
};

export default function LoginPage() {
  const cfg = getDashAuthConfig();
  const allowlist = publicDemoAllowlist(cfg);
  const defaultId =
    cfg.defaultTelegramId && cfg.allowlist.has(cfg.defaultTelegramId)
      ? cfg.defaultTelegramId
      : null;

  return (
    <main className="chime-atmosphere flex min-h-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="chime-rise font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          <Link href="/" className="transition-opacity hover:opacity-80">
            Chime
          </Link>
        </p>
        <h1 className="chime-rise chime-rise-delay-1 mt-5 text-xl font-medium text-foreground sm:text-2xl">
          Manage watchlists and alerts
        </h1>
        <p className="chime-rise chime-rise-delay-2 mt-3 text-sm text-muted-foreground sm:text-base">
          Telegram still delivers the push. This dashboard only reads Postgres.
        </p>
        <div className="chime-rise chime-rise-delay-3 mt-8">
          <LoginForm
            allowlist={allowlist}
            defaultTelegramId={defaultId}
            demoEnabled={cfg.demoAuthEnabled}
          />
        </div>
      </div>
      <NfaFooter />
    </main>
  );
}
