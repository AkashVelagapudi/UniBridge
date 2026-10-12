import { ApplicationStage, DriveStatus } from "@prisma/client";

import { StudentShell } from "@/components/student-shell";
import { prisma } from "@/lib/prisma";
import { getStudentPageContext } from "@/lib/services/student-page";

export default async function StudentOffersPage() {
  const student = await getStudentPageContext();
  const offers = await prisma.offer.findMany({
    where: {
      published: true,
      application: {
        studentId: student.id,
        resultPublished: true,
        stage: { notIn: [ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] },
        drive: { status: { not: DriveStatus.CANCELLED } },
      },
    },
    orderBy: { offeredAt: "desc" },
    select: {
      id: true,
      packageLpa: true,
      offeredAt: true,
      application: {
        select: { drive: { select: { company: true, role: true, location: true } } },
      },
    },
  });

  return (
    <StudentShell>
      <div>
        <p className="text-sm font-semibold text-indigo-700">Your outcomes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Offers</h1>
        <p className="mt-2 text-slate-600">Only offers published by the placement office are shown here.</p>
      </div>
      {offers.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">No published offers</h2>
          <p className="mt-2 text-sm text-slate-600">Published offers will appear here when available.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-emerald-200 bg-white p-6">
              <p className="text-sm font-medium text-emerald-800">Offer published</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{offer.application.drive.company}</h2>
              <p className="mt-1 text-slate-600">{offer.application.drive.role}</p>
              <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{offer.packageLpa} <span className="text-base font-medium text-slate-500">LPA</span></p>
              <p className="mt-3 text-sm text-slate-500">
                {offer.application.drive.location || "Location not specified"} · Offered{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(offer.offeredAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
