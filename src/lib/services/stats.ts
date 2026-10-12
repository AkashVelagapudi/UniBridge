import "server-only";

import {
  ApplicationStage,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseStringList } from "@/lib/services/json";

export type PlacementFilters = {
  departmentId?: string;
  batch?: string;
  driveId?: string;
  driveStatus?: DriveStatus;
};

export type PlacementStats = {
  uniqueStudentsPlaced: number;
  totalOffers: number;
  eligibleStudents: number;
  placementPercentage: number | null;
};

type ScopedDrive = {
  id: string;
  eligibleDepartmentIds: string;
  eligibleBatches: string;
};

const validApplicationStages: Prisma.ApplicationWhereInput = {
  stage: { notIn: [ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] },
};

function studentWhere(filters: PlacementFilters): Prisma.StudentWhereInput {
  return {
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.batch ? { batch: filters.batch } : {}),
  };
}

async function getScopedDrives(filters: PlacementFilters): Promise<ScopedDrive[]> {
  return prisma.drive.findMany({
    where: {
      ...(filters.driveId ? { id: filters.driveId } : {}),
      ...(filters.driveStatus ? { status: filters.driveStatus } : {}),
    },
    select: { id: true, eligibleDepartmentIds: true, eligibleBatches: true },
  });
}

function driveEligibleStudentWhere(
  filters: PlacementFilters,
  drives: ScopedDrive[],
): Prisma.StudentWhereInput {
  const base = studentWhere(filters);
  const scopes = drives.map((drive): Prisma.StudentWhereInput => {
    const departmentIds = parseStringList(drive.eligibleDepartmentIds);
    const batches = parseStringList(drive.eligibleBatches);
    return {
      ...(departmentIds.length > 0 ? { departmentId: { in: departmentIds } } : {}),
      ...(batches.length > 0 ? { batch: { in: batches } } : {}),
    };
  });

  return scopes.length > 0
    ? { ...base, OR: scopes }
    : { ...base, id: { in: [] } };
}

function validOfferWhere(
  filters: PlacementFilters,
  driveIds: string[],
  publishedOnly = false,
): Prisma.OfferWhereInput {
  return {
    ...(publishedOnly ? { published: true } : {}),
    application: {
      ...validApplicationStages,
      drive: {
        id: { in: driveIds },
        status: { not: DriveStatus.CANCELLED },
      },
      student: studentWhere(filters),
    },
  };
}

async function getPlacementStatsForDrives(
  filters: PlacementFilters,
  drives: ScopedDrive[],
  forceDriveEligibility = false,
): Promise<PlacementStats> {
  const scopedStudents = forceDriveEligibility || filters.driveId || filters.driveStatus
    ? driveEligibleStudentWhere(filters, drives)
    : studentWhere(filters);
  const [eligibleStudents, offers] = await Promise.all([
    prisma.student.count({
      where: {
        ...scopedStudents,
        registrationStatus: RegistrationStatus.REGISTERED,
        eligibilityStatus: EligibilityStatus.ELIGIBLE,
      },
    }),
    prisma.offer.findMany({
      where: validOfferWhere(filters, drives.map(({ id }) => id)),
      select: { application: { select: { studentId: true } } },
    }),
  ]);

  const uniqueStudentsPlaced = new Set(offers.map(({ application }) => application.studentId)).size;
  return {
    uniqueStudentsPlaced,
    totalOffers: offers.length,
    eligibleStudents,
    placementPercentage: eligibleStudents === 0
      ? null
      : (uniqueStudentsPlaced / eligibleStudents) * 100,
  };
}

export async function getPlacementStats(filters: PlacementFilters = {}): Promise<PlacementStats> {
  const drives = await getScopedDrives(filters);
  return getPlacementStatsForDrives(filters, drives);
}

export async function getDepartmentStats(filters: PlacementFilters = {}) {
  const departments = await prisma.department.findMany({
    where: filters.departmentId ? { id: filters.departmentId } : undefined,
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return Promise.all(
    departments.map(async (department) => ({
      department,
      ...(await getPlacementStats({ ...filters, departmentId: department.id })),
    })),
  );
}

export async function getCompanyStats(filters: PlacementFilters = {}) {
  const drives = await prisma.drive.findMany({
    where: {
      ...(filters.driveId ? { id: filters.driveId } : {}),
      ...(filters.driveStatus ? { status: filters.driveStatus } : {}),
    },
    orderBy: { company: "asc" },
    select: { id: true, company: true, eligibleDepartmentIds: true, eligibleBatches: true },
  });
  const drivesByCompany = new Map<string, ScopedDrive[]>();

  for (const drive of drives) {
    const group = drivesByCompany.get(drive.company) ?? [];
    group.push(drive);
    drivesByCompany.set(drive.company, group);
  }

  return Promise.all(
    [...drivesByCompany].map(async ([company, companyDrives]) => ({
      company,
      ...(await getPlacementStatsForDrives(filters, companyDrives, true)),
    })),
  );
}

export async function getPackageStats(filters: PlacementFilters = {}) {
  const drives = await getScopedDrives(filters);
  const offers = await prisma.offer.findMany({
    where: validOfferWhere(filters, drives.map(({ id }) => id), true),
    select: {
      packageLpa: true,
      application: { select: { studentId: true } },
    },
  });
  const packages = offers.map(({ packageLpa }) => packageLpa);
  const totalOffers = offers.length;

  return {
    uniqueStudentsPlaced: new Set(offers.map(({ application }) => application.studentId)).size,
    totalOffers,
    averagePackageLpa: totalOffers === 0
      ? null
      : packages.reduce((sum, packageLpa) => sum + packageLpa, 0) / totalOffers,
    highestPackageLpa: totalOffers === 0 ? null : Math.max(...packages),
  };
}

export async function getBatchTrends() {
  const batches = await prisma.student.findMany({
    distinct: ["batch"],
    orderBy: { batch: "asc" },
    select: { batch: true },
  });

  return Promise.all(
    batches.map(async ({ batch }) => ({
      batch,
      ...(await getPlacementStats({ batch })),
    })),
  );
}
