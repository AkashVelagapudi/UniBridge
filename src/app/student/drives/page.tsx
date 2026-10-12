import { DriveStatus, EligibilityStatus, RegistrationStatus } from "@prisma/client";

import { ApplyButton } from "@/components/apply-button";
import { StudentShell } from "@/components/student-shell";
import { prisma } from "@/lib/prisma";
import { getStudentPageContext } from "@/lib/services/student-page";
import { parseStringList } from "@/lib/services/json";

function formatDeadline(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function StudentDrivesPage() {
  const student = await getStudentPageContext();
  const drives = await prisma.drive.findMany({
    where: { status: DriveStatus.OPEN, registrationDeadline: { gte: new Date() } },
    orderBy: { registrationDeadline: "asc" },
    include: {
      applications: {
        where: { studentId: student.id },
        select: { id: true, stage: true, resultPublished: true },
        take: 1,
      },
    },
  });

  const driveRows = drives.map((drive) => {
    const departments = parseStringList(drive.eligibleDepartmentIds);
    const batches = parseStringList(drive.eligibleBatches);
    const eligible =
      student.registrationStatus === RegistrationStatus.REGISTERED &&
      student.eligibilityStatus === EligibilityStatus.ELIGIBLE &&
      (!departments.length || departments.includes(student.departmentId)) &&
      (!batches.length || batches.includes(student.batch));
    return { drive, eligible, application: drive.applications[0] ?? null };
  });

  return (
    <StudentShell>
      <div>
        <p className="text-sm font-semibold text-indigo-700">Opportunities</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Placement drives</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse currently open drives. Registration is available only to students marked registered and eligible.
        </p>
      </div>
      {driveRows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">No open placement drives</h2>
          <p className="mt-2 text-sm text-slate-600">Check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {driveRows.map(({ drive, eligible, application }) => (
            <article key={drive.id} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-700">{drive.company}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{drive.role}</h2>
                </div>
                {drive.packageLpa !== null && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                    {drive.packageLpa} LPA
                  </span>
                )}
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Location</dt>
                  <dd className="mt-1 font-medium text-slate-800">{drive.location || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Registration deadline</dt>
                  <dd className="mt-1 font-medium text-slate-800">{formatDeadline(drive.registrationDeadline)}</dd>
                </div>
                {drive.minCgpa !== null && (
                  <div>
                    <dt className="text-slate-500">Minimum CGPA</dt>
                    <dd className="mt-1 font-medium text-slate-800">{drive.minCgpa}</dd>
                  </div>
                )}
                {drive.maxBacklogs !== null && (
                  <div>
                    <dt className="text-slate-500">Maximum backlogs</dt>
                    <dd className="mt-1 font-medium text-slate-800">{drive.maxBacklogs}</dd>
                  </div>
                )}
              </dl>
              {drive.skills && (
                <p className="mt-4 text-sm text-slate-600"><span className="font-medium text-slate-800">Skills:</span> {drive.skills}</p>
              )}
              {parseStringList(drive.stages).length > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Stages:</span> {parseStringList(drive.stages).join(" · ")}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                {application ? (
                  <p className="text-sm font-medium text-emerald-800">
                    {application.resultPublished
                      ? `Applied · ${application.stage.replaceAll("_", " ")}`
                      : "Application submitted"}
                  </p>
                ) : !eligible ? (
                  <p className="text-sm text-slate-500">Not currently eligible to register</p>
                ) : (
                  <p className="text-sm text-slate-500">Open to eligible {drive.eligibleBatches ? "students" : "candidates"}</p>
                )}
                {application ? null : eligible ? (
                  <ApplyButton driveId={drive.id} />
                ) : (
                  <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500" aria-disabled="true">
                    Registration unavailable
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
