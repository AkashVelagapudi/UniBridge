import "server-only";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getStudentPageContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== Role.STUDENT) redirect("/officer/dashboard");

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: { department: { select: { id: true, name: true, code: true } } },
  });
  if (!student) redirect("/login?error=profile");
  return student;
}
