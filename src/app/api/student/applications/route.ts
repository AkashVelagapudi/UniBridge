import {
  ApplicationStage,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
  Role,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { parseStringList } from "@/lib/services/json";
import { routeError } from "@/lib/services/http";

const registerSchema = z.object({ driveId: z.string().min(1) });

export async function GET() {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    const applications = await prisma.application.findMany({
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
            packageLpa: true,
          },
        },
        offers: {
          where: { published: true },
          select: {
            id: true,
            packageLpa: true,
            offeredAt: true,
          },
          orderBy: { offeredAt: "desc" },
        },
      },
    });
    return NextResponse.json(applications.map((application) => {
      const { resultPublished, offers, ...safeApplication } = application;
      return {
        ...safeApplication,
        resultPublished,
        stage: resultPublished ? application.stage : ApplicationStage.REGISTERED,
        offers: resultPublished
          ? offers.map((offer) => ({
              ...offer,
              company: application.drive.company,
            }))
          : [],
      };
    }));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
      }
      throw error;
    }
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid driveId is required." }, { status: 400 });
    }

    if (
      student.registrationStatus !== RegistrationStatus.REGISTERED ||
      student.eligibilityStatus !== EligibilityStatus.ELIGIBLE
    ) {
      return NextResponse.json(
        { error: "Only registered, eligible students can apply to placement drives." },
        { status: 403 },
      );
    }

    const drive = await prisma.drive.findUnique({ where: { id: parsed.data.driveId } });
    if (!drive || drive.status !== DriveStatus.OPEN || drive.registrationDeadline < new Date()) {
      return NextResponse.json({ error: "This placement drive is not open for registration." }, { status: 409 });
    }

    const eligibleDepartments = parseStringList(drive.eligibleDepartmentIds);
    const eligibleBatches = parseStringList(drive.eligibleBatches);
    if (
      (eligibleDepartments.length > 0 && !eligibleDepartments.includes(student.departmentId)) ||
      (eligibleBatches.length > 0 && !eligibleBatches.includes(student.batch))
    ) {
      return NextResponse.json({ error: "You are not eligible for this placement drive." }, { status: 403 });
    }

    const existing = await prisma.application.findUnique({
      where: { studentId_driveId: { studentId: student.id, driveId: drive.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already applied to this drive." }, { status: 409 });
    }

    const application = await prisma.application.create({
      data: {
        studentId: student.id,
        driveId: drive.id,
        stage: ApplicationStage.REGISTERED,
        resultPublished: false,
      },
      select: { id: true, stage: true, updatedAt: true },
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
