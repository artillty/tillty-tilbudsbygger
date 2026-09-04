import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, isValidToken } from "./lib/auth";

export default async function proxy(req: NextRequest) {
  const ok = await isValidToken(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Alt undtagen login-siden, auth-endpointet og Next's egne statiske filer.
  // Byggeren i public/bygger ligger BAG låsen — den indeholder prislisten.
  // Undtaget er kun brandfontene, så login-siden kan se rigtig ud; fontfiler
  // er ikke hemmelige, priserne i js/data.js er.
  matcher: [
    "/((?!login|api/auth|bygger/fonts|bygger/css/fonts.css|_next/static|_next/image|favicon|apple-touch-icon).*)",
  ],
};
