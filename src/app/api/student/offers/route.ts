import { ApplicationStage, DriveStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { routeError } from "@/lib/services/http";

export async function GET() {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    const offers = await prisma.offer.findMany({
      where: {
        published: true,
        application: {
          studentId: student.id,
          resultPublished: true,
          stage: { notIn: [ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] },
          drive: { status: { not: DriveStatus.CANCELLED } },
        },
      },
      orderBy: { offeredAt: "desc" },
      select: {
        id: true,
        packageLpa: true,
        offeredAt: true,
        application: {
          select: { drive: { select: { company: true, role: true, location: true } } },
        },
      },
    });
    return NextResponse.json(offers);
  } catch (error) {
    return routeError(error);
  }
}
