import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { routeError } from "@/lib/services/http";

export async function GET() {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    return NextResponse.json({
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      email: student.email,
      program: student.program,
      year: student.year,
      section: student.section,
      batch: student.batch,
      registrationStatus: student.registrationStatus,
      eligibilityStatus: student.eligibilityStatus,
      departmentId: student.departmentId,
    });
  } catch (error) {
    return routeError(error);
  }
}
