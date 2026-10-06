import { NextResponse } from "next/server";

/** JSON for the /api/home/* routes: the data is behind sign-in, so it is never stored by a shared cache */
export function homeJson<T>(body: T, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { "Cache-Control": "private, max-age=0, must-revalidate" } });
}

export function badRequest(message: string): NextResponse {
  return homeJson({ error: message }, { status: 400 });
}
