import { Prisma } from "@prisma/client";
import { REGISTRATION_STATUSES } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { parseStudentInput } from "@/lib/services/studentInput";

export async function GET(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const params = new URL(request.url).searchParams;
    const query = params.get("search")?.trim().slice(0, 100);
    const departmentId = params.get("departmentId") || undefined;
    const batch = params.get("batch") || undefined;
    const yearValue = params.get("year");
    const year = yearValue ? Number(yearValue) : undefined;
    const registrationStatus = params.get("registrationStatus");
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20));

    if (yearValue && (!Number.isInteger(year) || year! < 1)) {
      return Response.json({ error: "Year filter must be a positive whole number." }, { status: 400 });
    }
    if (registrationStatus && !REGISTRATION_STATUSES.includes(registrationStatus as (typeof REGISTRATION_STATUSES)[number])) {
      return Response.json({ error: "Registration status filter is invalid." }, { status: 400 });
    }

    const where: Prisma.StudentWhereInput = {
      ...(departmentId ? { departmentId } : {}),
      ...(batch ? { batch } : {}),
      ...(year ? { year } : {}),
      ...(registrationStatus ? { registrationStatus } : {}),
      ...(query ? { OR: [{ name: { contains: query } }, { rollNo: { contains: query.toUpperCase() } }] } : {}),
    };
    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: { department: { select: { id: true, name: true, code: true } } },
        orderBy: [{ department: { name: "asc" } }, { rollNo: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json({ students, total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const parsed = parseStudentInput(await request.json());
    if (!parsed.value) return Response.json({ error: parsed.errors.join(" ") }, { status: 400 });
    const department = await prisma.department.findUnique({ where: { id: parsed.value.departmentId } });
    if (!department) return Response.json({ error: "Selected department does not exist." }, { status: 400 });

    const student = await prisma.student.create({ data: parsed.value, include: { department: true } });
    return Response.json({ student }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "A student with that roll number or email already exists." }, { status: 409 });
    }
    return authorizationErrorResponse(error);
  }
}