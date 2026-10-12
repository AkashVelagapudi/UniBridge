import { DRIVE_STATUSES, type DriveStatus } from "@/lib/domain";

export type DriveInput = {
  company: string;
  role: string;
  eligibleDepartmentIds: string[];
  eligibleBatches: string[];
  minCgpa: number | null;
  maxBacklogs: number | null;
  skills: string | null;
  registrationDeadline: Date;
  stages: string[];
  location: string | null;
  packageLpa: number | null;
  status: DriveStatus;
};

export function parseDriveInput(input: unknown) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const company = String(value.company ?? "").trim();
  const role = String(value.role ?? "").trim();
  const eligibleDepartmentIds = Array.isArray(value.eligibleDepartmentIds)
    ? [...new Set(value.eligibleDepartmentIds.map((item) => String(item).trim()).filter(Boolean))]
    : [];
  const eligibleBatches = Array.isArray(value.eligibleBatches)
    ? [...new Set(value.eligibleBatches.map((item) => String(item).trim()).filter(Boolean))]
    : [];
  const minCgpaText = String(value.minCgpa ?? "").trim();
  const maxBacklogsText = String(value.maxBacklogs ?? "").trim();
  const packageText = String(value.packageLpa ?? "").trim();
  const minCgpa = minCgpaText ? Number(minCgpaText) : null;
  const maxBacklogs = maxBacklogsText ? Number(maxBacklogsText) : null;
  const packageLpa = packageText ? Number(packageText) : null;
  const skills = String(value.skills ?? "").trim() || null;
  const location = String(value.location ?? "").trim() || null;
  const deadlineText = String(value.registrationDeadline ?? "").trim();
  const registrationDeadline = new Date(deadlineText);
  const stages = Array.isArray(value.stages)
    ? value.stages.map((stage) => String(stage).trim()).filter(Boolean)
    : [];
  const status = String(value.status ?? "PLANNED");
  const errors: string[] = [];

  if (!company) errors.push("Company is required.");
  if (!role) errors.push("Role is required.");
  if (eligibleDepartmentIds.length === 0) errors.push("Select at least one eligible department.");
  if (eligibleBatches.length === 0 || eligibleBatches.some((batch) => !/^\d{4}$/.test(batch))) {
    errors.push("Add at least one 4-digit eligible batch.");
  }
  if (minCgpa !== null && (!Number.isFinite(minCgpa) || minCgpa < 0 || minCgpa > 10)) {
    errors.push("Minimum CGPA must be between 0 and 10.");
  }
  if (maxBacklogs !== null && (!Number.isInteger(maxBacklogs) || maxBacklogs < 0)) {
    errors.push("Maximum backlogs must be a non-negative whole number.");
  }
  if (packageLpa !== null && (!Number.isFinite(packageLpa) || packageLpa < 0)) {
    errors.push("Package must be a non-negative number.");
  }
  if (!deadlineText || Number.isNaN(registrationDeadline.getTime())) errors.push("Registration deadline is required.");
  if (stages.length === 0) errors.push("Add at least one recruitment stage.");
  if (stages.some((stage) => stage.length > 80)) errors.push("Stage names must be 80 characters or fewer.");
  if (new Set(stages.map((stage) => stage.toLowerCase())).size !== stages.length) {
    errors.push("Recruitment stage names must be unique.");
  }
  if (!DRIVE_STATUSES.includes(status as DriveStatus)) errors.push("Drive status is invalid.");

  if (errors.length) return { value: null, errors };
  return {
    value: {
      company,
      role,
      eligibleDepartmentIds,
      eligibleBatches,
      minCgpa,
      maxBacklogs,
      skills,
      registrationDeadline,
      stages,
      location,
      packageLpa,
      status: status as DriveStatus,
    } satisfies DriveInput,
    errors,
  };
}

export function toDriveStorage(input: DriveInput) {
  return {
    ...input,
    eligibleDepartmentIds: JSON.stringify(input.eligibleDepartmentIds),
    eligibleBatches: JSON.stringify(input.eligibleBatches),
    stages: JSON.stringify(input.stages),
  };
}