import { NextResponse } from "next/server";

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
