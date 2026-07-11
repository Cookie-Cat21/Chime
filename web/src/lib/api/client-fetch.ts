import { CSRF_COOKIE } from "@/lib/auth/config";

/** Must match server `CSRF_HEADER` / guard double-submit check. */
const CSRF_HEADER = "x-csrf-token";

/** Read non-HttpOnly CSRF cookie for double-submit mutations. */
export function readBrowserCsrf(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${CSRF_COOKIE}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

/**
 * Browser mutation against /api/v1 with credentials + X-CSRF-Token.
 * Login is the only CSRF-exempt mutation — do not use this for demo auth.
 */
export async function apiMutate(
  path: string,
  init: {
    method: "POST" | "DELETE" | "PUT" | "PATCH";
    body?: unknown;
  },
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const csrf = readBrowserCsrf();
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (csrf) {
    headers.set(CSRF_HEADER, csrf);
  }
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    method: init.method,
    headers,
    credentials: "same-origin",
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
}

export function apiErrorMessage(
  data: unknown,
  fallback: string,
): string {
  const body = data as ApiErrorBody | null;
  return body?.error?.message ?? fallback;
}
