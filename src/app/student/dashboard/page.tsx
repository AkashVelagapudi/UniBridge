import Link from "next/link";
import {
  ApplicationStage,
  DriveStatus,
  EligibilityStatus,
  RegistrationStatus,
} from "@prisma/client";

import { StudentShell } from "@/components/student-shell";
import { prisma } from "@/lib/prisma";
import { getStudentPageContext } from "@/lib/services/student-page";
import { parseStringList } from "@/lib/services/json";

const progressStages = [
  ApplicationStage.REGISTERED,
  ApplicationStage.ELIGIBILITY_VERIFIED,
  ApplicationStage.SHORTLISTED,
  ApplicationStage.ASSESSMENT_COMPLETED,
  ApplicationStage.INTERVIEW_IN_PROGRESS,
] as const;

const terminalStages = new Set<ApplicationStage>([
  ApplicationStage.SELECTED,
  ApplicationStage.OFFER_RECEIVED,
  ApplicationStage.JOINED,
  ApplicationStage.REJECTED,
  ApplicationStage.WITHDRAWN,
]);

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function stagePosition(stage: ApplicationStage) {
  const index = progressStages.indexOf(stage as (typeof progressStages)[number]);
  return index >= 0 ? index : progressStages.length;
}

function outcomeLabel(stage: ApplicationStage) {
  if (terminalStages.has(stage)) return statusLabel(stage);
  return "In progress";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      {statusLabel(value)}
    </span>
  );
}

function StageProgress({
  stage,
  resultPublished,
}: {
  stage: ApplicationStage;
  resultPublished: boolean;
}) {
  const currentPosition = resultPublished ? stagePosition(stage) : 0;
  const progressPercent = (currentPosition / progressStages.length) * 100;
  const isTerminal = resultPublished && terminalStages.has(stage);
  const accessibleStage = resultPublished ? statusLabel(stage) : "Application received";

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">
          {resultPublished ? `Current stage: ${accessibleStage}` : "Application received"}
        </span>
        <span className={`font-semibold ${isTerminal ? "text-indigo-700" : "text-slate-500"}`}>
          {resultPublished ? outcomeLabel(stage) : "Result pending"}
        </span>
      </div>
      <div
        className="relative mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`Application progress: ${accessibleStage}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {progressStages.map((progressStage, index) => {
          const complete = currentPosition > index;
          const current = currentPosition === index;
          return (
            <li
              key={progressStage}
              className={`text-[10px] leading-4 sm:text-xs ${
                current ? "font-semibold text-indigo-800" : complete ? "text-slate-700" : "text-slate-400"
              }`}
            >
              <span
                className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                  current ? "bg-indigo-600" : complete ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-hidden="true"
              />
              {statusLabel(progressStage)}
            </li>
          );
        })}
        <li className={`text-[10px] leading-4 sm:text-xs ${
          currentPosition === progressStages.length
            ? isTerminal && stage !== ApplicationStage.JOINED
              ? "font-semibold text-rose-700"
              : "font-semibold text-indigo-800"
            : "text-slate-400"
        }`}>
          <span
            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${
              currentPosition === progressStages.length
                ? isTerminal && stage !== ApplicationStage.JOINED
                  ? "bg-rose-500"
                  : "bg-indigo-600"
                : "bg-slate-300"
            }`}
            aria-hidden="true"
          />
          {resultPublished && currentPosition === progressStages.length
            ? outcomeLabel(stage)
            : "Final outcome"}
        </li>
      </ol>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </section>
  );
}

export default async function StudentDashboardPage() {
  const student = await getStudentPageContext();
  const [applications, openDrives] = await Promise.all([
    prisma.application.findMany({
      where: { studentId: student.id },
      orderBy: { updatedAt: "desc" },
      include: {
        drive: {
          select: {
            id: true,
            company: true,
            role: true,
            location: true,
            status: true,
          },
        },
        offers: {
          where: { published: true },
          orderBy: { offeredAt: "desc" },
          select: { id: true, packageLpa: true, offeredAt: true },
        },
      },
    }),
    prisma.drive.findMany({
      where: {
        status: DriveStatus.OPEN,
        registrationDeadline: { gte: new Date() },
      },
      orderBy: { registrationDeadline: "asc" },
      select: {
        id: true,
        company: true,
        role: true,
        eligibleDepartmentIds: true,
        eligibleBatches: true,
        registrationDeadline: true,
        location: true,
        packageLpa: true,
      },
    }),
  ]);

  const appliedDriveIds = new Set(applications.map(({ driveId }) => driveId));
  const eligibleDrives = openDrives.filter((drive) => {
    const departmentIds = parseStringList(drive.eligibleDepartmentIds);
    const batches = parseStringList(drive.eligibleBatches);
    return (
      student.registrationStatus === RegistrationStatus.REGISTERED &&
      student.eligibilityStatus === EligibilityStatus.ELIGIBLE &&
      !appliedDriveIds.has(drive.id) &&
      (!departmentIds.length || departmentIds.includes(student.departmentId)) &&
      (!batches.length || batches.includes(student.batch))
    );
  });

  return (
    <StudentShell>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-700">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Welcome, {student.name}
          </h1>
          <p className="mt-2 text-slate-600">
            Your placement activity and eligible opportunities in one place.
          </p>
        </div>
        <Link
          href="/student/drives"
          className="inline-flex w-fit items-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800"
        >
          Explore all drives
        </Link>
      </div>

      <section
        aria-labelledby="profile-heading"
        className="mt-7 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="profile-heading" className="text-lg font-semibold text-slate-900">
              Student profile
            </h2>
            <p className="mt-1 text-sm text-slate-500">Your profile is maintained by the placement office.</p>
            <dl className="mt-5 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-slate-500">Roll number</dt>
                <dd className="mt-1 font-medium text-slate-900">{student.rollNo}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-1 break-all font-medium text-slate-900">{student.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Department</dt>
                <dd className="mt-1 font-medium text-slate-900">{student.department.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Program</dt>
                <dd className="mt-1 font-medium text-slate-900">{student.program}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Year / section</dt>
                <dd className="mt-1 font-medium text-slate-900">{student.year} / {student.section}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Batch</dt>
                <dd className="mt-1 font-medium text-slate-900">{student.batch}</dd>
              </div>
            </dl>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-64 sm:justify-end">
            <div className="w-full sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Registration</p>
              <div className="mt-2"><StatusBadge value={student.registrationStatus} /></div>
            </div>
            <div className="w-full sm:mt-3 sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Placement eligibility</p>
              <div className="mt-2"><StatusBadge value={student.eligibilityStatus} /></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Metric
          label="Applications"
          value={applications.length}
          detail="Drives you have registered for"
        />
        <Metric
          label="Eligible open drives"
          value={eligibleDrives.length}
          detail="Available to your registration, department, and batch"
        />
      </div>

      <section
        aria-labelledby="applications-heading"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="applications-heading" className="text-lg font-semibold text-slate-900">
              Your registered drives
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Application outcomes appear only after the placement office publishes them.
            </p>
          </div>
          <Link
            href="/student/applications"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            View applications
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <h3 className="font-semibold text-slate-900">No registered drives yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              Eligible open opportunities will appear below when available.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {applications.map((application) => {
              const visibleStage = application.resultPublished
                ? application.stage
                : ApplicationStage.REGISTERED;
              const visibleOffers = application.resultPublished ? application.offers : [];

              return (
                <li
                  key={application.id}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-semibold text-indigo-700">{application.drive.company}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{application.drive.role}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {application.drive.location || "Location not specified"}
                        {application.drive.status !== DriveStatus.OPEN && (
                          <> · Drive {statusLabel(application.drive.status.toLowerCase())}</>
                        )}
                      </p>
                    </div>
                    <StatusBadge value={application.resultPublished ? visibleStage : "RESULT_PENDING"} />
                  </div>

                  <StageProgress
                    stage={visibleStage}
                    resultPublished={application.resultPublished}
                  />

                  {visibleOffers.length > 0 && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <h4 className="text-sm font-semibold text-slate-900">Published offer details</h4>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                        {visibleOffers.map((offer) => (
                          <li key={offer.id} className="rounded-lg bg-emerald-50 p-4">
                            <p className="text-sm font-medium text-emerald-900">{application.drive.company}</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-950">
                              {offer.packageLpa} <span className="text-sm font-medium">LPA</span>
                            </p>
                            <p className="mt-1 text-xs text-emerald-800">
                              Offered {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(offer.offeredAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="eligible-drives-heading"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="eligible-drives-heading" className="text-lg font-semibold text-slate-900">
              Open drives you’re eligible for
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Matched using your registered status, eligibility, department, and batch.
            </p>
          </div>
          <Link href="/student/drives" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            Browse drives
          </Link>
        </div>

        {eligibleDrives.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <h3 className="font-semibold text-slate-900">No matching open drives</h3>
            <p className="mt-2 text-sm text-slate-600">
              {student.registrationStatus !== RegistrationStatus.REGISTERED ||
              student.eligibilityStatus !== EligibilityStatus.ELIGIBLE
                ? "Your profile must be marked registered and eligible before you can apply."
                : "Check back later for new opportunities matching your department and batch."}
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {eligibleDrives.map((drive) => (
              <li key={drive.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-indigo-700">{drive.company}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{drive.role}</h3>
                  </div>
                  {drive.packageLpa !== null && (
                    <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {drive.packageLpa} LPA
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {drive.location || "Location not specified"} · Deadline{" "}
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(drive.registrationDeadline)}
                </p>
                <Link
                  href="/student/drives"
                  className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  View drive and apply
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StudentShell>
  );
}
