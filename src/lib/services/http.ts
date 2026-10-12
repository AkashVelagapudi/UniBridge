import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/services/authz";

export function routeError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "This record already exists." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
  }
  console.error("Unhandled API route error:", error);
  return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
}
