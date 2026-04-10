import { PUBLIC_ROUTES, ROLE_HOME, ROLE_PREFIX } from "@/lib/auth/access";
import type { Role } from "@/lib/types";
import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";

export function appProxy(req: NextAuthRequest) {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as Role | undefined;

  if (role && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIX)) {
    if (pathname.startsWith(prefix) && role !== requiredRole) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
  }

  return NextResponse.next();
}