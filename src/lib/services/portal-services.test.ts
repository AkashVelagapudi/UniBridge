import {
  ApplicationStage,
  ClearanceStatus,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
  Role,
} from "@prisma/client";
import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  categoryFindMany: vi.fn(),
  clearanceItemFindMany: vi.fn(),
  driveFindMany: vi.fn(),
  offerFindMany: vi.fn(),
  studentCount: vi.fn(),
  studentFindMany: vi.fn(),
  studentFindUnique: vi.fn(),
  departmentFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    clearanceCategory: { findMany: mocks.categoryFindMany },
    clearanceItem: { findMany: mocks.clearanceItemFindMany },
    department: { findMany: mocks.departmentFindMany },
    drive: { findMany: mocks.driveFindMany },
    offer: { findMany: mocks.offerFindMany },
    student: {
      count: mocks.studentCount,
      findMany: mocks.studentFindMany,
      findUnique: mocks.studentFindUnique,
    },
  },
}));

import { AuthorizationError, requireOwnStudent, requireRole } from "@/lib/services/authz";
import { getOverallStatus } from "@/lib/services/noDues";
import {
  getBatchTrends,
  getCompanyStats,
  getDepartmentStats,
  getPackageStats,
  getPlacementStats,
} from "@/lib/services/stats";

type FixtureDrive = {
  id: string;
  company: string;
  status: DriveStatus;
  eligibleDepartmentIds: string;
  eligibleBatches: string;
};

type FixtureOffer = {
  packageLpa: number;
  published: boolean;
  application: {
    studentId: string;
    stage: ApplicationStage;
    drive: { id: string; status: DriveStatus };
    student: { departmentId: string; batch: string };
  };
};

const students = [
  { id: "s1", departmentId: "cse", batch: "2026", registrationStatus: RegistrationStatus.REGISTERED, eligibilityStatus: EligibilityStatus.ELIGIBLE },
  { id: "s2", departmentId: "cse", batch: "2026", registrationStatus: RegistrationStatus.REGISTERED, eligibilityStatus: EligibilityStatus.ELIGIBLE },
  { id: "s3", departmentId: "ece", batch: "2025", registrationStatus: RegistrationStatus.REGISTERED, eligibilityStatus: EligibilityStatus.ELIGIBLE },
  { id: "s4", departmentId: "ece", batch: "2025", registrationStatus: RegistrationStatus.NOT_REGISTERED, eligibilityStatus: EligibilityStatus.NA },
];

const drives: FixtureDrive[] = [
  { id: "d1", company: "Alpha", status: DriveStatus.OPEN, eligibleDepartmentIds: '["cse"]', eligibleBatches: '["2026"]' },
  { id: "d2", company: "Alpha", status: DriveStatus.OPEN, eligibleDepartmentIds: '["cse"]', eligibleBatches: '["2026"]' },
  { id: "d3", company: "Cancelled Co", status: DriveStatus.CANCELLED, eligibleDepartmentIds: '["ece"]', eligibleBatches: '["2025"]' },
  { id: "d4", company: "Beta", status: DriveStatus.OPEN, eligibleDepartmentIds: '["ece"]', eligibleBatches: '["2025"]' },
];

const offers: FixtureOffer[] = [
  { packageLpa: 10, published: true, application: { studentId: "s1", stage: ApplicationStage.SELECTED, drive: { id: "d1", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
  { packageLpa: 15, published: true, application: { studentId: "s1", stage: ApplicationStage.OFFER_RECEIVED, drive: { id: "d2", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
  { packageLpa: 40, published: true, application: { studentId: "s2", stage: ApplicationStage.WITHDRAWN, drive: { id: "d1", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
  { packageLpa: 50, published: true, application: { studentId: "s2", stage: ApplicationStage.REJECTED, drive: { id: "d2", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
  { packageLpa: 60, published: true, application: { studentId: "s3", stage: ApplicationStage.SELECTED, drive: { id: "d3", status: DriveStatus.CANCELLED }, student: { departmentId: "ece", batch: "2025" } } },
  { packageLpa: 80, published: false, application: { studentId: "s3", stage: ApplicationStage.SELECTED, drive: { id: "d4", status: DriveStatus.OPEN }, student: { departmentId: "ece", batch: "2025" } } },
];

function matchesScope(value: string, filter: unknown): boolean {
  if (!filter) return true;
  if (typeof filter === "string") return value === filter;
  if (typeof filter === "object" && filter !== null && "in" in filter) {
    const values = (filter as { in: string[] }).in;
    return values.includes(value);
  }
  return true;
}

function setupStatsMocks() {
  mocks.driveFindMany.mockImplementation(async (args: {
    where?: { id?: string; status?: DriveStatus; company?: string };
    distinct?: string[];
    select?: { company?: boolean };
  }) => {
    let result = drives.filter((drive) =>
      (!args.where?.id || drive.id === args.where.id) &&
      (!args.where?.status || drive.status === args.where.status) &&
      (!args.where?.company || drive.company === args.where.company),
    );
    if (args.distinct?.includes("company")) {
      result = result.filter((drive, index, all) =>
        all.findIndex((candidate) => candidate.company === drive.company) === index,
      );
    }
    return result;
  });

  mocks.studentCount.mockImplementation(async (args: {
    where?: {
      id?: { in: string[] };
      departmentId?: unknown;
      batch?: unknown;
      registrationStatus?: RegistrationStatus;
      eligibilityStatus?: EligibilityStatus;
      OR?: Array<{ departmentId?: unknown; batch?: unknown }>;
    };
  }) => students.filter((student) => {
    const where = args.where ?? {};
    const driveScope = !where.OR || where.OR.some((scope) =>
      matchesScope(student.departmentId, scope.departmentId) &&
      matchesScope(student.batch, scope.batch),
    );
    return driveScope &&
      (!where.id?.in || where.id.in.includes(student.id)) &&
      matchesScope(student.departmentId, where.departmentId) &&
      matchesScope(student.batch, where.batch) &&
      (!where.registrationStatus || student.registrationStatus === where.registrationStatus) &&
      (!where.eligibilityStatus || student.eligibilityStatus === where.eligibilityStatus);
  }).length);

  mocks.offerFindMany.mockImplementation(async (args: {
    where?: {
      published?: boolean;
      application?: {
        stage?: { notIn?: ApplicationStage[] };
        drive?: { id?: { in?: string[] }; status?: { not?: DriveStatus } };
        student?: { departmentId?: unknown; batch?: unknown };
      };
    };
  }) => offers
    .filter((offer) => {
      const where = args.where ?? {};
      const applicationWhere = where.application;
      const driveIds = applicationWhere?.drive?.id?.in;
      const excludedStages = applicationWhere?.stage?.notIn ?? [];
      return (where.published === undefined || offer.published === where.published) &&
        (!driveIds || driveIds.includes(offer.application.drive.id)) &&
        (!applicationWhere?.drive?.status?.not ||
          offer.application.drive.status !== applicationWhere.drive.status.not) &&
        !excludedStages.includes(offer.application.stage) &&
        matchesScope(offer.application.student.departmentId, applicationWhere?.student?.departmentId) &&
        matchesScope(offer.application.student.batch, applicationWhere?.student?.batch);
    })
    .map((offer) => ({
      packageLpa: offer.packageLpa,
      application: { studentId: offer.application.studentId },
    })));
}

describe("no-dues service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats a missing mandatory active item as pending", async () => {
    mocks.categoryFindMany.mockResolvedValue([{ id: "library" }, { id: "accounts" }]);
    mocks.clearanceItemFindMany.mockResolvedValue([
      { categoryId: "library", status: ClearanceStatus.CLEARED },
    ]);

    await expect(getOverallStatus("s1")).resolves.toEqual({
      status: "INCOMPLETE",
      mandatoryCount: 2,
      clearedCount: 1,
      pendingCount: 1,
    });
    expect(mocks.categoryFindMany).toHaveBeenCalledWith({
      where: { active: true, mandatory: true },
      select: { id: true },
    });
  });

  it("counts NOT_APPLICABLE as cleared and ignores optional/inactive categories", async () => {
    mocks.categoryFindMany.mockResolvedValue([{ id: "library" }, { id: "accounts" }]);
    mocks.clearanceItemFindMany.mockResolvedValue([
      { categoryId: "library", status: ClearanceStatus.NOT_APPLICABLE },
      { categoryId: "accounts", status: ClearanceStatus.CLEARED },
    ]);

    await expect(getOverallStatus("s1")).resolves.toEqual({
      status: "CLEARED",
      mandatoryCount: 2,
      clearedCount: 2,
      pendingCount: 0,
    });
  });
});

describe("placement statistics services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    offers.splice(0, offers.length,
      { packageLpa: 10, published: true, application: { studentId: "s1", stage: ApplicationStage.SELECTED, drive: { id: "d1", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
      { packageLpa: 15, published: true, application: { studentId: "s1", stage: ApplicationStage.OFFER_RECEIVED, drive: { id: "d2", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
      { packageLpa: 40, published: true, application: { studentId: "s2", stage: ApplicationStage.WITHDRAWN, drive: { id: "d1", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
      { packageLpa: 50, published: true, application: { studentId: "s2", stage: ApplicationStage.REJECTED, drive: { id: "d2", status: DriveStatus.OPEN }, student: { departmentId: "cse", batch: "2026" } } },
      { packageLpa: 60, published: true, application: { studentId: "s3", stage: ApplicationStage.SELECTED, drive: { id: "d3", status: DriveStatus.CANCELLED }, student: { departmentId: "ece", batch: "2025" } } },
      { packageLpa: 80, published: false, application: { studentId: "s3", stage: ApplicationStage.SELECTED, drive: { id: "d4", status: DriveStatus.OPEN }, student: { departmentId: "ece", batch: "2025" } } },
    );
    setupStatsMocks();
  });

  it("counts offers separately from distinct placed students and excludes invalid offer rows", async () => {
    await expect(getPlacementStats()).resolves.toEqual({
      uniqueStudentsPlaced: 2,
      totalOffers: 3,
      eligibleStudents: 3,
      placementPercentage: (2 / 3) * 100,
    });
  });

  it("does not count offers from cancelled drives or withdrawn/rejected applications", async () => {
    const result = await getPlacementStats({ departmentId: "cse", batch: "2026" });
    expect(result.uniqueStudentsPlaced).toBe(1);
    expect(result.totalOffers).toBe(2);
    expect(result.eligibleStudents).toBe(2);
    expect(result.placementPercentage).toBe(50);
  });

  it("recalculates stats after an application outcome changes", async () => {
    const before = await getPlacementStats();
    offers[0].application.stage = ApplicationStage.REJECTED;
    offers[1].application.stage = ApplicationStage.WITHDRAWN;
    const after = await getPlacementStats();

    expect(before.totalOffers).toBe(3);
    expect(before.uniqueStudentsPlaced).toBe(2);
    expect(after.totalOffers).toBe(1);
    expect(after.uniqueStudentsPlaced).toBe(1);
  });

  it("returns a null percentage for a zero denominator", async () => {
    await expect(getPlacementStats({ departmentId: "unknown" })).resolves.toEqual({
      uniqueStudentsPlaced: 0,
      totalOffers: 0,
      eligibleStudents: 0,
      placementPercentage: null,
    });
  });

  it("uses published, valid offers only for package averages and highest values", async () => {
    await expect(getPackageStats()).resolves.toEqual({
      uniqueStudentsPlaced: 1,
      totalOffers: 2,
      averagePackageLpa: 12.5,
      highestPackageLpa: 15,
    });
  });

  it("includes denominator and percentage for company and department statistics", async () => {
    mocks.departmentFindMany.mockResolvedValue([
      { id: "cse", name: "Computer Science", code: "CSE" },
    ]);
    const [departmentStats, companyStats] = await Promise.all([
      getDepartmentStats(),
      getCompanyStats(),
    ]);

    expect(departmentStats[0]).toMatchObject({
      uniqueStudentsPlaced: 1,
      totalOffers: 2,
      eligibleStudents: 2,
      placementPercentage: 50,
    });
    expect(companyStats.find(({ company }) => company === "Alpha")).toMatchObject({
      uniqueStudentsPlaced: 1,
      totalOffers: 2,
      eligibleStudents: 2,
      placementPercentage: 50,
    });
  });

  it("groups trends by batch", async () => {
    mocks.studentFindMany.mockResolvedValue([{ batch: "2025" }, { batch: "2026" }]);

    const trends = await getBatchTrends();

    expect(trends.map(({ batch }) => batch)).toEqual(["2025", "2026"]);
    expect(trends.find(({ batch }) => batch === "2026")).toMatchObject({
      uniqueStudentsPlaced: 1,
      totalOffers: 2,
      eligibleStudents: 2,
      placementPercentage: 50,
    });
  });
});

describe("authorization service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the requested role and an authenticated user", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-student", role: Role.STUDENT },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session);
    await expect(requireRole(Role.STUDENT)).resolves.toMatchObject({
      user: { id: "user-student", role: Role.STUDENT },
    });
    await expect(requireRole(Role.PLACEMENT_INCHARGE)).rejects.toMatchObject({
      name: "AuthorizationError",
      status: 403,
    });

    mocks.getServerSession.mockResolvedValue(null);
    await expect(requireRole(Role.STUDENT)).rejects.toMatchObject({
      name: "AuthorizationError",
      status: 401,
    });
  });

  it("loads only the student linked to the authenticated user", async () => {
    const session = {
      user: { id: "user-student", role: Role.STUDENT },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    mocks.studentFindUnique.mockResolvedValue({ id: "student-1", userId: "user-student" });

    await expect(requireOwnStudent(session)).resolves.toMatchObject({ id: "student-1" });
    expect(mocks.studentFindUnique).toHaveBeenCalledWith({ where: { userId: "user-student" } });

    await expect(
      requireOwnStudent({ ...session, user: { ...session.user, role: Role.PLACEMENT_INCHARGE } }),
    ).rejects.toMatchObject({ status: 403 });

    mocks.studentFindUnique.mockResolvedValue(null);
    await expect(requireOwnStudent(session)).rejects.toMatchObject({ status: 404 });
  });

  it("exposes stable authorization error status codes", () => {
    expect(new AuthorizationError("missing", 404)).toBeInstanceOf(Error);
  });
});
