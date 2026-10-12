import { prisma } from "@/lib/prisma";
import { parseStringList, type PlacementFilters } from "@/lib/domain";

type ScopedDrive = {
  id: string;
  eligibleDepartmentIds: string;
  eligibleBatches: string;
};

function driveWhere(filters: PlacementFilters) {
  return {
    ...(filters.driveId ? { id: filters.driveId } : {}),
    ...(filters.driveStatus ? { status: filters.driveStatus } : {}),
  };
}

async function getScopedDriveIds(filters: PlacementFilters): Promise<ScopedDrive[] | null> {
  if (!filters.driveId && !filters.driveStatus) return null;

  return prisma.drive.findMany({
    where: driveWhere(filters),
    select: { id: true, eligibleDepartmentIds: true, eligibleBatches: true },
  });
}

function matchesDriveEligibility(
  student: { departmentId: string; batch: string },
  drives: ScopedDrive[],
) {
  return drives.some((drive) =>
    parseStringList(drive.eligibleDepartmentIds).includes(student.departmentId) &&
    parseStringList(drive.eligibleBatches).includes(student.batch),
  );
}

async function getEligibleStudentIds(
  filters: PlacementFilters,
  scopedDrives: ScopedDrive[] | null,
) {
  const students = await prisma.student.findMany({
    where: {
      registrationStatus: "REGISTERED",
      eligibilityStatus: "ELIGIBLE",
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.batch ? { batch: filters.batch } : {}),
    },
    select: { id: true, departmentId: true, batch: true },
  });

  if (scopedDrives === null) return students.map(({ id }) => id);
  return students
    .filter((student) => matchesDriveEligibility(student, scopedDrives))
    .map(({ id }) => id);
}

async function getValidOffers(filters: PlacementFilters) {
  return prisma.offer.findMany({
    where: {
      application: {
        stage: { notIn: ["REJECTED", "WITHDRAWN"] },
        student: {
          ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
          ...(filters.batch ? { batch: filters.batch } : {}),
        },
        drive: {
          status: { not: "CANCELLED" },
          ...driveWhere(filters),
        },
      },
    },
    select: {
      packageLpa: true,
      application: {
        select: {
          studentId: true,
          student: { select: { batch: true, departmentId: true } },
          drive: { select: { company: true } },
        },
      },
    },
  });
}

export async function getPlacementStats(filters: PlacementFilters = {}) {
  const scopedDrives = await getScopedDriveIds(filters);
  const [eligibleStudentIds, offers] = await Promise.all([
    getEligibleStudentIds(filters, scopedDrives),
    getValidOffers(filters),
  ]);
  const uniqueStudentsPlaced = new Set(offers.map(({ application }) => application.studentId)).size;

  return {
    uniqueStudentsPlaced,
    totalOffers: offers.length,
    eligibleStudents: eligibleStudentIds.length,
    placementPercentage: eligibleStudentIds.length
      ? (uniqueStudentsPlaced / eligibleStudentIds.length) * 100
      : 0,
  };
}

export async function getDepartmentStats(filters: PlacementFilters = {}) {
  const departments = await prisma.department.findMany({
    where: filters.departmentId ? { id: filters.departmentId } : undefined,
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    departments.map(async (department) => ({
      ...department,
      ...(await getPlacementStats({ ...filters, departmentId: department.id })),
    })),
  );
}

export async function getCompanyStats(filters: PlacementFilters = {}) {
  const offers = await getValidOffers(filters);
  const companies = new Map<string, { uniqueStudentIds: Set<string>; totalOffers: number }>();

  for (const offer of offers) {
    const company = offer.application.drive.company;
    const current = companies.get(company) ?? {
      uniqueStudentIds: new Set<string>(),
      totalOffers: 0,
    };
    current.uniqueStudentIds.add(offer.application.studentId);
    current.totalOffers += 1;
    companies.set(company, current);
  }

  return [...companies.entries()]
    .map(([company, stats]) => ({
      company,
      uniqueStudentsPlaced: stats.uniqueStudentIds.size,
      totalOffers: stats.totalOffers,
    }))
    .sort((left, right) => right.totalOffers - left.totalOffers);
}

export async function getPackageStats(filters: PlacementFilters = {}) {
  const offers = await getValidOffers(filters);
  const packages = new Map<number, Set<string>>();

  for (const offer of offers) {
    const students = packages.get(offer.packageLpa) ?? new Set<string>();
    students.add(offer.application.studentId);
    packages.set(offer.packageLpa, students);
  }

  return [...packages.entries()]
    .map(([packageLpa, students]) => ({
      packageLpa,
      uniqueStudentsPlaced: students.size,
      totalOffers: offers.filter((offer) => offer.packageLpa === packageLpa).length,
    }))
    .sort((left, right) => left.packageLpa - right.packageLpa);
}

export async function getBatchTrends() {
  const batches = await prisma.student.findMany({
    where: { registrationStatus: "REGISTERED", eligibilityStatus: "ELIGIBLE" },
    select: { batch: true },
    distinct: ["batch"],
    orderBy: { batch: "asc" },
  });

  return Promise.all(
    batches.map(async ({ batch }) => ({
      batch,
      ...(await getPlacementStats({ batch })),
    })),
  );
}