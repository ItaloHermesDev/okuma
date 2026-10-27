import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session-crypto";

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";
  const isAdmin = path === "/admin" || path.startsWith("/admin/");

  if (!isAdmin) {
    return NextResponse.next();
  }

  const session = await decrypt(request.cookies.get("session")?.value);

  if (!isLogin && !session?.adminId) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLogin && session?.adminId) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
