import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashAuthConfig, SESSION_COOKIE } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

export default async function HomePage() {
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

  // Watchlist UI lands in a later ticket (E2-D05). Authenticated home is a stub.
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
      <p className="text-3xl font-semibold tracking-tight">Chime</p>
      <p className="text-sm text-muted-foreground">
        Signed in (user_id {session.user_id}). Watchlist UI coming next.
      </p>
      <p className="text-xs text-muted-foreground">Not financial advice.</p>
    </main>
  );
}
