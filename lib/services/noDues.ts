import { prisma } from "@/lib/prisma";

export type OverallClearanceStatus = "CLEARED" | "INCOMPLETE";

export async function getOverallStatus(studentId: string): Promise<OverallClearanceStatus> {
  const [mandatoryCategories, items] = await Promise.all([
    prisma.clearanceCategory.count({ where: { active: true, mandatory: true } }),
    prisma.clearanceItem.findMany({
      where: {
        studentId,
        category: { active: true, mandatory: true },
      },
      select: { status: true },
    }),
  ]);

  const clearedItems = items.filter(
    ({ status }) => status === "CLEARED" || status === "NOT_APPLICABLE",
  ).length;

  return clearedItems === mandatoryCategories ? "CLEARED" : "INCOMPLETE";
}

export type ClearanceSummaryFilters = {
  departmentId?: string;
  batch?: string;
};

export async function getClearanceSummary(filters: ClearanceSummaryFilters = {}) {
  const [categories, students] = await Promise.all([
    prisma.clearanceCategory.findMany({
      where: { active: true, mandatory: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: {
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.batch ? { batch: filters.batch } : {}),
      },
      select: {
        id: true,
        rollNo: true,
        name: true,
        batch: true,
        department: { select: { id: true, name: true, code: true } },
        clearanceItems: {
          where: { category: { active: true, mandatory: true } },
          select: {
            status: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ department: { name: "asc" } }, { rollNo: "asc" }],
    }),
  ]);

  const rows = students.map((student) => {
    const itemByCategory = new Map(
      student.clearanceItems.map((item) => [item.category.id, item]),
    );
    const items = categories.map((category) => {
      const item = itemByCategory.get(category.id);
      return {
        categoryId: category.id,
        categoryName: category.name,
        status: item?.status ?? "PENDING",
      };
    });
    const status: OverallClearanceStatus = items.every(
      (item) => item.status === "CLEARED" || item.status === "NOT_APPLICABLE",
    )
      ? "CLEARED"
      : "INCOMPLETE";

    return {
      id: student.id,
      rollNo: student.rollNo,
      name: student.name,
      batch: student.batch,
      department: student.department,
      status,
      items,
    };
  });

  return {
    totalStudents: rows.length,
    clearedStudents: rows.filter((row) => row.status === "CLEARED").length,
    incompleteStudents: rows.filter((row) => row.status === "INCOMPLETE").length,
    mandatoryCategories: categories,
    students: rows,
  };
}