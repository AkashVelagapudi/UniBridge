import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/services/authz";
import { routeError } from "@/lib/services/http";

async function unimplementedOfficerEndpoint() {
  try {
    await requireRole(Role.PLACEMENT_INCHARGE);
    return NextResponse.json({ error: "Officer API endpoint not found." }, { status: 404 });
  } catch (error) {
    return routeError(error);
  }
}

export const GET = unimplementedOfficerEndpoint;
export const POST = unimplementedOfficerEndpoint;
export const PUT = unimplementedOfficerEndpoint;
export const PATCH = unimplementedOfficerEndpoint;
export const DELETE = unimplementedOfficerEndpoint;
