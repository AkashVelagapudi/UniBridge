import { ApplicationStage } from "@prisma/client";

import { StudentShell } from "@/components/student-shell";
import { WithdrawButton } from "@/components/withdraw-button";
import { prisma } from "@/lib/prisma";
import { getStudentPageContext } from "@/lib/services/student-page";

const cannotWithdraw = new Set<ApplicationStage>([
  ApplicationStage.SELECTED,
  ApplicationStage.OFFER_RECEIVED,
  ApplicationStage.JOINED,
  ApplicationStage.REJECTED,
  ApplicationStage.WITHDRAWN,
]);

export default async function StudentApplicationsPage() {
  const student = await getStudentPageContext();
  const applications = await prisma.application.findMany({
    where: { studentId: student.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      stage: true,
      resultPublished: true,
      updatedAt: true,
      drive: {
        select: {
          company: true,
          role: true,
          status: true,
          registrationDeadline: true,
          location: true,
        },
      },
    },
  });

  return (
    <StudentShell>
      <div>
        <p className="text-sm font-semibold text-indigo-700">Your activity</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">My applications</h1>
        <p className="mt-2 text-slate-600">Review application stages and manage applications that are still active.</p>
      </div>
      {applications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">No applications yet</h2>
          <p className="mt-2 text-sm text-slate-600">Explore placement drives to find your next opportunity.</p>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {applications.map((application) => (
            <article key={application.id} className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-indigo-700">{application.drive.company}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{application.drive.role}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {application.drive.location || "Location not specified"} · Last updated{" "}
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(application.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
                  {application.resultPublished
                    ? application.stage.replaceAll("_", " ")
                    : "Application submitted"}
                </span>
                {!cannotWithdraw.has(application.stage) && <WithdrawButton applicationId={application.id} />}
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
