import type { Drive, Student } from "@prisma/client";
import { parseStringList } from "@/lib/domain";

export type DriveEligibilityStudent = Pick<
  Student,
  "departmentId" | "batch" | "registrationStatus" | "eligibilityStatus" | "cgpa" | "backlogs" | "skills"
>;

export type DriveEligibilityCriteria = Pick<
  Drive,
  "eligibleDepartmentIds" | "eligibleBatches" | "minCgpa" | "maxBacklogs" | "skills"
>;

function skillTokens(value: string | null) {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
}

export function evaluateDriveEligibility(
  student: DriveEligibilityStudent,
  drive: DriveEligibilityCriteria,
) {
  const reasons: string[] = [];
  const eligibleDepartments = parseStringList(drive.eligibleDepartmentIds);
  const eligibleBatches = parseStringList(drive.eligibleBatches);

  if (student.registrationStatus !== "REGISTERED") reasons.push("Student is not registered for placements.");
  if (student.eligibilityStatus !== "ELIGIBLE") reasons.push("Student is marked not eligible for placements.");
  if (!eligibleDepartments.includes(student.departmentId)) reasons.push("Department is not eligible for this drive.");
  if (!eligibleBatches.includes(student.batch)) reasons.push("Batch is not eligible for this drive.");

  if (drive.minCgpa !== null) {
    if (student.cgpa === null) reasons.push("CGPA is not on record.");
    else if (student.cgpa < drive.minCgpa) reasons.push(`CGPA is below the ${drive.minCgpa} minimum.`);
  }
  if (drive.maxBacklogs !== null) {
    if (student.backlogs === null) reasons.push("Backlog count is not on record.");
    else if (student.backlogs > drive.maxBacklogs) reasons.push(`Backlogs exceed the maximum of ${drive.maxBacklogs}.`);
  }

  const requiredSkills = skillTokens(drive.skills);
  if (requiredSkills.length) {
    const studentSkills = new Set(skillTokens(student.skills));
    if (studentSkills.size === 0) {
      reasons.push("Skills are not on record.");
    } else {
      const missingSkills = requiredSkills.filter((skill) => !studentSkills.has(skill));
      if (missingSkills.length) reasons.push(`Missing skills: ${missingSkills.join(", ")}.`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}