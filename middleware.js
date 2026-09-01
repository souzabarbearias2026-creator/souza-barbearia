import { NextResponse } from "next/server";

// Protege o sistema com uma senha única (APP_PASSWORD). Suficiente pra um uso
// interno de uma pessoa só; se um dia mais gente for acessar, vale trocar por
// autenticação de verdade (ex: Supabase Auth).
export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next");

  if (isPublic) return NextResponse.next();

  const cookie = request.cookies.get("barbearia_auth")?.value;
  const isAuthed = cookie && cookie === process.env.APP_PASSWORD;

  if (!isAuthed) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
