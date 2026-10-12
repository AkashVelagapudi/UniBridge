import { ClearanceStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOwnStudent, requireRole } from "@/lib/services/authz";
import { getOverallStatus } from "@/lib/services/noDues";
import { routeError } from "@/lib/services/http";

export async function GET() {
  try {
    const session = await requireRole(Role.STUDENT);
    const student = await requireOwnStudent(session);
    const [categories, items, overall] = await Promise.all([
      prisma.clearanceCategory.findMany({
        where: { active: true },
        orderBy: [{ mandatory: "desc" }, { name: "asc" }],
        select: { id: true, name: true, mandatory: true },
      }),
      prisma.clearanceItem.findMany({
        where: { studentId: student.id, category: { active: true } },
        select: {
          categoryId: true,
          status: true,
          remarks: true,
          pendingRequirements: true,
          updatedAt: true,
        },
      }),
      getOverallStatus(student.id),
    ]);
    const itemByCategory = new Map(items.map((item) => [item.categoryId, item]));

    return NextResponse.json({
      overall,
      clearances: categories.map((category) => {
        const item = itemByCategory.get(category.id);
        return {
          ...category,
          status: item?.status ?? ClearanceStatus.PENDING,
          remarks: item?.remarks ?? null,
          pendingRequirements: item?.pendingRequirements ?? null,
          updatedAt: item?.updatedAt ?? null,
        };
      }),
    });
  } catch (error) {
    return routeError(error);
  }
}

function methodNotAllowed() {
  return NextResponse.json(
    { error: "Student clearance records are read-only." },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
