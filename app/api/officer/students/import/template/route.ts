import ExcelJS from "exceljs";
import { STUDENT_IMPORT_HEADERS } from "@/lib/services/studentImport";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";

export async function GET() {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students");
    worksheet.addRow([...STUDENT_IMPORT_HEADERS]);
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF173B30" } };
    worksheet.columns = STUDENT_IMPORT_HEADERS.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 6, 18),
      style: header === "rollNo" || header === "batch" ? { numFmt: "@" } : {},
    }));
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=unibridge-students-template.xlsx",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}