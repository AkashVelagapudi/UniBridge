import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { validateStudentRows, type ImportStatus } from "@/lib/services/studentImport";

export async function POST(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const body: unknown = await request.json();
    const submittedRows = body && typeof body === "object" && "rows" in body
      ? (body as { rows?: unknown }).rows
      : undefined;
    if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
      return Response.json({ error: "Preview student rows before confirming the import." }, { status: 400 });
    }
    if (submittedRows.length > 2000) {
      return Response.json({ error: "The import exceeds the 2,000-row limit." }, { status: 400 });
    }

    const validation = await validateStudentRows(submittedRows);
    const reportRows: { rowNumber: number; rollNo: string; status: ImportStatus | "Failed"; message: string }[] = validation.rows
      .filter((row) => row.status !== "Valid")
      .map(({ rowNumber, rollNo, status, message }) => ({ rowNumber, rollNo, status, message }));
    let successful = 0;
    let skipped = validation.rows.filter((row) => row.status === "Duplicate").length;
    let failed = validation.rows.filter((row) => row.status === "Invalid").length;

    for (const student of validation.validatedStudents) {
      try {
        await prisma.student.create({
          data: {
            rollNo: student.rollNo,
            name: student.name,
            departmentId: student.departmentId,
            program: student.program,
            year: student.year,
            section: student.section,
            batch: student.batch,
            email: student.email,
            registrationStatus: "NOT_REGISTERED",
            eligibilityStatus: "NA",
          },
        });
        successful += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          skipped += 1;
          reportRows.push({
            rowNumber: student.rowNumber,
            rollNo: student.rollNo,
            status: "Duplicate",
            message: "A matching roll number or email was created before confirmation.",
          });
        } else {
          failed += 1;
          reportRows.push({
            rowNumber: student.rowNumber,
            rollNo: student.rollNo,
            status: "Failed",
            message: "The database could not save this student record.",
          });
        }
      }
    }

    return Response.json({
      summary: { successful, skipped, failed },
      reportRows,
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}