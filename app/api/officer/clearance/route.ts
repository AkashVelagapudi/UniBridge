import { authorizationErrorResponse, requireRole } from "@/lib/services/authz";
import { getClearanceSummary } from "@/lib/services/noDues";

export async function GET(request: Request) {
  try {
    await requireRole("PLACEMENT_INCHARGE");
    const params = new URL(request.url).searchParams;
    return Response.json(
      await getClearanceSummary({
        departmentId: params.get("departmentId") || undefined,
        batch: params.get("batch") || undefined,
      }),
    );
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}