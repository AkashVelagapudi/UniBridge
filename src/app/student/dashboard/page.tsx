import Link from "next/link";
import { ApplicationStage, DriveStatus } from "@prisma/client";

import { StudentShell } from "@/components/student-shell";
import { prisma } from "@/lib/prisma";
import { getOverallStatus } from "@/lib/services/noDues";
import { getStudentPageContext } from "@/lib/services/student-page";
import { parseStringList } from "@/lib/services/json";

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
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
  const [applications, offerCount, clearance, openDrives, recentApplications] = await Promise.all([
    prisma.application.count({ where: { studentId: student.id } }),
    prisma.offer.count({
      where: {
        published: true,
        application: {
          studentId: student.id,
          resultPublished: true,
          stage: { notIn: [ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] },
          drive: { status: { not: DriveStatus.CANCELLED } },
        },
      },
    }),
    getOverallStatus(student.id),
    prisma.drive.findMany({
      where: { status: DriveStatus.OPEN, registrationDeadline: { gte: new Date() } },
      select: { id: true, eligibleDepartmentIds: true, eligibleBatches: true },
    }),
    prisma.application.findMany({
      where: { studentId: student.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        stage: true,
        resultPublished: true,
        drive: { select: { company: true, role: true } },
      },
    }),
  ]);

  const eligibleDriveCount = openDrives.filter((drive) => {
    const departments = parseStringList(drive.eligibleDepartmentIds);
    const batches = parseStringList(drive.eligibleBatches);
    return (
      (!departments.length || departments.includes(student.departmentId)) &&
      (!batches.length || batches.includes(student.batch))
    );
  }).length;

  return (
    <StudentShell>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-700">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Hello, {student.name}</h1>
          <p className="mt-2 text-slate-600">{student.program} · {student.batch} · {student.rollNo}</p>
        </div>
        <Link
          href="/student/drives"
          className="inline-flex w-fit items-center rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          Explore placement drives
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open opportunities" value={eligibleDriveCount} detail="Matching your department and batch" />
        <Metric label="Applications" value={applications} detail="Placement drives you have applied to" />
        <Metric label="Published offers" value={offerCount} detail="Offers visible to you" />
        <Metric
          label="Overall no-dues"
          value={clearance.status === "CLEARED" ? "Cleared" : "Incomplete"}
          detail={`${clearance.clearedCount} of ${clearance.mandatoryCount} mandatory clearances complete`}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent applications</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest placement activity</p>
          </div>
          <Link href="/student/applications" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
            View all
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            You haven’t applied to a drive yet. Explore open opportunities to get started.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100">
            {recentApplications.map((application) => (
              <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-slate-900">{application.drive.company}</p>
                  <p className="mt-1 text-sm text-slate-500">{application.drive.role}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {application.resultPublished
                    ? application.stage.replaceAll("_", " ")
                    : "Application submitted"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </StudentShell>
  );
}
