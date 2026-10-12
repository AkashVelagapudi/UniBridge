import { Prisma } from "@prisma/client";
import { parseStringList } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { parseDriveInput, toDriveStorage } from "@/lib/services/driveInput";

export async function GET(_request: Request, context: { params: Promise<{ driveId: string }> }) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const { driveId } = await context.params;
    const drive = await prisma.drive.findUnique({
      where: { id: driveId },
      include: {
        applications: {
          orderBy: { student: { rollNo: "asc" } },
          select: {
            id: true,
            stage: true,
            resultPublished: true,
            updatedAt: true,
            student: {
              select: {
                id: true,
                rollNo: true,
                name: true,
                email: true,
                department: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!drive) return Response.json({ error: "Drive not found." }, { status: 404 });

    return Response.json({
      drive: {
        ...drive,
        eligibleDepartmentIds: parseStringList(drive.eligibleDepartmentIds),
        eligibleBatches: parseStringList(drive.eligibleBatches),
        stages: parseStringList(drive.stages),
      },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ driveId: string }> }) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const { driveId } = await context.params;
    const parsed = parseDriveInput(await request.json());
    if (!parsed.value) return Response.json({ error: parsed.errors.join(" ") }, { status: 400 });
    const departmentCount = await prisma.department.count({
      where: { id: { in: parsed.value.eligibleDepartmentIds } },
    });
    if (departmentCount !== parsed.value.eligibleDepartmentIds.length) {
      return Response.json({ error: "One or more selected departments do not exist." }, { status: 400 });
    }

    const drive = await prisma.drive.update({
      where: { id: driveId },
      data: toDriveStorage(parsed.value),
    });
    return Response.json({ drive });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return Response.json({ error: "Drive not found." }, { status: 404 });
    }
    return authorizationErrorResponse(error);
  }
}