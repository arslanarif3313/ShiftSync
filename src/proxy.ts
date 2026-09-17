import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleHome: Record<string, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  STAFF: "/staff",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;
  const isLogin = pathname.startsWith("/login");
  const isPublic = isLogin || pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome[token.role as string] ?? "/";
    return NextResponse.redirect(url);
  }

  // Role gates
  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome[token?.role as string] ?? "/login", req.url));
  }
  if (pathname.startsWith("/manager") && token?.role !== "MANAGER" && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome[token?.role as string] ?? "/login", req.url));
  }
  if (pathname.startsWith("/staff") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};