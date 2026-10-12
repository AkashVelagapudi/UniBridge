import "server-only";

import { Role, type Student } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireRole(role: Role): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthorizationError("Authentication required.", 401);
  }
  if (session.user.role !== role) {
    throw new AuthorizationError("You do not have access to this resource.", 403);
  }
  return session;
}

export async function requireOwnStudent(session: Session): Promise<Student> {
  if (session.user.role !== Role.STUDENT) {
    throw new AuthorizationError("Student access required.", 403);
  }
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });
  if (!student) {
    throw new AuthorizationError("No student profile is linked to this account.", 404);
  }
  return student;
}
