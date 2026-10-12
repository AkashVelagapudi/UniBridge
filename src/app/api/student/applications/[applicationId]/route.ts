import { ApplicationStage, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { routeError } from "@/lib/services/http";

type RouteContext = { params: Promise<{ applicationId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    const { applicationId } = await params;
    const application = await prisma.application.findFirst({
      where: { id: applicationId, studentId: student.id },
      select: { id: true, stage: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const cannotWithdraw = new Set<ApplicationStage>([
      ApplicationStage.SELECTED,
      ApplicationStage.OFFER_RECEIVED,
      ApplicationStage.JOINED,
      ApplicationStage.REJECTED,
      ApplicationStage.WITHDRAWN,
    ]);
    if (cannotWithdraw.has(application.stage)) {
      return NextResponse.json({ error: "This application can no longer be withdrawn." }, { status: 409 });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { stage: ApplicationStage.WITHDRAWN },
      select: { id: true, stage: true, updatedAt: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return routeError(error);
  }
}
