import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { parseStudentInput } from "@/lib/services/studentInput";

export async function PUT(request: Request, context: RouteContext<"/api/officer/students/[studentId]">) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const { studentId } = await context.params;
    const parsed = parseStudentInput(await request.json());
    if (!parsed.value) return Response.json({ error: parsed.errors.join(" ") }, { status: 400 });
    const department = await prisma.department.findUnique({ where: { id: parsed.value.departmentId } });
    if (!department) return Response.json({ error: "Selected department does not exist." }, { status: 400 });

    const student = await prisma.student.update({
      where: { id: studentId },
      data: parsed.value,
      include: { department: true },
    });
    return Response.json({ student });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Another student already uses that roll number or email." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return Response.json({ error: "Student record not found." }, { status: 404 });
    }
    return authorizationErrorResponse(error);
  }
}