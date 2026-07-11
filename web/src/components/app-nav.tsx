import Link from "next/link";

const links = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/alerts", label: "Alerts" },
  { href: "/alerts/history", label: "History" },
] as const;

export function AppNav({ active }: { active?: string }) {
  return (
    <header className="border-b border-border/70 bg-background/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Chime
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((link) => {
            const isActive = active === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
