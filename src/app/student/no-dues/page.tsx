import { ClearanceStatus } from "@prisma/client";

import { StudentShell } from "@/components/student-shell";
import { prisma } from "@/lib/prisma";
import { getOverallStatus } from "@/lib/services/noDues";
import { getStudentPageContext } from "@/lib/services/student-page";

function statusLabel(status: ClearanceStatus) {
  return status.replaceAll("_", " ");
}

export default async function StudentNoDuesPage() {
  const student = await getStudentPageContext();
  const [categories, items, overall] = await Promise.all([
    prisma.clearanceCategory.findMany({
      where: { active: true },
      orderBy: [{ mandatory: "desc" }, { name: "asc" }],
      select: { id: true, name: true, mandatory: true },
    }),
    prisma.clearanceItem.findMany({
      where: { studentId: student.id, category: { active: true } },
      select: { categoryId: true, status: true, remarks: true, pendingRequirements: true, updatedAt: true },
    }),
    getOverallStatus(student.id),
  ]);
  const itemByCategory = new Map(items.map((item) => [item.categoryId, item]));

  return (
    <StudentShell>
      <div>
        <p className="text-sm font-semibold text-indigo-700">Graduation checklist</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">No-dues status</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Review each active clearance category. Contact the responsible department if a requirement is unclear.
        </p>
      </div>
      <section className={`mt-7 rounded-2xl border p-6 ${
        overall.status === "CLEARED"
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}>
        <p className="text-sm font-medium text-slate-600">Overall status</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900">{overall.status === "CLEARED" ? "All clear" : "Incomplete"}</h2>
          <p className="text-sm font-medium text-slate-700">
            {overall.clearedCount} of {overall.mandatoryCount} mandatory clearances complete
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {overall.status === "CLEARED"
            ? "Every active mandatory category is cleared or marked not applicable."
            : `${overall.pendingCount} mandatory ${
                overall.pendingCount === 1 ? "category needs" : "categories need"
              } attention.`}
        </p>
      </section>

      {categories.length === 0 ? (
        <p className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          There are no active clearance categories at this time.
        </p>
      ) : (
        <div className="mt-7 space-y-3">
          {categories.map((category) => {
            const item = itemByCategory.get(category.id);
            const status = item?.status ?? ClearanceStatus.PENDING;
            const complete = status === ClearanceStatus.CLEARED || status === ClearanceStatus.NOT_APPLICABLE;
            return (
              <article key={category.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{category.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{category.mandatory ? "Mandatory" : "Optional"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    complete ? "bg-emerald-50 text-emerald-800" : status === ClearanceStatus.REJECTED
                      ? "bg-rose-50 text-rose-800"
                      : "bg-amber-50 text-amber-900"
                  }`}>
                    {statusLabel(status)}
                  </span>
                </div>
                {(item?.pendingRequirements || item?.remarks) && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    {item.pendingRequirements && (
                      <p className="text-slate-700"><span className="font-medium">Pending requirements:</span> {item.pendingRequirements}</p>
                    )}
                    {item.remarks && <p className="text-slate-600"><span className="font-medium">Remarks:</span> {item.remarks}</p>}
                  </div>
                )}
                {item?.updatedAt && (
                  <p className="mt-3 text-xs text-slate-400">
                    Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(item.updatedAt)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-5 text-sm text-slate-500">Clearance records are read-only for students. Contact the placement office to report an issue.</p>
    </StudentShell>
  );
}
