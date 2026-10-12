import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/domain";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireRole(role: Role): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new AuthorizationError("Authentication required", 401);
  if (session.user.role !== role) throw new AuthorizationError("Forbidden", 403);
  return session;
}

export function requireOwnStudent(session: Session): string {
  if (session.user.role !== "STUDENT" || !session.user.studentId) {
    throw new AuthorizationError("Student account required", 403);
  }
  return session.user.studentId;
}

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}