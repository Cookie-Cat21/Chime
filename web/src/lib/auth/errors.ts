import { NextResponse } from "next/server";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
} as const;

/** Cap error.code so a misbuilt caller cannot balloon JSON egress. */
export const MAX_JSON_ERROR_CODE_LENGTH = 64;

/** Cap error.message (parity with browser apiErrorMessage). */
export const MAX_JSON_ERROR_MESSAGE_LENGTH = 300;

const CTRL_RE = /[\u0000-\u001F\u007F-\u009F]/g;

function sanitizeErrorCode(code: string): string {
  const cleaned = code.replace(CTRL_RE, "").trim();
  if (!cleaned) return "error";
  return cleaned.length > MAX_JSON_ERROR_CODE_LENGTH
    ? cleaned.slice(0, MAX_JSON_ERROR_CODE_LENGTH)
    : cleaned;
}

function sanitizeErrorMessage(message: string): string {
  const cleaned = message.replace(CTRL_RE, "").trim();
  if (!cleaned) return "Request failed.";
  return cleaned.length > MAX_JSON_ERROR_MESSAGE_LENGTH
    ? cleaned.slice(0, MAX_JSON_ERROR_MESSAGE_LENGTH).trimEnd()
    : cleaned;
}

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: sanitizeErrorCode(code),
        message: sanitizeErrorMessage(message),
      },
    },
    { status, headers: JSON_HEADERS },
  );
}

export function jsonOk(
  body: unknown,
  status: number = 200,
): NextResponse {
  return NextResponse.json(body, { status, headers: JSON_HEADERS });
}
