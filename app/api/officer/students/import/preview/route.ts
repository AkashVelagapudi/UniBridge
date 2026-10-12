import { AuthorizationError, authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { parseStudentUpload, validateStudentRows } from "@/lib/services/studentImport";

export async function POST(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 12 * 1024 * 1024) {
      return Response.json({ error: "The upload exceeds the 10 MB file limit." }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ error: "Choose a .xlsx or .csv file to preview." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "The upload exceeds the 10 MB file limit." }, { status: 413 });
    }
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      return Response.json({ error: "Only .xlsx and .csv files are supported." }, { status: 400 });
    }

    const parsed = await parseStudentUpload(file.name, Buffer.from(await file.arrayBuffer()));
    if (parsed.fileError) {
      return Response.json({
        rows: [{
          rowNumber: 1,
          rollNo: "",
          name: "",
          department: "",
          program: "",
          year: "",
          section: "",
          batch: "",
          email: "",
          status: "Invalid",
          message: parsed.fileError,
        }],
        validCount: 0,
        duplicateCount: 0,
        invalidCount: 1,
      });
    }

    const validated = await validateStudentRows(parsed.rows);
    return Response.json({
      rows: validated.rows,
      validCount: validated.rows.filter((row) => row.status === "Valid").length,
      duplicateCount: validated.rows.filter((row) => row.status === "Duplicate").length,
      invalidCount: validated.rows.filter((row) => row.status === "Invalid").length,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return authorizationErrorResponse(error);
    }
    return Response.json({ error: "Could not read the file. Check that it is a valid .xlsx or .csv workbook." }, { status: 400 });
  }
}