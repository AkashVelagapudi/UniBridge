import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

export const STUDENT_IMPORT_HEADERS = [
  "rollNo",
  "name",
  "department",
  "program",
  "year",
  "section",
  "batch",
  "email",
] as const;

export type ImportStatus = "Valid" | "Duplicate" | "Invalid";

export type StudentImportPreviewRow = {
  rowNumber: number;
  rollNo: string;
  name: string;
  department: string;
  program: string;
  year: string;
  section: string;
  batch: string;
  email: string;
  status: ImportStatus;
  message: string;
};

type StudentImportRowData = Omit<StudentImportPreviewRow, "status" | "message">;

type ValidatedStudent = Omit<StudentImportRowData, "year"> & {
  year: number;
  departmentId: string;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value).trim();
  if ("result" in value) return value.result == null ? "" : String(value.result).trim();
  if ("text" in value) return value.text?.trim() ?? "";
  if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  if ("hyperlink" in value) return String(value.hyperlink ?? "").trim();
  return "";
}

function normalizedHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rowToRawRecord(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  headerIndexes: Map<string, number>,
): StudentImportRowData {
  const get = (key: (typeof STUDENT_IMPORT_HEADERS)[number]) => {
    const column = headerIndexes.get(normalizedHeader(key));
    return column ? cellText(worksheet.getRow(rowNumber).getCell(column).value) : "";
  };

  return {
    rowNumber,
    rollNo: get("rollNo").toUpperCase(),
    name: get("name"),
    department: get("department"),
    program: get("program"),
    year: get("year"),
    section: get("section"),
    batch: get("batch"),
    email: get("email").toLowerCase(),
  };
}

export async function parseStudentUpload(fileName: string, buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  const extension = fileName.toLowerCase().split(".").pop();
  let worksheet: ExcelJS.Worksheet;

  if (extension === "csv") {
    worksheet = await workbook.csv.read(Readable.from([buffer.toString("utf8")]), {
      parserOptions: { trim: true, ignoreEmpty: true, maxRows: 2002 },
    });
  } else {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const firstSheet = workbook.worksheets[0];
    if (!firstSheet) return { rows: [], fileError: "The workbook does not contain a worksheet." };
    worksheet = firstSheet;
  }

  if (worksheet.rowCount < 1) return { rows: [], fileError: "The uploaded file is empty." };
  if (worksheet.rowCount > 2002) {
    return { rows: [], fileError: "The file exceeds the 2,000-row import limit." };
  }

  const headerIndexes = new Map<string, number>();
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const key = normalizedHeader(cellText(cell.value));
    if (key) headerIndexes.set(key, column);
  });

  const missingHeaders = STUDENT_IMPORT_HEADERS.filter(
    (header) => !headerIndexes.has(normalizedHeader(header)),
  );
  if (missingHeaders.length) {
    return {
      rows: [],
      fileError: `Missing required columns: ${missingHeaders.join(", ")}.`,
    };
  }

  const rows: StudentImportRowData[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = rowToRawRecord(worksheet, rowNumber, headerIndexes);
    if (Object.values(record).some((value) => String(value).trim() !== "")) rows.push(record);
  });

  if (rows.length > 2000) return { rows: [], fileError: "The file exceeds the 2,000-row import limit." };
  if (rows.length === 0) return { rows: [], fileError: "The file has a header row but no student records." };
  return { rows, fileError: null };
}

export async function validateStudentRows(input: unknown[]) {
  const rows = input.map((item, index): StudentImportRowData => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      rowNumber: Number.isInteger(value.rowNumber) ? Number(value.rowNumber) : index + 2,
      rollNo: String(value.rollNo ?? "").trim().toUpperCase(),
      name: String(value.name ?? "").trim(),
      department: String(value.department ?? "").trim(),
      program: String(value.program ?? "").trim(),
      year: String(value.year ?? "").trim(),
      section: String(value.section ?? "").trim(),
      batch: String(value.batch ?? "").trim(),
      email: String(value.email ?? "").trim().toLowerCase(),
    };
  });

  const departments = await prisma.department.findMany({
    select: { id: true, name: true, code: true },
  });
  const departmentByKey = new Map<string, (typeof departments)[number]>();
  for (const department of departments) {
    departmentByKey.set(department.name.trim().toLowerCase(), department);
    departmentByKey.set(department.code.trim().toLowerCase(), department);
  }

  const rollNumbers = rows.map((row) => row.rollNo).filter(Boolean);
  const emails = rows.map((row) => row.email).filter(Boolean);
  const existing = await prisma.student.findMany({
    where: {
      OR: [
        ...(rollNumbers.length ? [{ rollNo: { in: rollNumbers } }] : []),
        ...(emails.length ? [{ email: { in: emails } }] : []),
      ],
    },
    select: { rollNo: true, email: true },
  });
  const existingRollNumbers = new Set(existing.map((student) => student.rollNo.toUpperCase()));
  const existingEmails = new Set(existing.map((student) => student.email.toLowerCase()));
  const seenRollNumbers = new Map<string, number>();
  const seenEmails = new Map<string, number>();
  const validatedStudents: ValidatedStudent[] = [];
  const previewRows: StudentImportPreviewRow[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const duplicateReasons: string[] = [];
    const department = departmentByKey.get(row.department.toLowerCase());
    const year = Number(row.year);

    for (const header of STUDENT_IMPORT_HEADERS) {
      if (!row[header] && header !== "year") errors.push(`${header} is required.`);
    }
    if (!row.year) errors.push("year is required.");
    else if (!Number.isInteger(year) || year < 1) errors.push("year must be a positive whole number.");
    if (row.batch && !/^\d{4}$/.test(row.batch)) errors.push("batch must be a 4-digit year.");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("email must be a valid email address.");
    if (row.department && !department) errors.push(`Unknown department "${row.department}".`);

    if (row.rollNo) {
      const firstRow = seenRollNumbers.get(row.rollNo);
      if (firstRow !== undefined) duplicateReasons.push(`rollNo duplicates row ${firstRow} in this file.`);
      else seenRollNumbers.set(row.rollNo, row.rowNumber);
      if (existingRollNumbers.has(row.rollNo)) duplicateReasons.push("rollNo already exists in the database.");
    }
    if (row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      const firstRow = seenEmails.get(row.email);
      if (firstRow !== undefined) duplicateReasons.push(`email duplicates row ${firstRow} in this file.`);
      else seenEmails.set(row.email, row.rowNumber);
      if (existingEmails.has(row.email)) duplicateReasons.push("email already exists in the database.");
    }

    const status: ImportStatus = errors.length ? "Invalid" : duplicateReasons.length ? "Duplicate" : "Valid";
    const message = errors.length ? errors.join(" ") : duplicateReasons.join(" ") || "Ready to import.";
    previewRows.push({ ...row, status, message });

    if (status === "Valid" && department) {
      validatedStudents.push({ ...row, year, departmentId: department.id });
    }
  }

  return { rows: previewRows, validatedStudents };
}