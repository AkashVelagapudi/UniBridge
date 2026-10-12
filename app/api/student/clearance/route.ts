import { authorizationErrorResponse, requireOwnStudent, requireRole } from "@/lib/services/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireRole("STUDENT");
    const studentId = requireOwnStudent(session);
    const [categories, items] = await Promise.all([
      prisma.clearanceCategory.findMany({
        where: { active: true },
        select: { id: true, name: true, mandatory: true },
        orderBy: [{ mandatory: "desc" }, { name: "asc" }],
      }),
      prisma.clearanceItem.findMany({
        where: { studentId, category: { active: true } },
        select: {
          categoryId: true,
          status: true,
          remarks: true,
          pendingRequirements: true,
          updatedAt: true,
        },
      }),
    ]);
    const itemByCategory = new Map(items.map((item) => [item.categoryId, item]));

    return Response.json({
      items: categories.map((category) => ({
        ...category,
        ...(itemByCategory.get(category.id) ?? {
          status: "PENDING",
          remarks: null,
          pendingRequirements: null,
          updatedAt: null,
        }),
      })),
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}