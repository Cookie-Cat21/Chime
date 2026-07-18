"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { InlineError } from "@/components/inline-error";
import {
  apiErrorMessage,
  CLIENT_API_BODY_MAX_CHARS,
  CLIENT_API_TIMEOUT_MS,
} from "@/lib/api/client-fetch";
import { readBoundedResponseText } from "@/lib/api/read-bounded-text";
import { NFA_INLINE } from "@/lib/nfa";

type Props = {
  botUsername: string;
};

/** Telegram Login Widget auth payload (subset used by POST /auth/telegram). */
type TelegramAuthUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function loginError(message: string) {
  return `${message} ${NFA_INLINE}`;
}

function normalizeBotUsername(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

/**
 * Telegram Login Widget — loads telegram-widget.js with data-onauth, POSTs
 * the auth payload to /api/v1/auth/telegram (session cookies), then /overview.
 */
export function TelegramLoginWidget({ botUsername }: Props) {
  const router = useRouter();
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorId = `telegram_login_error-${reactId}`;

  const bot = normalizeBotUsername(botUsername);

  useEffect(() => {
    if (!bot || !containerRef.current) return;

    // Stable global name for data-onauth (Telegram evaluates it as JS).
    const callbackName = `__chimeOnTelegramAuth_${reactId.replace(/[^a-zA-Z0-9_]/g, "")}`;

    const onAuth = async (user: TelegramAuthUser) => {
      setError(null);
      setPending(true);
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), CLIENT_API_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch("/api/v1/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: user.id,
              first_name: user.first_name,
              ...(user.last_name != null ? { last_name: user.last_name } : {}),
              ...(user.username != null ? { username: user.username } : {}),
              ...(user.photo_url != null ? { photo_url: user.photo_url } : {}),
              auth_date: user.auth_date,
              hash: user.hash,
            }),
            credentials: "same-origin",
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        const bounded = await readBoundedResponseText(
          res,
          CLIENT_API_BODY_MAX_CHARS,
        );
        if (!bounded.ok) {
          setError(
            loginError(
              "Quiverly couldn't sign you in (response too large). Try again.",
            ),
          );
          return;
        }
        let data: unknown = null;
        try {
          data = bounded.text ? JSON.parse(bounded.text) : null;
        } catch {
          data = null;
        }
        if (!res.ok) {
          const apiMsg = apiErrorMessage(data, "");
          const detail = apiMsg
            ? `Quiverly couldn't sign you in: ${apiMsg}`
            : `Quiverly couldn't sign you in (${res.status}). Try again.`;
          setError(loginError(detail));
          return;
        }
        router.push("/overview");
        router.refresh();
      } catch {
        setError(
          loginError(
            "Quiverly couldn't reach the Telegram sign-in endpoint. Try again.",
          ),
        );
      } finally {
        setPending(false);
      }
    };

    (window as unknown as Record<string, unknown>)[callbackName] = onAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);

    const container = containerRef.current;
    container.replaceChildren();
    container.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      container.replaceChildren();
    };
  }, [bot, reactId, router]);

  // Hide cleanly when TELEGRAM_BOT_USERNAME / DASH_TELEGRAM_BOT_USERNAME is
  // unset — never mount telegram-widget.js without a bot (broken embed).
  if (!bot) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <h2
        id="login-telegram-heading"
        className="text-sm font-medium text-foreground"
      >
        Sign in with Telegram
      </h2>
      <p className="text-xs text-muted-foreground">
        Production path — authorize via the official Telegram widget, then land
        on Overview.
      </p>
      <div
        ref={containerRef}
        data-testid="telegram-login-widget"
        aria-busy={pending || undefined}
        className="flex min-h-11 items-center"
      />
      {pending ? (
        <p role="status" className="text-xs text-muted-foreground">
          Signing in…
        </p>
      ) : null}
      <InlineError id={errorId} message={error} />
    </div>
  );
}
