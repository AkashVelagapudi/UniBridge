import { DRIVE_STATUSES, type PlacementFilters } from "@/lib/domain";
import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import {
  getBatchTrends,
  getCompanyStats,
  getDepartmentStats,
  getPackageStats,
  getPlacementStats,
} from "@/lib/services/stats";

export async function GET(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const params = new URL(request.url).searchParams;
    const requestedStatus = params.get("driveStatus");
    const filters: PlacementFilters = {
      departmentId: params.get("departmentId") || undefined,
      batch: params.get("batch") || undefined,
      driveId: params.get("driveId") || undefined,
      driveStatus: DRIVE_STATUSES.find((status) => status === requestedStatus),
    };

    const [placement, departments, companies, packages, batchTrends] = await Promise.all([
      getPlacementStats(filters),
      getDepartmentStats(filters),
      getCompanyStats(filters),
      getPackageStats(filters),
      getBatchTrends(),
    ]);

    return Response.json({ placement, departments, companies, packages, batchTrends });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}