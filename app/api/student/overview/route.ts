import { authorizationErrorResponse, requireOwnStudent, requireRole } from "@/lib/services/authz";
import { getOverallStatus } from "@/lib/services/noDues";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireRole("STUDENT");
    const studentId = requireOwnStudent(session);
    const [student, overallClearance] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          rollNo: true,
          name: true,
          email: true,
          program: true,
          year: true,
          section: true,
          batch: true,
          registrationStatus: true,
          eligibilityStatus: true,
          department: { select: { name: true, code: true } },
          applications: {
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              stage: true,
              resultPublished: true,
              updatedAt: true,
              drive: {
                select: {
                  company: true,
                  role: true,
                  location: true,
                  status: true,
                },
              },
              offers: {
                where: { published: true },
                select: { id: true, packageLpa: true, offeredAt: true },
                orderBy: { offeredAt: "desc" },
              },
            },
          },
        },
      }),
      getOverallStatus(studentId),
    ]);

    if (!student) return Response.json({ error: "Student record not found" }, { status: 404 });
    return Response.json({
      student,
      overallClearance,
      applications: student.applications.map(({ resultPublished, stage, ...application }) => ({
        ...application,
        stage: resultPublished ? stage : null,
        resultPublished,
      })),
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}