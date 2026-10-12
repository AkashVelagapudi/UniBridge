import { parseStringList } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { evaluateDriveEligibility } from "@/lib/services/driveEligibility";

export async function GET(_request: Request, context: { params: Promise<{ driveId: string }> }) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const { driveId } = await context.params;
    const drive = await prisma.drive.findUnique({ where: { id: driveId } });
    if (!drive) return Response.json({ error: "Drive not found." }, { status: 404 });

    const departmentIds = parseStringList(drive.eligibleDepartmentIds);
    const batches = parseStringList(drive.eligibleBatches);
    if (!departmentIds.length || !batches.length) return Response.json({ students: [] });

    const students = await prisma.student.findMany({
      where: {
        registrationStatus: "REGISTERED",
        departmentId: { in: departmentIds },
        batch: { in: batches },
      },
      select: {
        id: true,
        rollNo: true,
        name: true,
        email: true,
        departmentId: true,
        batch: true,
        cgpa: true,
        backlogs: true,
        skills: true,
        registrationStatus: true,
        eligibilityStatus: true,
        department: { select: { id: true, code: true, name: true } },
        applications: { where: { driveId }, select: { id: true, stage: true } },
      },
      orderBy: [{ department: { name: "asc" } }, { rollNo: "asc" }],
      take: 500,
    });

    return Response.json({
      students: students.map((student) => ({
        ...student,
        isRegistered: student.applications.length > 0,
        eligibility: evaluateDriveEligibility(student, drive),
      })),
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}