import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { evaluateDriveEligibility } from "@/lib/services/driveEligibility";

export async function POST(request: Request, context: { params: Promise<{ driveId: string }> }) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const { driveId } = await context.params;
    const body: unknown = await request.json();
    const studentIdsInput = body && typeof body === "object" && "studentIds" in body
      ? (body as { studentIds?: unknown }).studentIds
      : undefined;
    if (!Array.isArray(studentIdsInput) || studentIdsInput.length === 0 || studentIdsInput.length > 500) {
      return Response.json({ error: "Select between 1 and 500 students." }, { status: 400 });
    }
    const studentIds = [...new Set(studentIdsInput.map((id) => String(id).trim()).filter(Boolean))];
    if (studentIds.length === 0) return Response.json({ error: "Select at least one student." }, { status: 400 });

    const drive = await prisma.drive.findUnique({ where: { id: driveId } });
    if (!drive) return Response.json({ error: "Drive not found." }, { status: 404 });
    if (drive.status !== "OPEN") {
      return Response.json({ error: "Only open drives accept registrations." }, { status: 409 });
    }
    if (drive.registrationDeadline <= new Date()) {
      return Response.json({ error: "The registration deadline has passed." }, { status: 409 });
    }

    const [students, applications] = await Promise.all([
      prisma.student.findMany({ where: { id: { in: studentIds } } }),
      prisma.application.findMany({ where: { driveId, studentId: { in: studentIds } }, select: { studentId: true } }),
    ]);
    const studentById = new Map(students.map((student) => [student.id, student]));
    const alreadyRegistered = new Set(applications.map((application) => application.studentId));
    const results: { studentId: string; status: "Registered" | "Skipped" | "Ineligible" | "Failed"; message: string }[] = [];
    let registered = 0;
    let skipped = 0;
    let ineligible = 0;
    let failed = 0;

    for (const studentId of studentIds) {
      const student = studentById.get(studentId);
      if (!student) {
        failed += 1;
        results.push({ studentId, status: "Failed", message: "Student record not found." });
        continue;
      }
      if (alreadyRegistered.has(studentId)) {
        skipped += 1;
        results.push({ studentId, status: "Skipped", message: "Already registered for this drive." });
        continue;
      }

      const eligibility = evaluateDriveEligibility(student, drive);
      if (!eligibility.eligible) {
        ineligible += 1;
        results.push({ studentId, status: "Ineligible", message: eligibility.reasons.join(" ") });
        continue;
      }

      try {
        await prisma.application.create({
          data: { studentId, driveId, stage: "REGISTERED", resultPublished: false },
        });
        alreadyRegistered.add(studentId);
        registered += 1;
        results.push({ studentId, status: "Registered", message: "Student registered for the drive." });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          skipped += 1;
          results.push({ studentId, status: "Skipped", message: "Already registered for this drive." });
        } else {
          failed += 1;
          results.push({ studentId, status: "Failed", message: "Registration could not be saved." });
        }
      }
    }

    return Response.json({ summary: { registered, skipped, ineligible, failed }, results });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}