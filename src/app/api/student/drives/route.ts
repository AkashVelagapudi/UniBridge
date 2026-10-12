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
    const [applications, drives] = await Promise.all([
      prisma.application.findMany({
        where: { studentId: student.id },
        orderBy: { updatedAt: "desc" },
        include: {
          drive: {
            select: {
              id: true,
              company: true,
              role: true,
              status: true,
              registrationDeadline: true,
              location: true,
            },
          },
          offers: {
            where: { published: true },
            select: { id: true, packageLpa: true, offeredAt: true },
            orderBy: { offeredAt: "desc" },
          },
        },
      }),
      prisma.drive.findMany({
      where: { status: DriveStatus.OPEN, registrationDeadline: { gte: new Date() } },
      orderBy: { registrationDeadline: "asc" },
        select: {
          id: true,
          company: true,
          role: true,
          eligibleDepartmentIds: true,
          eligibleBatches: true,
          minCgpa: true,
          maxBacklogs: true,
          skills: true,
          registrationDeadline: true,
          stages: true,
          location: true,
          packageLpa: true,
        },
      }),
    ]);

    const registered = applications.map((application) => ({
      id: application.id,
      stage: application.resultPublished ? application.stage : "REGISTERED",
      resultPublished: application.resultPublished,
      updatedAt: application.updatedAt,
      drive: application.drive,
      offers: application.resultPublished
        ? application.offers.map((offer) => ({
            id: offer.id,
            packageLpa: offer.packageLpa,
            offeredAt: offer.offeredAt,
            company: application.drive.company,
          }))
        : [],
    }));

    const eligibleOpen = drives.flatMap((drive) => {
      const eligibleDepartmentIds = parseStringList(drive.eligibleDepartmentIds);
      const eligibleBatches = parseStringList(drive.eligibleBatches);
      const isEligible =
          student.registrationStatus === "REGISTERED" &&
          student.eligibilityStatus === "ELIGIBLE" &&
          (!eligibleDepartmentIds.length || eligibleDepartmentIds.includes(student.departmentId)) &&
          (!eligibleBatches.length || eligibleBatches.includes(student.batch));
      return isEligible
        ? [{
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
          }]
        : [];
    });

    return NextResponse.json({ registered, eligibleOpen });
  } catch (error) {
    return routeError(error);
  }
}
