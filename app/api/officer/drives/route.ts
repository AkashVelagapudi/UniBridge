import { Prisma } from "@prisma/client";
import { DRIVE_STATUSES, parseStringList } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { parseDriveInput, toDriveStorage } from "@/lib/services/driveInput";

export async function GET(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const requestedStatus = new URL(request.url).searchParams.get("status");
    if (requestedStatus && !DRIVE_STATUSES.some((status) => status === requestedStatus)) {
      return Response.json({ error: "Drive status filter is invalid." }, { status: 400 });
    }

    const records = await prisma.drive.findMany({
      where: requestedStatus ? { status: requestedStatus } : undefined,
      include: { _count: { select: { applications: true } } },
      orderBy: [{ registrationDeadline: "asc" }, { company: "asc" }],
    });
    return Response.json({
      drives: records.map((drive) => ({
        ...drive,
        eligibleDepartmentIds: parseStringList(drive.eligibleDepartmentIds),
        eligibleBatches: parseStringList(drive.eligibleBatches),
        stages: parseStringList(drive.stages),
      })),
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const parsed = parseDriveInput(await request.json());
    if (!parsed.value) return Response.json({ error: parsed.errors.join(" ") }, { status: 400 });
    const departmentCount = await prisma.department.count({
      where: { id: { in: parsed.value.eligibleDepartmentIds } },
    });
    if (departmentCount !== parsed.value.eligibleDepartmentIds.length) {
      return Response.json({ error: "One or more selected departments do not exist." }, { status: 400 });
    }

    const drive = await prisma.drive.create({ data: toDriveStorage(parsed.value) });
    return Response.json({ drive }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return Response.json({ error: "A selected department no longer exists." }, { status: 400 });
    }
    return authorizationErrorResponse(error);
  }
}