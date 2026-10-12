export const ROLES = ["PLACEMENT_INCHARGE", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

export const REGISTRATION_STATUSES = ["REGISTERED", "NOT_REGISTERED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const ELIGIBILITY_STATUSES = ["ELIGIBLE", "NOT_ELIGIBLE", "NA"] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const DRIVE_STATUSES = [
  "PLANNED",
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type DriveStatus = (typeof DRIVE_STATUSES)[number];

export const APPLICATION_STAGES = [
  "REGISTERED",
  "ELIGIBILITY_VERIFIED",
  "SHORTLISTED",
  "ASSESSMENT_COMPLETED",
  "INTERVIEW_IN_PROGRESS",
  "SELECTED",
  "OFFER_RECEIVED",
  "JOINED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const CLEARANCE_STATUSES = [
  "PENDING",
  "CLEARED",
  "NOT_APPLICABLE",
  "REJECTED",
] as const;
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number];

export type PlacementFilters = {
  departmentId?: string;
  batch?: string;
  driveId?: string;
  driveStatus?: DriveStatus;
};

export function parseStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}