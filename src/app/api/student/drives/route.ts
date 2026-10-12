import { DriveStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { parseStringList } from "@/lib/services/json";
import { routeError } from "@/lib/services/http";

export async function GET() {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    const drives = await prisma.drive.findMany({
      where: { status: DriveStatus.OPEN, registrationDeadline: { gte: new Date() } },
      orderBy: { registrationDeadline: "asc" },
      include: {
        applications: {
          where: { studentId: student.id },
          select: { id: true, stage: true, resultPublished: true },
          take: 1,
        },
      },
    });

    return NextResponse.json(drives.map((drive) => {
      const eligibleDepartmentIds = parseStringList(drive.eligibleDepartmentIds);
      const eligibleBatches = parseStringList(drive.eligibleBatches);
      return {
        id: drive.id,
        company: drive.company,
        role: drive.role,
        eligibleDepartmentIds,
        eligibleBatches,
        minCgpa: drive.minCgpa,
        maxBacklogs: drive.maxBacklogs,
        skills: drive.skills,
        registrationDeadline: drive.registrationDeadline,
        stages: parseStringList(drive.stages),
        location: drive.location,
        packageLpa: drive.packageLpa,
        isEligible:
          student.registrationStatus === "REGISTERED" &&
          student.eligibilityStatus === "ELIGIBLE" &&
          (!eligibleDepartmentIds.length || eligibleDepartmentIds.includes(student.departmentId)) &&
          (!eligibleBatches.length || eligibleBatches.includes(student.batch)),
        application: drive.applications[0]
          ? {
              id: drive.applications[0].id,
              stage: drive.applications[0].resultPublished
                ? drive.applications[0].stage
                : "REGISTERED",
            }
          : null,
      };
    }));
  } catch (error) {
    return routeError(error);
  }
}
