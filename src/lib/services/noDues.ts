import "server-only";

import { ClearanceStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type OverallClearanceStatus = "CLEARED" | "INCOMPLETE";

export type ClearanceFilters = {
  departmentId?: string;
  batch?: string;
};

export async function getOverallStatus(studentId: string): Promise<{
  status: OverallClearanceStatus;
  mandatoryCount: number;
  clearedCount: number;
  pendingCount: number;
}> {
  if (!studentId.trim()) {
    throw new Error("studentId is required to calculate no-dues status.");
  }

  const categories = await prisma.clearanceCategory.findMany({
    where: { active: true, mandatory: true },
    select: { id: true },
  });
  if (categories.length === 0) {
    return { status: "CLEARED", mandatoryCount: 0, clearedCount: 0, pendingCount: 0 };
  }

  const items = await prisma.clearanceItem.findMany({
    where: { studentId, categoryId: { in: categories.map(({ id }) => id) } },
    select: { categoryId: true, status: true },
  });
  const byCategory = new Map(items.map((item) => [item.categoryId, item.status]));
  const clearedCount = categories.filter(({ id }) => {
    const status = byCategory.get(id);
    return status === ClearanceStatus.CLEARED || status === ClearanceStatus.NOT_APPLICABLE;
  }).length;
  const mandatoryCount = categories.length;

  return {
    status: clearedCount === mandatoryCount ? "CLEARED" : "INCOMPLETE",
    mandatoryCount,
    clearedCount,
    pendingCount: mandatoryCount - clearedCount,
  };
}

export async function getClearanceSummary(filters: ClearanceFilters = {}) {
  const studentWhere: Prisma.StudentWhereInput = {
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.batch ? { batch: filters.batch } : {}),
  };
  const [students, categories] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      select: { id: true, rollNo: true, name: true, batch: true, department: { select: { id: true, name: true } } },
    }),
    prisma.clearanceCategory.findMany({
      where: { active: true, mandatory: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const items = await prisma.clearanceItem.findMany({
    where: {
      studentId: { in: students.map(({ id }) => id) },
      categoryId: { in: categories.map(({ id }) => id) },
    },
    select: { studentId: true, categoryId: true, status: true, remarks: true, pendingRequirements: true, updatedAt: true },
  });
  const itemMap = new Map(items.map((item) => [`${item.studentId}:${item.categoryId}`, item]));

  return students.map((student) => {
    const clearances = categories.map((category) => {
      const item = itemMap.get(`${student.id}:${category.id}`);
      return {
        categoryId: category.id,
        categoryName: category.name,
        status: item?.status ?? ClearanceStatus.PENDING,
        remarks: item?.remarks ?? null,
        pendingRequirements: item?.pendingRequirements ?? null,
        updatedAt: item?.updatedAt ?? null,
      };
    });
    const clearedCount = clearances.filter(({ status }) =>
      status === ClearanceStatus.CLEARED || status === ClearanceStatus.NOT_APPLICABLE,
    ).length;

    return {
      studentId: student.id,
      rollNo: student.rollNo,
      name: student.name,
      batch: student.batch,
      department: student.department,
      status: clearedCount === categories.length ? "CLEARED" as const : "INCOMPLETE" as const,
      clearances,
    };
  });
}
