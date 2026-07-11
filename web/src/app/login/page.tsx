import { LoginForm } from "@/components/login-form";
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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-3xl font-semibold tracking-tight">Chime</p>
          <h1 className="text-lg text-muted-foreground">
            Sign in to manage watchlists and alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Telegram-first CSE alerts. Dashboard reads Postgres only — not
            investment advice.
          </p>
        </header>
        <LoginForm
          allowlist={allowlist}
          defaultTelegramId={defaultId}
          demoEnabled={cfg.demoAuthEnabled}
        />
      </div>
    </main>
  );
}
