import { ELIGIBILITY_STATUSES, REGISTRATION_STATUSES } from "@/lib/domain";

export type StudentInput = {
  rollNo: string;
  name: string;
  departmentId: string;
  program: string;
  year: number;
  section: string;
  batch: string;
  cgpa: number | null;
  backlogs: number | null;
  skills: string | null;
  email: string;
  registrationStatus: (typeof REGISTRATION_STATUSES)[number];
  eligibilityStatus: (typeof ELIGIBILITY_STATUSES)[number];
};

export function parseStudentInput(input: unknown) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rollNo = String(value.rollNo ?? "").trim().toUpperCase();
  const name = String(value.name ?? "").trim();
  const departmentId = String(value.departmentId ?? "").trim();
  const program = String(value.program ?? "").trim();
  const year = Number(value.year);
  const section = String(value.section ?? "").trim();
  const batch = String(value.batch ?? "").trim();
  const cgpaText = String(value.cgpa ?? "").trim();
  const backlogsText = String(value.backlogs ?? "").trim();
  const cgpa = cgpaText ? Number(cgpaText) : null;
  const backlogs = backlogsText ? Number(backlogsText) : null;
  const skills = String(value.skills ?? "").trim() || null;
  const email = String(value.email ?? "").trim().toLowerCase();
  const registrationStatus = String(value.registrationStatus ?? "NOT_REGISTERED");
  const eligibilityStatus = String(value.eligibilityStatus ?? "NA");
  const errors: string[] = [];

  if (!rollNo) errors.push("Roll number is required.");
  if (!name) errors.push("Name is required.");
  if (!departmentId) errors.push("Department is required.");
  if (!program) errors.push("Program is required.");
  if (!Number.isInteger(year) || year < 1) errors.push("Year must be a positive whole number.");
  if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) errors.push("CGPA must be between 0 and 10.");
  if (backlogs !== null && (!Number.isInteger(backlogs) || backlogs < 0)) errors.push("Backlogs must be a non-negative whole number.");
  if (!section) errors.push("Section is required.");
  if (!/^\d{4}$/.test(batch)) errors.push("Batch must be a 4-digit year.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Enter a valid email address.");
  if (!REGISTRATION_STATUSES.includes(registrationStatus as StudentInput["registrationStatus"])) {
    errors.push("Registration status is invalid.");
  }
  if (!ELIGIBILITY_STATUSES.includes(eligibilityStatus as StudentInput["eligibilityStatus"])) {
    errors.push("Eligibility status is invalid.");
  }

  if (errors.length) return { value: null, errors };
  return {
    value: {
      rollNo,
      name,
      departmentId,
      program,
      year,
      section,
      batch,
      cgpa,
      backlogs,
      skills,
      email,
      registrationStatus: registrationStatus as StudentInput["registrationStatus"],
      eligibilityStatus: eligibilityStatus as StudentInput["eligibilityStatus"],
    } satisfies StudentInput,
    errors,
  };
}