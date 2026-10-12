import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "PLACEMENT_INCHARGE" | "STUDENT";

function destinationForRole(role: UserRole) {
  return role === "PLACEMENT_INCHARGE" ? "/officer/dashboard" : "/student/dashboard";
}

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  const role = token?.role;
  if (role !== "PLACEMENT_INCHARGE" && role !== "STUDENT") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const expectedRole = request.nextUrl.pathname.startsWith("/officer/")
    ? "PLACEMENT_INCHARGE"
    : "STUDENT";
  if (role !== expectedRole) {
    return NextResponse.redirect(new URL(destinationForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/officer/:path*", "/student/:path*"],
};
